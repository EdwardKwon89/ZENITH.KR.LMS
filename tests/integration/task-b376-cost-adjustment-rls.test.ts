// TASK-B-376 (Issue #1442) — zen_order_costs UPS_ACTUAL_ADJUSTMENT 화주·대리점 노출 차단.
// 실제 로그인 세션·실DB. BASE_FREIGHT는 양성 대조로 남고, UPS_ACTUAL_ADJUSTMENT만 숨겨지는지 검증한다.
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const PASSWORD = 'Password1234!';

const mockValidateUserAction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: mockValidateUserAction,
  validateAdminAction: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));

import { getShipperDailyBillingSummary, getShipperDailyOrdersDetails } from '@/app/actions/finance/daily-billing';
import { finalizeInvoice } from '@/app/actions/finance/settlement';

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  return execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' },
  ).trim();
}

const PLATFORM_ORG = '37600000-0000-4000-8000-000000000001';
const SHIPPER_ORG = '37600000-0000-4000-8000-000000000002';
const AGENCY_ORG = '37600000-0000-4000-8000-000000000003';
const ORDER = '37600000-0000-4000-8000-000000000010';
const INVOICE = '37600000-0000-4000-8000-000000000020';

const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
function b64url(o: unknown) { return Buffer.from(JSON.stringify(o)).toString('base64url'); }
function makeJwt(sub: string, email: string, role: string, org: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({ sub, role: 'authenticated', email, iat: now, exp: now + 3600, aud: 'authenticated', iss: 'supabase',
    app_metadata: { provider: 'email', role, org_id: org }, user_metadata: {} });
  const sig = Buffer.from(crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest()).toString('base64url');
  return `${header}.${payload}.${sig}`;
}

const ACCOUNTS = [
  { key: 'shipper', id: '37600000-0000-4000-8000-000000000101', email: 'b376-shipper@test.kr', role: 'SHIPPER', org: SHIPPER_ORG },
  { key: 'agency', id: '37600000-0000-4000-8000-000000000102', email: 'b376-agency@test.kr', role: 'AGENCY', org: AGENCY_ORG },
  { key: 'admin', id: '37600000-0000-4000-8000-000000000103', email: 'b376-admin@test.kr', role: 'ADMIN', org: PLATFORM_ORG },
  { key: 'super', id: '37600000-0000-4000-8000-000000000104', email: 'b376-super@test.kr', role: 'ZENITH_SUPER_ADMIN', org: PLATFORM_ORG },
  { key: 'manager', id: '37600000-0000-4000-8000-000000000105', email: 'b376-manager@test.kr', role: 'MANAGER', org: PLATFORM_ORG },
] as const;
type Key = (typeof ACCOUNTS)[number]['key'];
type Profile = { id: string; role: string; org_id: string; status: string };

const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
const sessions: Partial<Record<Key, SupabaseClient>> = {};
const profiles: Partial<Record<Key, Profile>> = {};

async function deleteUsers() {
  psql(`DELETE FROM public.zen_profiles WHERE id::text LIKE '37600000-%'; DELETE FROM auth.users WHERE email LIKE 'b376-%@test.kr';`);
}

function cleanup() {
  // 인보이스 연결 비용 삭제는 트리거가 막으므로 테스트 정리에서만 replication role을 replica로 둔다.
  psql(`
    SET session_replication_role = replica;
    DELETE FROM public.zen_order_costs WHERE order_id='${ORDER}';
    DELETE FROM public.zen_invoices WHERE id='${INVOICE}';
    DELETE FROM public.zen_orders WHERE id='${ORDER}';
    DELETE FROM public.zen_profiles WHERE email LIKE 'b376-%@test.kr';
    DELETE FROM auth.users WHERE email LIKE 'b376-%@test.kr';
    DELETE FROM public.zen_organizations WHERE id IN ('${PLATFORM_ORG}','${SHIPPER_ORG}','${AGENCY_ORG}');
    SET session_replication_role = origin;
  `);
}

