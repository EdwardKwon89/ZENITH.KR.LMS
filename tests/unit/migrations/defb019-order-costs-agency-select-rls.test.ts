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
    return trimmed !== '' && !trimmed.startsWith('SET') && !trimmed.startsWith('UPDATE') && !trimmed.startsWith('INSERT') && !trimmed.startsWith('DELETE');
  });
}

describe('TASK-B-225: DEF-B-019 zen_order_costs AGENCY SELECT RLS', () => {
  let migration: string;

  const TEST_ORG_ID = randomUUID();
  const TEST_USER_ID = randomUUID();
  const TEST_ORDER_ID = randomUUID();
  const OTHER_ORG_ID = randomUUID();
  const OTHER_ORDER_ID = randomUUID();

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260727110000_defb019_order_costs_agency_select_rls.sql',
      'utf-8'
    );

    // 테스트 조직 생성
    psql(`INSERT INTO zen_organizations (id, name, type, created_at) VALUES ('${TEST_ORG_ID}', 'Test Agency ${TEST_ORG_ID.substring(0,8)}', 'AGENCY', NOW())`);
    psql(`INSERT INTO zen_organizations (id, name, type, created_at) VALUES ('${OTHER_ORG_ID}', 'Other Agency ${OTHER_ORG_ID.substring(0,8)}', 'AGENCY', NOW())`);

    // 테스트 사용자 프로필 생성 (AGENCY 역할)
    psql(`INSERT INTO zen_profiles (id, org_id, role, email, created_at) VALUES ('${TEST_USER_ID}', '${TEST_ORG_ID}', 'AGENCY', 'test-agency-${TEST_ORG_ID.substring(0,8)}@test.com', NOW())`);

    // 테스트 오더 생성 (AGENCY 소속)
    psql(`INSERT INTO zen_orders (id, order_no, agency_org_id, status, transport_mode, cargo_details, created_at) VALUES ('${TEST_ORDER_ID}', 'ORD-TEST-${TEST_ORDER_ID.substring(0,8)}', '${TEST_ORG_ID}', 'WAREHOUSED', 'UPS', '{}'::jsonb, NOW())`);
    psql(`INSERT INTO zen_order_costs (order_id, cost_type, unit_price, quantity, currency, is_revenue, created_at) VALUES ('${TEST_ORDER_ID}', 'SHIPPING', 100.00, 1, 'USD', true, NOW())`);

    // 다른 조직의 오더 (AGENCY가 접근하면 안 됨)
    psql(`INSERT INTO zen_orders (id, order_no, agency_org_id, status, transport_mode, cargo_details, created_at) VALUES ('${OTHER_ORDER_ID}', 'ORD-OTHER-${OTHER_ORDER_ID.substring(0,8)}', '${OTHER_ORG_ID}', 'WAREHOUSED', 'UPS', '{}'::jsonb, NOW())`);
    psql(`INSERT INTO zen_order_costs (order_id, cost_type, unit_price, quantity, currency, is_revenue, created_at) VALUES ('${OTHER_ORDER_ID}', 'SHIPPING', 200.00, 1, 'USD', true, NOW())`);
  });

  afterAll(() => {
    // 테스트 데이터 정리 (자식 테이블부터)
    psql(`DELETE FROM zen_order_costs WHERE order_id IN ('${TEST_ORDER_ID}', '${OTHER_ORDER_ID}')`);
    psql(`DELETE FROM zen_orders WHERE id IN ('${TEST_ORDER_ID}', '${OTHER_ORDER_ID}')`);
    psql(`DELETE FROM zen_profiles WHERE id = '${TEST_USER_ID}'`);
    psql(`DELETE FROM zen_organizations WHERE id IN ('${TEST_ORG_ID}', '${OTHER_ORG_ID}')`);
  });

  describe('마이그레이션 구조 검증', () => {
    it('Agency SELECT 정책명 포함', () => {
      expect(migration).toContain('Agency can view shipper order costs');
    });

    it('zen_order_costs FOR SELECT', () => {
      expect(migration).toContain('FOR SELECT');
    });

    it('DEF-B-019 패턴(agency_org_id) 사용', () => {
      expect(migration).toContain('zen_orders.agency_org_id');
      expect(migration).toContain('(SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())');
    });
  });

  describe('실제 DB 검증 (AGENCY 세션 시뮬레이션)', () => {
    it('AGENCY 세션에서 소속 오더 order_costs SELECT 성공', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${TEST_USER_ID}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_order_costs WHERE order_id IN (
          SELECT id FROM zen_orders WHERE agency_org_id = '${TEST_ORG_ID}'
        );
      `);
      const count = parseInt(lines[lines.length - 1], 10);
      expect(count).toBe(1);
    });

    it('AGENCY 세션이 비소속 오더의 order_costs는 조회 불가', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${TEST_USER_ID}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_order_costs WHERE order_id IN (
          SELECT id FROM zen_orders WHERE agency_org_id != '${TEST_ORG_ID}'
        );
      `);
      const count = parseInt(lines[lines.length - 1], 10);
      expect(count).toBe(0);
    });

    it('AGENCY 세션에서 소속 오더 order_costs 금액 확인', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${TEST_USER_ID}", "role": "authenticated"}';
        SELECT unit_price FROM zen_order_costs WHERE order_id = '${TEST_ORDER_ID}';
      `);
      const unitPrice = parseFloat(lines[lines.length - 1]);
      expect(unitPrice).toBe(100.00);
    });
  });
});
