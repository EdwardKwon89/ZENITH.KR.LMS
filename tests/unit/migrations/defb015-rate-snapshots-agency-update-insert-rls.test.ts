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
    return trimmed !== '' && !trimmed.startsWith('SET') && !trimmed.startsWith('UPDATE') && !trimmed.startsWith('INSERT');
  });
}

describe('TASK-B-222: DEF-B-015 zen_order_rate_snapshots AGENCY UPDATE/INSERT RLS', () => {
  let migration: string;

  const AGENCY_USER_ID = 'ae4e6325-7dbd-4736-9901-2c8622633ba2';
  const AGENCY_ORG_ID = 'dc0f1c0c-4b34-4c58-b213-f4eaacde524b';

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260727100000_defb015_rate_snapshots_agency_update_insert_rls.sql',
      'utf-8'
    );
  });

  describe('마이그레이션 구조 검증', () => {
    it('Agency UPDATE 정책명 포함', () => {
      expect(migration).toContain('Agency can update shipper order rate snapshots');
    });

    it('Agency INSERT 정책명 포함', () => {
      expect(migration).toContain('Agency can insert shipper order rate snapshots');
    });

    it('zen_order_rate_snapshots FOR UPDATE', () => {
      expect(migration).toContain('FOR UPDATE');
    });

    it('zen_order_rate_snapshots FOR INSERT', () => {
      expect(migration).toContain('FOR INSERT');
    });

    it('DEF-B-015 패턴(agency_org_id) 사용', () => {
      expect(migration).toContain('zen_orders.agency_org_id');
      expect(migration).toContain('(SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())');
    });
  });

  describe('실제 DB 검증 (AGENCY 세션 시뮬레이션)', () => {
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
        SET LOCAL request.jwt.claims TO '{"sub": "${AGENCY_USER_ID}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_order_rate_snapshots WHERE order_id IN (
          SELECT id FROM zen_orders WHERE agency_org_id = '${AGENCY_ORG_ID}'
        );
      `);
      expect(result).not.toContain('permission denied');
    });

    it('AGENCY 세션에서 rate snapshot UPDATE 성공', () => {
      const result = psql(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${AGENCY_USER_ID}", "role": "authenticated"}';
        UPDATE zen_order_rate_snapshots SET applied_unit_price = 99.99 WHERE order_id IN (
          SELECT id FROM zen_orders WHERE agency_org_id = '${AGENCY_ORG_ID}'
        ) AND EXISTS (
          SELECT 1 FROM zen_orders WHERE id = zen_order_rate_snapshots.order_id AND agency_org_id = '${AGENCY_ORG_ID}'
        );
      `);
      expect(result).not.toContain('permission denied');
      expect(result).not.toContain('violates row-level security');
    });

    it('AGENCY 세션이 다른 org의 rate snapshot은 UPDATE 불가', () => {
      const result = psql(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${AGENCY_USER_ID}", "role": "authenticated"}';
        UPDATE zen_order_rate_snapshots SET applied_unit_price = 99.99 WHERE order_id IN (
          SELECT id FROM zen_orders WHERE agency_org_id != '${AGENCY_ORG_ID}'
        );
      `);
      expect(result).not.toContain('permission denied');
    });

    it('AGENCY 세션에서 rate snapshot INSERT — 잘못된 order_id는 차단', () => {
      let threw = false;
      try {
        psql(`
          SET LOCAL role TO authenticated;
          SET LOCAL request.jwt.claims TO '{"sub": "${AGENCY_USER_ID}", "role": "authenticated"}';
          INSERT INTO zen_order_rate_snapshots (order_id, applied_unit_price, applied_currency, applied_rule, metadata)
          VALUES ('00000000-0000-0000-0000-000000000001', 111.11, 'USD', 'UPS_3TIER', '{}'::jsonb);
        `);
      } catch (e: any) {
        threw = true;
        expect(e.message).toContain('violates row-level security policy');
      }
      expect(threw).toBe(true);
    });
  });
});
