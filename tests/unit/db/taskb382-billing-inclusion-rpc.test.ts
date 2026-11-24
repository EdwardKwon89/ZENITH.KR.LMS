import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'node:fs';

// TASK-B-382 (Issue #1463): M2 존재 확인 SECURITY DEFINER 함수 실DB 검증.
//   포함/미포함 boolean, 상태 무관(DRAFT 포함), 허용 역할 3종 / 비허용 역할·anon 예외,
//   반환 타입 boolean만(청구서 데이터 미노출), 롤백 SQL 유효성.
//   마이그레이션 20261124100000_task_b382_billing_inclusion_rpc.sql 적용된 fresh DB 기준.

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  return execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' },
  ).trim();
}

const P = '38200000-0000-4000-8000-0000000000';
const PLATFORM_ORG = `${P}01`;
const SHIPPER_ORG = `${P}02`;
const ADMIN = `${P}03`;
const MANAGER = `${P}04`;
const SUPER = `${P}05`;
const AGENCY_USER = `${P}06`;
const SHIPPER_USER = `${P}07`;
const ORDER_INCLUDED = `${P}10`;
const ORDER_PLAIN = `${P}11`;
const ORDER_DRAFT = `${P}12`;
const ORDER_ISSUED = `${P}13`;
const STMT_DRAFT = `${P}20`;
const STMT_ISSUED = `${P}21`;
const ORDER_IDS = [ORDER_INCLUDED, ORDER_PLAIN, ORDER_DRAFT, ORDER_ISSUED];
const STMT_IDS = [STMT_DRAFT, STMT_ISSUED];
const USER_IDS = [ADMIN, MANAGER, SUPER, AGENCY_USER, SHIPPER_USER];

function cleanup() {
  psql(`
    -- ISSUED 헤더는 상태 전이 트리거가 삭제를 거부하므로 fixture 정리 세션에서만 트리거를 끈다.
    SET session_replication_role = replica;
    DELETE FROM public.zen_billing_statement_items WHERE statement_id IN ('${STMT_IDS.join("','")}') OR order_id IN ('${ORDER_IDS.join("','")}');
    DELETE FROM public.zen_billing_statements WHERE id IN ('${STMT_IDS.join("','")}');
    DELETE FROM public.zen_orders WHERE id IN ('${ORDER_IDS.join("','")}');
    DELETE FROM public.zen_profiles WHERE id IN ('${USER_IDS.join("','")}');
    DELETE FROM auth.users WHERE id IN ('${USER_IDS.join("','")}');
    DELETE FROM public.zen_organizations WHERE id IN ('${PLATFORM_ORG}','${SHIPPER_ORG}');
    RESET session_replication_role;
  `);
}

