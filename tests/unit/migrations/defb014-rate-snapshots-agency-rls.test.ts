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
  return result.trim().split('\n').filter((line: string) => {
    const trimmed = line.trim();
    return trimmed !== '' && !trimmed.startsWith('SET') && !trimmed.startsWith('UPDATE');
  });
}

describe('TASK-B-221: DEF-B-014 zen_order_rate_snapshots AGENCY SELECT RLS', () => {
  let migration: string;

  const AGENCY_USER_ID = 'ae4e6325-7dbd-4736-9901-2c8622633ba2';
  const AGENCY_ORG_ID = 'dc0f1c0c-4b34-4c58-b213-f4eaacde524b';

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260727004025_defb014_rate_snapshots_agency_select_rls.sql',
      'utf-8'
    );
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

  describe('실제 DB 검증 (AGENCY 세션 시뮬레이션)', () => {
    it('AGENCY 세션에서 rate snapshot SELECT 성공', () => {
      const result = psql(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${AGENCY_USER_ID}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_order_rate_snapshots WHERE order_id IN (
          SELECT id FROM zen_orders WHERE agency_org_id = '${AGENCY_ORG_ID}'
        );
      `);
      expect(result).not.toContain('permission denied');
    });

    it('AGENCY 세션이 자신의 오더 rate snapshot을 실제로 조회 가능', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${AGENCY_USER_ID}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_order_rate_snapshots WHERE order_id IN (
          SELECT id FROM zen_orders WHERE agency_org_id = '${AGENCY_ORG_ID}'
        );
      `);
      const count = parseInt(lines[lines.length - 1], 10);
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('다른 org의 rate snapshot은 조회 불가', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${AGENCY_USER_ID}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_order_rate_snapshots WHERE order_id IN (
          SELECT id FROM zen_orders WHERE agency_org_id != '${AGENCY_ORG_ID}'
        );
      `);
      const count = parseInt(lines[lines.length - 1], 10);
      expect(count).toBe(0);
    });
  });
});
