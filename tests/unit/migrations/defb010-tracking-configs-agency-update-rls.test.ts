import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

function psql(sql: string): string {
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  );
  return result.trim().split('\n')[0];
}

function psqlMulti(sql: string): string[] {
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  );
  return result.trim().split('\n').filter(
    (l) => l !== '' && l !== 'SET' && !/^UPDATE \d+$/.test(l)
  );
}

describe('TASK-B-216: DEF-B-010 AGENCY UPDATE RLS 검증', () => {
  let migration: string;

  // 테스트 전용 fixture ID (self-contained — 커밋된 seed나 로컬 전용 실데이터에 의존하지 않음)
  const agencyOrgId = randomUUID();
  const agencyProfileId = randomUUID();
  const shipperOrgId = randomUUID();
  const ownOrderId = randomUUID();
  const otherAgencyOrgId = randomUUID();
  const otherOrderId = randomUUID();

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260726140000_defb010_tracking_configs_agency_update_rls.sql',
      'utf-8'
    );

    // fixture 생성: AGENCY 조직 2개(소속/비소속) + SHIPPER 조직 1개 + AGENCY 프로필 1개
    // + 소속 오더 1건 / 비소속 오더 1건 + 각각의 tracking_config
    psql(`INSERT INTO zen_organizations (id, name, type) VALUES ('${agencyOrgId}', 'TEST-DEFB010-Agency', 'AGENCY')`);
    psql(`INSERT INTO zen_organizations (id, name, type) VALUES ('${otherAgencyOrgId}', 'TEST-DEFB010-OtherAgency', 'AGENCY')`);
    psql(`INSERT INTO zen_organizations (id, name, type) VALUES ('${shipperOrgId}', 'TEST-DEFB010-Shipper', 'SHIPPER')`);
    psql(`INSERT INTO zen_profiles (id, org_id, email, role) VALUES ('${agencyProfileId}', '${agencyOrgId}', 'test-defb010-agency@example.com', 'AGENCY')`);
    psql(`INSERT INTO zen_orders (id, order_no, cargo_details, shipper_id, agency_org_id) VALUES ('${ownOrderId}', 'TEST-DEFB010-OWN', '{}'::jsonb, '${shipperOrgId}', '${agencyOrgId}')`);
    psql(`INSERT INTO zen_orders (id, order_no, cargo_details, shipper_id, agency_org_id) VALUES ('${otherOrderId}', 'TEST-DEFB010-OTHER', '{}'::jsonb, '${shipperOrgId}', '${otherAgencyOrgId}')`);
    psql(`INSERT INTO zen_tracking_configs (order_id, provider_type, tracking_no) VALUES ('${ownOrderId}', 'MANUAL', 'TEST-DEFB010-OWN-TRACK')`);
    psql(`INSERT INTO zen_tracking_configs (order_id, provider_type, tracking_no) VALUES ('${otherOrderId}', 'MANUAL', 'TEST-DEFB010-OTHER-TRACK')`);
  });

  afterAll(() => {
    psql(`DELETE FROM zen_tracking_configs WHERE order_id IN ('${ownOrderId}', '${otherOrderId}')`);
    psql(`DELETE FROM zen_orders WHERE id IN ('${ownOrderId}', '${otherOrderId}')`);
    psql(`DELETE FROM zen_profiles WHERE id = '${agencyProfileId}'`);
    psql(`DELETE FROM zen_organizations WHERE id IN ('${agencyOrgId}', '${otherAgencyOrgId}', '${shipperOrgId}')`);
  });

  describe('마이그레이션 구조 검증', () => {
    it('AGENCY UPDATE 정책 포함', () => {
      expect(migration).toContain('Agency can update tracking configs for shipper orders');
      expect(migration).toContain('zen_tracking_configs FOR UPDATE');
    });

    it('USING 절에 agency_org_id 매칭 조건 포함', () => {
      expect(migration).toContain('zen_orders.agency_org_id');
      expect(migration).toContain('(SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())');
    });

    it('WITH CHECK 절에 동일 조건 포함', () => {
      const withCheckIdx = migration.indexOf('WITH CHECK');
      expect(withCheckIdx).toBeGreaterThan(-1);
      const withCheckBlock = migration.substring(withCheckIdx);
      expect(withCheckBlock).toContain('zen_orders.agency_org_id');
      expect(withCheckBlock).toContain('auth.uid()');
    });

    it('DROP POLICY IF EXISTS로 충돌 방지', () => {
      expect(migration).toContain('DROP POLICY IF EXISTS');
    });

    it('authenticated 역할에 UPDATE GRANT 포함 (CI/신규 배포 환경 대응)', () => {
      expect(migration).toContain('GRANT UPDATE ON public.zen_tracking_configs TO authenticated');
    });
  });

  describe('실제 DB 검증 (AGENCY 세션 시뮬레이션, 자기완결형 fixture)', () => {
    it('authenticated 역할에 UPDATE GRANT 실제 존재', () => {
      const result = psql(`
        SELECT COUNT(*) FROM information_schema.role_table_grants
        WHERE table_name = 'zen_tracking_configs' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
      `);
      expect(parseInt(result, 10)).toBe(1);
    });

    it('AGENCY 세션 — 소속 오더 UPDATE 성공', () => {
      const rows = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${agencyProfileId}"}';
        UPDATE zen_tracking_configs SET tracking_no = 'TEST-AGENCY-UPDATE-OK' WHERE order_id = '${ownOrderId}' RETURNING order_id;
      `);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]).toContain(ownOrderId);
    });

    it('AGENCY 세션 — 비소속 오더 UPDATE 차단(0행)', () => {
      const rows = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${agencyProfileId}"}';
        UPDATE zen_tracking_configs SET tracking_no = 'TEST-SHOULD-FAIL' WHERE order_id = '${otherOrderId}' RETURNING order_id;
      `);
      expect(rows.length).toBe(0);
    });
  });
});
