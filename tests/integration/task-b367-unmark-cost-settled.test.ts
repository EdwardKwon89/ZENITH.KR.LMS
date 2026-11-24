// TASK-B-367 (Issue #1377) + TASK-B-382 (Issue #1463): unmarkOrderCostSettled — 실제 로컬 DB fixture 검증.
//   M2 포함 확인 RPC(세션 클라이언트)로 포함 오더 거부 / DRAFT 헤더 삭제(CASCADE)로 해제된 오더 성공 / tier 무관 차단.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const PASSWORD = 'B367Unmark!2026';

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  return execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' },
  ).trim();
}

const P = '36710000-0000-4000-8000-0000000000';
const ADMIN_USER = `${P}01`;
const ADMIN_ORG = `${P}02`;
const SHIPPER_ORG = `${P}03`;
const AGENCY_ORG = `${P}04`;
const ORDER_INC = `${P}10`;       // 청구서 포함(ADMIN_TO_SHIPPER)
const ORDER_TIER2 = `${P}11`;     // 청구서 포함(ADMIN_TO_AGENCY) — tier 무관 차단 확인
const ORDER_PLAIN = `${P}12`;     // SETTLED, 청구서 없음 → 성공
const ORDER_RELEASED = `${P}13`;  // 헤더 삭제로 CASCADE 해제 → 성공
const ORDER_NOT_SETTLED = `${P}14`;
const STMT_1 = `${P}20`;
const STMT_2 = `${P}21`;
const STMT_REL = `${P}22`;

const ORDER_IDS = [ORDER_INC, ORDER_TIER2, ORDER_PLAIN, ORDER_RELEASED, ORDER_NOT_SETTLED];
const STMT_IDS = [STMT_1, STMT_2, STMT_REL];

const mockValidateUserAction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidateUserAction }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));

function cleanup() {
  psql(`DELETE FROM public.zen_billing_statement_items WHERE statement_id IN ('${STMT_IDS.join("','")}') OR order_id IN ('${ORDER_IDS.join("','")}');`);
  psql(`DELETE FROM public.zen_billing_statements WHERE id IN ('${STMT_IDS.join("','")}');`);
  psql(`DELETE FROM public.zen_orders WHERE id IN ('${ORDER_IDS.join("','")}');`);
  psql(`DELETE FROM public.zen_profiles WHERE id='${ADMIN_USER}';`);
  psql(`DELETE FROM auth.users WHERE id='${ADMIN_USER}';`);
  psql(`DELETE FROM public.zen_organizations WHERE id IN ('${ADMIN_ORG}','${SHIPPER_ORG}','${AGENCY_ORG}');`);
}

