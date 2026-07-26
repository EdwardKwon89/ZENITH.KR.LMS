import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

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

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260726140000_defb010_tracking_configs_agency_update_rls.sql',
      'utf-8'
    );
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
  });

  describe('실제 DB 검증 (AGENCY 세션 시뮬레이션)', () => {
    it('AGENCY 세션 — 소속 오더 UPDATE 성공', () => {
      const rows = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "ae4e6325-7dbd-4736-9901-2c8622633ba2"}';
        UPDATE zen_tracking_configs SET tracking_no = 'TEST-AGENCY-UPDATE' WHERE order_id = '2ae0abae-a365-4a5f-a18b-92736fe9340f' RETURNING order_id;
      `);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]).toContain('2ae0abae');
    });

    it('AGENCY 세션 — 비소속 오더 UPDATE 차단(0행)', () => {
      const rows = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "ae4e6325-7dbd-4736-9901-2c8622633ba2"}';
        UPDATE zen_tracking_configs SET tracking_no = 'TEST-SHOULD-FAIL' WHERE order_id = '3ff5b116-29cd-4d90-8dd0-0e99c36a2155' RETURNING order_id;
      `);
      expect(rows.length).toBe(0);
    });
  });
});