function setupFixture() {
  try { cleanup(); } catch { /* 잔여 행은 아래 upsert로 정리 */ }
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${PLATFORM_ORG}', '382 Platform', 'CORPORATE', 'ACTIVE'),
      ('${SHIPPER_ORG}', '382 Shipper', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    INSERT INTO auth.users (id, email) VALUES
      ('${ADMIN}', '382-admin@test.kr'),
      ('${MANAGER}', '382-manager@test.kr'),
      ('${SUPER}', '382-super@test.kr'),
      ('${AGENCY_USER}', '382-agency@test.kr'),
      ('${SHIPPER_USER}', '382-shipper@test.kr')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${ADMIN}', '${PLATFORM_ORG}', '382-admin@test.kr', 'ADMIN', 'ACTIVE'),
      ('${MANAGER}', '${PLATFORM_ORG}', '382-manager@test.kr', 'MANAGER', 'ACTIVE'),
      ('${SUPER}', '${PLATFORM_ORG}', '382-super@test.kr', 'ZENITH_SUPER_ADMIN', 'ACTIVE'),
      ('${AGENCY_USER}', '${PLATFORM_ORG}', '382-agency@test.kr', 'AGENCY', 'ACTIVE'),
      ('${SHIPPER_USER}', '${SHIPPER_ORG}', '382-shipper@test.kr', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
    INSERT INTO public.zen_orders
      (id, order_no, shipper_id, transport_mode, status, recipient_name, recipient_phone, cargo_details, cost_settlement_status, cost_settled_at, cost_settled_by)
    VALUES
      ('${ORDER_INCLUDED}', 'ZEN-382-INC', '${SHIPPER_ORG}', 'UPS', 'DELIVERED', 'R', '010', '{}'::jsonb, 'SETTLED', now(), '${ADMIN}'),
      ('${ORDER_PLAIN}', 'ZEN-382-PLAIN', '${SHIPPER_ORG}', 'UPS', 'DELIVERED', 'R', '010', '{}'::jsonb, 'SETTLED', now(), '${ADMIN}'),
      ('${ORDER_DRAFT}', 'ZEN-382-DRAFT', '${SHIPPER_ORG}', 'UPS', 'DELIVERED', 'R', '010', '{}'::jsonb, 'SETTLED', now(), '${ADMIN}'),
      ('${ORDER_ISSUED}', 'ZEN-382-ISSUED', '${SHIPPER_ORG}', 'UPS', 'DELIVERED', 'R', '010', '{}'::jsonb, 'SETTLED', now(), '${ADMIN}')
    ON CONFLICT (id) DO UPDATE SET cost_settlement_status = EXCLUDED.cost_settlement_status,
      cost_settled_at = EXCLUDED.cost_settled_at, cost_settled_by = EXCLUDED.cost_settled_by;
    INSERT INTO public.zen_billing_statements
      (id, statement_no, issuer_org_id, billed_party_type, billed_org_id, tier, period_year, period_month, round_no, status, created_by)
    VALUES
      ('${STMT_DRAFT}', 'ST-202611-01-3821', '${PLATFORM_ORG}', 'ORG', '${SHIPPER_ORG}', 'ADMIN_TO_SHIPPER', 2026, 11, 1, 'DRAFT', '${ADMIN}'),
      ('${STMT_ISSUED}', 'ST-202611-01-3822', '${PLATFORM_ORG}', 'ORG', '${SHIPPER_ORG}', 'ADMIN_TO_SHIPPER', 2026, 11, 2, 'DRAFT', '${ADMIN}')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.zen_billing_statement_items (statement_id, order_id, tier, charge_weight_kg, line_total)
    VALUES
      ('${STMT_DRAFT}', '${ORDER_INCLUDED}', 'ADMIN_TO_SHIPPER', 10, 1000),
      ('${STMT_DRAFT}', '${ORDER_DRAFT}', 'ADMIN_TO_SHIPPER', 10, 1000),
      ('${STMT_ISSUED}', '${ORDER_ISSUED}', 'ADMIN_TO_SHIPPER', 10, 1000)
    ON CONFLICT (order_id, tier) DO NOTHING;
    -- 항목 가드는 DRAFT만 허용하므로 항목 삽입 후 DRAFT→ISSUED로 전이시킨다.
    UPDATE public.zen_billing_statements
       SET status = 'ISSUED', issued_at = now(), issued_by = '${ADMIN}'
     WHERE id = '${STMT_ISSUED}' AND status = 'DRAFT';
  `);
}

/** authenticated 롤 + JWT claims 시뮬레이션으로 RPC 호출 결과('t'/'f') 반환. */
function callRpcAs(userId: string, orderId: string): string {
  return psql(`
    SET ROLE authenticated;
    SET request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}';
    SELECT public.zen_billing_statement_order_included('${orderId}');
    RESET ROLE;
  `);
}

describe('TASK-B-382: zen_billing_statement_order_included 실DB', () => {
  beforeAll(() => setupFixture());
  afterAll(() => cleanup());

  it('허용 역할 3종: 포함 오더 true / 미포함 오더 false', () => {
    for (const userId of [ADMIN, MANAGER, SUPER]) {
      expect(callRpcAs(userId, ORDER_INCLUDED)).toBe('t');
      expect(callRpcAs(userId, ORDER_PLAIN)).toBe('f');
    }
  });

  it('상태 무관 포함 판정: DRAFT·ISSUED 헤더 항목도 true', () => {
    expect(callRpcAs(MANAGER, ORDER_DRAFT)).toBe('t');
    expect(callRpcAs(MANAGER, ORDER_ISSUED)).toBe('t');
  });

  it('비허용 역할(AGENCY·SHIPPER)은 false가 아니라 예외로 거부', () => {
    for (const userId of [AGENCY_USER, SHIPPER_USER]) {
      expect(() => callRpcAs(userId, ORDER_INCLUDED)).toThrow(
        /statement_inclusion_not_allowed/,
      );
    }
  });

  it('anon은 EXECUTE 권한이 없어 직접 호출할 수 없다', () => {
    const allowed = psql(`
      SELECT has_function_privilege('anon', 'public.zen_billing_statement_order_included(uuid)', 'EXECUTE')::text;
    `);
    expect(allowed).toBe('false');
  });

  it('반환은 boolean 하나뿐 — 청구서 행·컬럼을 반환하지 않음', () => {
    const signature = psql(`
      SELECT pg_get_function_result(p.oid) || '|' || pg_get_function_arguments(p.oid) || '|' || p.prosecdef::text
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'zen_billing_statement_order_included'
        AND pg_get_function_identity_arguments(p.oid) = 'p_order_id uuid';
    `);
    expect(signature).toBe('boolean|p_order_id uuid|true');
  });

  it('authenticated만 EXECUTE 보유(anon 미보유)', () => {
    const grants = psql(`
      SELECT has_function_privilege('authenticated', 'public.zen_billing_statement_order_included(uuid)', 'EXECUTE')::text
        || '|' || has_function_privilege('anon', 'public.zen_billing_statement_order_included(uuid)', 'EXECUTE')::text;
    `);
    expect(grants).toBe('true|false');
  });

  it('롤백 SQL(DROP FUNCTION)이 유효하고 트랜잭션 롤백으로 원복된다', () => {
    const migration = readFileSync(
      'supabase/migrations/20261124100000_task_b382_billing_inclusion_rpc.sql',
      'utf8',
    );
    expect(migration).toContain('DROP FUNCTION IF EXISTS public.zen_billing_statement_order_included(uuid);');
    psql(`
      BEGIN;
      DROP FUNCTION IF EXISTS public.zen_billing_statement_order_included(uuid);
      ROLLBACK;
    `);
    expect(callRpcAs(ADMIN, ORDER_PLAIN)).toBe('f');
  });
});