async function setup() {
  try { cleanup(); } catch { /* leftover rows — 아래 unique order_no 로 정리 */ }
  psql(`DELETE FROM public.zen_orders WHERE order_no LIKE 'ZEN-367-%';`);
  // M2 RPC는 함수 내부에서 auth.uid() 역할을 검사하므로 service client가 아니라
  // 실제 로그인 세션(authenticated) 클라이언트로 앱 액션을 호출한다.
  const { error: createError } = await serviceClient.auth.admin.createUser({
    id: ADMIN_USER,
    email: '367-unmark-admin@test.kr',
    password: PASSWORD,
    email_confirm: true,
  });
  if (createError) throw new Error(`createUser: ${createError.message}`);
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${ADMIN_ORG}', '367 Admin Org', 'CORPORATE', 'ACTIVE'),
      ('${SHIPPER_ORG}', '367 Shipper Org', 'SHIPPER', 'ACTIVE'),
      ('${AGENCY_ORG}', '367 Agency Org', 'AGENCY', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${ADMIN_USER}', '${ADMIN_ORG}', '367-unmark-admin@test.kr', 'ADMIN', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
    INSERT INTO public.zen_orders (id, order_no, shipper_id, transport_mode, status, recipient_name, recipient_phone, cargo_details, cost_settlement_status, cost_settled_at, cost_settled_by) VALUES
      ('${ORDER_INC}',        'ZEN-367-INC',        '${SHIPPER_ORG}', 'UPS', 'RETURNED',   'R', '010', '{}'::jsonb, 'SETTLED', now(), '${ADMIN_USER}'),
      ('${ORDER_TIER2}',      'ZEN-367-TIER2',      '${SHIPPER_ORG}', 'UPS', 'CLAIMED',    'R', '010', '{}'::jsonb, 'SETTLED', now(), '${ADMIN_USER}'),
      ('${ORDER_PLAIN}',      'ZEN-367-PLAIN',      '${SHIPPER_ORG}', 'UPS', 'DELIVERED',  'R', '010', '{}'::jsonb, 'SETTLED', now(), '${ADMIN_USER}'),
      ('${ORDER_RELEASED}',   'ZEN-367-RELEASED',   '${SHIPPER_ORG}', 'UPS', 'DELIVERED',  'R', '010', '{}'::jsonb, 'SETTLED', now(), '${ADMIN_USER}'),
      ('${ORDER_NOT_SETTLED}','ZEN-367-NOTSETTLED', '${SHIPPER_ORG}', 'UPS', 'DELIVERED',  'R', '010', '{}'::jsonb, 'NOT_SETTLED', NULL, NULL)
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, cost_settlement_status = EXCLUDED.cost_settlement_status,
      cost_settled_at = EXCLUDED.cost_settled_at, cost_settled_by = EXCLUDED.cost_settled_by;
    -- 헤더: create_billing_statement 대신 DRAFT 직접 INSERT (#1397 규칙 준수 — 발행자 유형↔tier 정합)
    INSERT INTO public.zen_billing_statements
      (id, statement_no, issuer_org_id, billed_party_type, billed_org_id, tier, period_year, period_month, round_no, created_by)
    VALUES
      ('${STMT_1}', 'ST-202611-01-3671', '${ADMIN_ORG}', 'ORG', '${SHIPPER_ORG}', 'ADMIN_TO_SHIPPER', 2026, 11, 1, '${ADMIN_USER}'),
      ('${STMT_2}', 'ST-202611-01-3672', '${ADMIN_ORG}', 'ORG', '${AGENCY_ORG}',   'ADMIN_TO_AGENCY',  2026, 11, 2, '${ADMIN_USER}'),
      ('${STMT_REL}','ST-202611-01-3673', '${ADMIN_ORG}', 'ORG', '${SHIPPER_ORG}', 'ADMIN_TO_SHIPPER', 2026, 11, 3, '${ADMIN_USER}')
    ON CONFLICT (id) DO NOTHING;
    -- 항목: SETTLED 오더만 허용(#1397 트리거), 헤더 tier와 일치
    INSERT INTO public.zen_billing_statement_items (statement_id, order_id, tier, charge_weight_kg, line_total)
    VALUES
      ('${STMT_1}',   '${ORDER_INC}',      'ADMIN_TO_SHIPPER', 10, 1000),
      ('${STMT_2}',   '${ORDER_TIER2}',    'ADMIN_TO_AGENCY',  10, 1000),
      ('${STMT_REL}', '${ORDER_RELEASED}', 'ADMIN_TO_SHIPPER', 10, 1000)
    ON CONFLICT (order_id, tier) DO NOTHING;
  `);
}

import { unmarkOrderCostSettled } from '@/app/actions/finance/ups-actual-cost';

const serviceClient = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
const INCLUDES = '이 오더는 청구서에 포함되어 정산을 해제할 수 없습니다. 먼저 청구서를 취소하세요.';
const NOT_FOUND = '대상을 찾을 수 없습니다.';

function statusOf(orderId: string): string {
  return psql(`SELECT cost_settlement_status || '|' || (cost_settled_at IS NULL) || '|' || (cost_settled_by IS NULL) FROM public.zen_orders WHERE id='${orderId}';`);
}

beforeAll(async () => {
  if (!SERVICE_KEY || !ANON_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY missing');
  await setup();
  const sessionClient = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: signInError } = await sessionClient.auth.signInWithPassword({
    email: '367-unmark-admin@test.kr',
    password: PASSWORD,
  });
  if (signInError) throw new Error(`signIn: ${signInError.message}`);
  mockValidateUserAction.mockResolvedValue({
    supabase: sessionClient,
    user: { id: ADMIN_USER },
    profile: { id: ADMIN_USER, role: 'ADMIN', org_id: ADMIN_ORG },
  });
});

afterAll(() => {
  try { cleanup(); } catch { /* best-effort */ }
});

describe('unmarkOrderCostSettled — DoD (실DB)', () => {
  it('청구서에 포함된 SETTLED 오더 → statement_includes_order, DB 상태 유지', async () => {
    const res = await unmarkOrderCostSettled(ORDER_INC);
    expect(res.success).toBe(false);
    expect(res.error).toBe(INCLUDES);
    expect(statusOf(ORDER_INC)).toBe('SETTLED|false|false');
  });

  it('다른 tier(ADMIN_TO_AGENCY) 청구서에 포함된 오더도 거부 — order_id 기준 전수 확인', async () => {
    const res = await unmarkOrderCostSettled(ORDER_TIER2);
    expect(res.success).toBe(false);
    expect(res.error).toBe(INCLUDES);
    expect(statusOf(ORDER_TIER2)).toBe('SETTLED|false|false');
  });

  it('NOT_SETTLED 오더 → not_found', async () => {
    const res = await unmarkOrderCostSettled(ORDER_NOT_SETTLED);
    expect(res.success).toBe(false);
    expect(res.error).toBe(NOT_FOUND);
  });

  it('청구서 없는 SETTLED 오더 → 성공, 상태·정산일시·정산자 NULL', async () => {
    const res = await unmarkOrderCostSettled(ORDER_PLAIN);
    expect(res).toEqual({ success: true });
    expect(statusOf(ORDER_PLAIN)).toBe('NOT_SETTLED|true|true');
  });

  it('DRAFT 헤더 삭제 → 항목 CASCADE → 되돌리기 성공', async () => {
    const before = psql(`SELECT count(*) FROM public.zen_billing_statement_items WHERE order_id='${ORDER_RELEASED}';`);
    expect(before).toBe('1');

    psql(`DELETE FROM public.zen_billing_statements WHERE id='${STMT_REL}';`);
    const after = psql(`SELECT count(*) FROM public.zen_billing_statement_items WHERE order_id='${ORDER_RELEASED}';`);
    expect(after).toBe('0');

    const res = await unmarkOrderCostSettled(ORDER_RELEASED);
    expect(res).toEqual({ success: true });
    expect(statusOf(ORDER_RELEASED)).toBe('NOT_SETTLED|true|true');
  });
});
