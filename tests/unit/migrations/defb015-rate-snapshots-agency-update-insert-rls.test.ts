import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

function psqlErr(sql: string): string {
  try {
    psql(sql);
    return '';
  } catch (e: any) {
    return e.stderr || e.message || '';
  }
}

describe('TASK-B-222: DEF-B-015 zen_order_rate_snapshots AGENCY UPDATE/INSERT RLS', () => {
  const TEST_ORG_ID = randomUUID();
  const TEST_USER_ID = randomUUID();
  const TEST_ORDER_ID = randomUUID();
  const TEST_SNAPSHOT_ORDER_ID = randomUUID();
  const OTHER_ORG_ID = randomUUID();
  const OTHER_ORDER_ID = randomUUID();

  beforeAll(() => {
    // 테스트 조직 생성
    psql(`INSERT INTO zen_organizations (id, name, type, created_at) VALUES ('${TEST_ORG_ID}', 'Test Agency ${TEST_ORG_ID.substring(0,8)}', 'AGENCY', NOW())`);
    psql(`INSERT INTO zen_organizations (id, name, type, created_at) VALUES ('${OTHER_ORG_ID}', 'Other Agency ${OTHER_ORG_ID.substring(0,8)}', 'AGENCY', NOW())`);

    // 테스트 사용자 프로필 생성 (AGENCY 역할)
    psql(`INSERT INTO zen_profiles (id, org_id, role, email, created_at) VALUES ('${TEST_USER_ID}', '${TEST_ORG_ID}', 'AGENCY', 'test-agency-${TEST_ORG_ID.substring(0,8)}@test.com', NOW())`);

    // 테스트 오더 생성 (AGENCY 소속)
    psql(`INSERT INTO zen_orders (id, order_no, agency_org_id, status, transport_mode, cargo_details, created_at) VALUES ('${TEST_ORDER_ID}', 'ORD-TEST-${TEST_ORDER_ID.substring(0,8)}', '${TEST_ORG_ID}', 'WAREHOUSED', 'UPS', '{}'::jsonb, NOW())`);

    // AGENCY가 UPDATE할 스냅샷이 있는 오더
    psql(`INSERT INTO zen_orders (id, order_no, agency_org_id, status, transport_mode, cargo_details, created_at) VALUES ('${TEST_SNAPSHOT_ORDER_ID}', 'ORD-SNAP-${TEST_SNAPSHOT_ORDER_ID.substring(0,8)}', '${TEST_ORG_ID}', 'WAREHOUSED', 'UPS', '{}'::jsonb, NOW())`);
    psql(`INSERT INTO zen_order_rate_snapshots (order_id, applied_unit_price, applied_currency, applied_rule, metadata, snapshot_at) VALUES ('${TEST_SNAPSHOT_ORDER_ID}', 100.00, 'USD', 'UPS_3TIER', '{}'::jsonb, NOW())`);

    // 다른 조직의 오더 (AGENCY가 접근하면 안 됨)
    psql(`INSERT INTO zen_orders (id, order_no, agency_org_id, status, transport_mode, cargo_details, created_at) VALUES ('${OTHER_ORDER_ID}', 'ORD-OTHER-${OTHER_ORDER_ID.substring(0,8)}', '${OTHER_ORG_ID}', 'WAREHOUSED', 'UPS', '{}'::jsonb, NOW())`);
    psql(`INSERT INTO zen_order_rate_snapshots (order_id, applied_unit_price, applied_currency, applied_rule, metadata, snapshot_at) VALUES ('${OTHER_ORDER_ID}', 200.00, 'USD', 'UPS_3TIER', '{}'::jsonb, NOW())`);
  });

  afterAll(() => {
    // 테스트 데이터 정리 (자식 테이블부터)
    psql(`DELETE FROM zen_order_rate_snapshots WHERE order_id IN ('${TEST_ORDER_ID}', '${TEST_SNAPSHOT_ORDER_ID}', '${OTHER_ORDER_ID}')`);
    psql(`DELETE FROM zen_orders WHERE id IN ('${TEST_ORDER_ID}', '${TEST_SNAPSHOT_ORDER_ID}', '${OTHER_ORDER_ID}')`);
    psql(`DELETE FROM zen_profiles WHERE id = '${TEST_USER_ID}'`);
    psql(`DELETE FROM zen_organizations WHERE id IN ('${TEST_ORG_ID}', '${OTHER_ORG_ID}')`);
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

    it('AGENCY 세션에서 소속 오더 rate snapshot SELECT 성공', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${TEST_USER_ID}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_order_rate_snapshots WHERE order_id = '${TEST_SNAPSHOT_ORDER_ID}';
      `);
      const count = parseInt(lines[lines.length - 1], 10);
      expect(count).toBe(1);
    });

    it('AGENCY 세션에서 소속 오더 rate snapshot UPDATE 성공 (값 변경 확인)', () => {
      psql(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${TEST_USER_ID}", "role": "authenticated"}';
        UPDATE zen_order_rate_snapshots SET applied_unit_price = 999.99 WHERE order_id = '${TEST_SNAPSHOT_ORDER_ID}';
      `);
      const result = psql(`SELECT applied_unit_price FROM zen_order_rate_snapshots WHERE order_id = '${TEST_SNAPSHOT_ORDER_ID}'`);
      expect(parseFloat(result)).toBe(999.99);
    });

    it('AGENCY 세션이 비소속 오더의 rate snapshot은 UPDATE 불가 (0행 영향)', () => {
      const before = psql(`SELECT applied_unit_price FROM zen_order_rate_snapshots WHERE order_id = '${OTHER_ORDER_ID}'`);
      psql(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${TEST_USER_ID}", "role": "authenticated"}';
        UPDATE zen_order_rate_snapshots SET applied_unit_price = 999.99 WHERE order_id = '${OTHER_ORDER_ID}';
      `);
      const after = psql(`SELECT applied_unit_price FROM zen_order_rate_snapshots WHERE order_id = '${OTHER_ORDER_ID}'`);
      expect(parseFloat(before)).toBe(parseFloat(after));
    });

    it('AGENCY 세션에서 소속 오더에 대해 INSERT 성공', () => {
      psql(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${TEST_USER_ID}", "role": "authenticated"}';
        INSERT INTO zen_order_rate_snapshots (order_id, applied_unit_price, applied_currency, applied_rule, metadata, snapshot_at)
        VALUES ('${TEST_ORDER_ID}', 555.55, 'USD', 'UPS_3TIER', '{}'::jsonb, NOW());
      `);
      const result = psql(`SELECT applied_unit_price FROM zen_order_rate_snapshots WHERE order_id = '${TEST_ORDER_ID}'`);
      expect(parseFloat(result)).toBe(555.55);
    });

    it('AGENCY 세션이 비소속 오더에 대해 INSERT 불가', () => {
      const err = psqlErr(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${TEST_USER_ID}", "role": "authenticated"}';
        INSERT INTO zen_order_rate_snapshots (order_id, applied_unit_price, applied_currency, applied_rule, metadata, snapshot_at)
        VALUES ('${OTHER_ORDER_ID}', 777.77, 'USD', 'UPS_3TIER', '{}'::jsonb, NOW());
      `);
      expect(err).toContain('violates row-level security policy');
    });
  });
});