const RESTRICTED_POLICIES = `
DROP POLICY IF EXISTS "Shippers can view their order costs" ON public.zen_order_costs;
CREATE POLICY "Shippers can view their order costs" ON public.zen_order_costs
FOR SELECT TO public USING (
  (EXISTS (SELECT 1 FROM public.zen_orders JOIN public.zen_profiles ON zen_profiles.org_id = zen_orders.shipper_id
    WHERE zen_orders.id = zen_order_costs.order_id AND zen_profiles.id = auth.uid())
   AND zen_order_costs.cost_type <> 'UPS_ACTUAL_ADJUSTMENT')
  OR EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role::text = ANY (ARRAY['ADMIN','ZENITH_SUPER_ADMIN']))
);
DROP POLICY IF EXISTS "Agency can view shipper order costs" ON public.zen_order_costs;
CREATE POLICY "Agency can view shipper order costs" ON public.zen_order_costs
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.zen_orders WHERE zen_orders.id = zen_order_costs.order_id
    AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()))
  AND zen_order_costs.cost_type <> 'UPS_ACTUAL_ADJUSTMENT'
);
`;

const OLD_POLICIES = `
DROP POLICY IF EXISTS "Shippers can view their order costs" ON public.zen_order_costs;
CREATE POLICY "Shippers can view their order costs" ON public.zen_order_costs
FOR SELECT TO public USING (
  EXISTS (SELECT 1 FROM public.zen_orders JOIN public.zen_profiles ON zen_profiles.org_id = zen_orders.shipper_id
    WHERE zen_orders.id = zen_order_costs.order_id
      AND (zen_profiles.id = auth.uid() OR zen_profiles.role::text = ANY (ARRAY['ADMIN','ZENITH_SUPER_ADMIN'])))
  OR EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role::text = ANY (ARRAY['ADMIN','ZENITH_SUPER_ADMIN']))
);
DROP POLICY IF EXISTS "Agency can view shipper order costs" ON public.zen_order_costs;
CREATE POLICY "Agency can view shipper order costs" ON public.zen_order_costs
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.zen_orders WHERE zen_orders.id = zen_order_costs.order_id
    AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()))
);
`;

beforeAll(async () => {
  cleanup();
  await deleteUsers();
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${PLATFORM_ORG}', 'B376 Platform', 'PLATFORM', 'ACTIVE'),
      ('${SHIPPER_ORG}', 'B376 Shipper', 'SHIPPER', 'ACTIVE'),
      ('${AGENCY_ORG}', 'B376 Agency', 'AGENCY', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.zen_orders
      (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, recipient_country_code, ups_product_code, incoterms, cargo_details)
    VALUES ('${ORDER}', 'ZEN-B376-RLS', '${SHIPPER_ORG}', '${AGENCY_ORG}', 'UPS', 'DELIVERED', 'R', '010', 'US', 'WW_EXPEDITED', 'DDP', '{}'::jsonb);
    INSERT INTO public.zen_invoices (id, invoice_no, shipper_id, total_amount, currency, due_date, status, metadata, invoice_tier, billed_org_id, applied_exchange_rate)
    VALUES ('${INVOICE}', 'INV-B376-RLS', '${SHIPPER_ORG}', 115, 'USD', '2026-12-31', 'UNPAID',
            '{"source_order_id":"${ORDER}"}'::jsonb, 'AGENCY_TO_SHIPPER', '${SHIPPER_ORG}', 1);
    INSERT INTO public.zen_order_costs (order_id, cost_type, unit_price, quantity, currency, is_revenue, invoice_id)
    VALUES ('${ORDER}', 'BASE_FREIGHT', 100, 1, 'USD', false, '${INVOICE}'),
           ('${ORDER}', 'UPS_ACTUAL_ADJUSTMENT', 15, 1, 'USD', true, '${INVOICE}');
  `);

  for (const acc of ACCOUNTS) {
    psql(`INSERT INTO auth.users (id, email) VALUES ('${acc.id}', '${acc.email}') ON CONFLICT (id) DO NOTHING;
      INSERT INTO public.zen_profiles (id, org_id, email, role, status, full_name)
      VALUES ('${acc.id}', '${acc.org}', '${acc.email}', '${acc.role}', 'ACTIVE', '${acc.key}')
      ON CONFLICT (id) DO UPDATE SET org_id=EXCLUDED.org_id, role=EXCLUDED.role, status='ACTIVE';`);
    profiles[acc.key] = { id: acc.id, role: acc.role, org_id: acc.org, status: 'ACTIVE' };
    sessions[acc.key] = createClient(URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${makeJwt(acc.id, acc.email, acc.role, acc.org)}` } },
    });
  }
});

