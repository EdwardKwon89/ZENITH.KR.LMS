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
  return result.trim().split('\n').filter((line: string) => {
    const trimmed = line.trim();
    return trimmed !== '' && !trimmed.startsWith('SET') && !trimmed.startsWith('UPDATE');
  });
}

describe('TASK-B-221: DEF-B-014 zen_order_rate_snapshots AGENCY SELECT RLS', () => {
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
      'supabase/migrations/20260727004025_defb014_rate_snapshots_agency_select_rls.sql',
      'utf-8'
    );

    psql(`INSERT INTO zen_organizations (id, name, type) VALUES ('${agencyOrgId}', 'TEST-DEFB014-Agency', 'AGENCY')`);
    psql(`INSERT INTO zen_organizations (id, name, type) VALUES ('${otherAgencyOrgId}', 'TEST-DEFB014-OtherAgency', 'AGENCY')`);
    psql(`INSERT INTO zen_organizations (id, name, type) VALUES ('${shipperOrgId}', 'TEST-DEFB014-Shipper', 'SHIPPER')`);
    psql(`INSERT INTO zen_profiles (id, org_id, email, role) VALUES ('${agencyProfileId}', '${agencyOrgId}', 'test-defb014-agency@example.com', 'AGENCY')`);
    psql(`INSERT INTO zen_orders (id, order_no, cargo_details, shipper_id, agency_org_id) VALUES ('${ownOrderId}', 'TEST-DEFB014-OWN', '{}'::jsonb, '${shipperOrgId}', '${agencyOrgId}')`);
    psql(`INSERT INTO zen_orders (id, order_no, cargo_details, shipper_id, agency_org_id) VALUES ('${otherOrderId}', 'TEST-DEFB014-OTHER', '{}'::jsonb, '${shipperOrgId}', '${otherAgencyOrgId}')`);
    psql(`INSERT INTO zen_order_rate_snapshots (order_id, applied_unit_price, applied_currency, applied_rule) VALUES ('${ownOrderId}', 100000, 'KRW', 'UPS_3TIER')`);
    psql(`INSERT INTO zen_order_rate_snapshots (order_id, applied_unit_price, applied_currency, applied_rule) VALUES ('${otherOrderId}', 200000, 'KRW', 'UPS_3TIER')`);
  });

  afterAll(() => {
    psql(`DELETE FROM zen_order_rate_snapshots WHERE order_id IN ('${ownOrderId}', '${otherOrderId}')`);
    psql(`DELETE FROM zen_orders WHERE id IN ('${ownOrderId}', '${otherOrderId}')`);
    psql(`DELETE FROM zen_profiles WHERE id = '${agencyProfileId}'`);
    psql(`DELETE FROM zen_organizations WHERE id IN ('${agencyOrgId}', '${otherAgencyOrgId}', '${shipperOrgId}')`);
  });

  describe('마이그레이션 구조 검증', () => {
    it('Agency SELECT 정책명 포함', () => {
      expect(migration).toContain('Agency can view shipper order rate snapshots');
    });

    it('zen_order_rate_snapshots FOR SELECT', () => {
      expect(migration).toContain('FOR SELECT');
    });

    it('DEF-014 패턴(agency_org_id) 사용', () => {
      expect(migration).toContain('zen_orders.agency_org_id');
      expect(migration).toContain('(SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())');
    });
  });

  describe('실제 DB 검증 (AGENCY 세션 시뮬레이션, 자기완결형 fixture)', () => {
    it('authenticated 역할에 SELECT/INSERT/UPDATE GRANT 존재', () => {
      const result = psql(`
        SELECT COUNT(*) FROM information_schema.role_table_grants
        WHERE table_name = 'zen_order_rate_snapshots'
        AND grantee = 'authenticated'
        AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE')
      `);
      const count = parseInt(result, 10);
      expect(count).toBe(3);
    });

    it('AGENCY 세션에서 rate snapshot SELECT 성공', () => {
      const result = psql(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${agencyProfileId}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_order_rate_snapshots WHERE order_id = '${ownOrderId}';
      `);
      expect(result).not.toContain('permission denied');
    });

    it('AGENCY 세션이 자신의 오더 rate snapshot을 실제로 조회 가능', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${agencyProfileId}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_order_rate_snapshots WHERE order_id = '${ownOrderId}';
      `);
      const count = parseInt(lines[lines.length - 1], 10);
      expect(count).toBe(1);
    });

    it('다른 org의 rate snapshot은 조회 불가', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${agencyProfileId}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_order_rate_snapshots WHERE order_id = '${otherOrderId}';
      `);
      const count = parseInt(lines[lines.length - 1], 10);
      expect(count).toBe(0);
    });
  });
});