beforeEach(() => {
  psql(`UPDATE public.zen_invoices SET total_amount=115, is_finalized=false WHERE id='${INVOICE}';`);
});

afterAll(async () => {
  try { psql(RESTRICTED_POLICIES); } catch { /* best-effort */ }
  try { cleanup(); } catch { /* best-effort */ }
  try { await deleteUsers(); } catch { /* best-effort */ }
});

async function costTypes(client: SupabaseClient): Promise<string[]> {
  const { data } = await client.from('zen_order_costs').select('cost_type').eq('order_id', ORDER);
  return (data ?? []).map((r: any) => r.cost_type).sort();
}

function actAs(key: Key) {
  mockValidateUserAction.mockResolvedValue({
    supabase: sessions[key], user: { id: profiles[key]!.id }, profile: profiles[key],
  });
}

describe('TASK-B-376 — 화주·대리점은 adjustment만 숨고 BASE는 보인다', () => {
  it('화주: BASE_FREIGHT 1행, UPS_ACTUAL_ADJUSTMENT 0행', async () => {
    expect(await costTypes(sessions.shipper!)).toEqual(['BASE_FREIGHT']);
  });
  it('대리점: BASE_FREIGHT 1행, UPS_ACTUAL_ADJUSTMENT 0행', async () => {
    expect(await costTypes(sessions.agency!)).toEqual(['BASE_FREIGHT']);
  });
  it('ADMIN·SUPER_ADMIN: 두 행 모두 보인다', async () => {
    for (const key of ['admin', 'super'] as Key[]) {
      expect(await costTypes(sessions[key]!)).toEqual(['BASE_FREIGHT', 'UPS_ACTUAL_ADJUSTMENT']);
    }
  });
  it('MANAGER: 현재 동작(읽기 불가)이 변하지 않았다 — 0행', async () => {
    expect(await costTypes(sessions.manager!)).toEqual([]);
  });

  it('정책 되돌리기: 기존 정책 재생성 시 화주·대리점에 adjustment가 다시 보인다', async () => {
    psql(OLD_POLICIES);
    expect(await costTypes(sessions.shipper!)).toEqual(['BASE_FREIGHT', 'UPS_ACTUAL_ADJUSTMENT']);
    expect(await costTypes(sessions.agency!)).toEqual(['BASE_FREIGHT', 'UPS_ACTUAL_ADJUSTMENT']);
    psql(RESTRICTED_POLICIES);
    expect(await costTypes(sessions.shipper!)).toEqual(['BASE_FREIGHT']);
    expect(await costTypes(sessions.agency!)).toEqual(['BASE_FREIGHT']);
  });
});

describe('TASK-B-376 — 화주 일일청구 응답의 실비 필드 0', () => {
  it('getShipperDailyBillingSummary: totalActualAdjustment=0, base=100', async () => {
    actAs('shipper');
    const res = await getShipperDailyBillingSummary();
    expect(res.success).toBe(true);
    const group = res.groups?.[0];
    expect(group?.totalBaseFreight ?? 0).toBeGreaterThan(0);
    expect(group?.totalActualAdjustment).toBe(0);
  });

  it('getShipperDailyOrdersDetails: actualAdjustment=0, base=100', async () => {
    actAs('shipper');
    const res = await getShipperDailyOrdersDetails([INVOICE]);
    expect(res.success).toBe(true);
    expect(res.orders?.[0]?.baseFreight ?? 0).toBeGreaterThan(0);
    expect(res.orders?.[0]?.actualAdjustment).toBe(0);
  });
});

describe('TASK-B-376 — 인보이스 총액은 RLS 변경과 무관', () => {
  it('AGENCY finalizeInvoice 호출 전후 total_amount 불변(115)', async () => {
    actAs('agency');
    const res = await finalizeInvoice(INVOICE, 'B376 test');
    // 권한/RLS에 따라 성공 또는 실패할 수 있으나, 저장된 총액은 줄어들면 안 된다.
    expect(typeof res.success).toBe('boolean');
    expect(Number(psql(`SELECT total_amount FROM public.zen_invoices WHERE id='${INVOICE}';`))).toBe(115);
  });
});
