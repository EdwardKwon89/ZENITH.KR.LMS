// TASK-B-372 (Issue #1356 / DEF-150 §1.1) — AGENCY 스코프: 소속 화주 + 자가화주, 타 화주 차단.
// 실제 로그인 세션(signInWithPassword)·실DB로 검증한다. 서버 액션 mock 금지.
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
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

import { searchDeliveredUpsOrders, recordUpsActualCharges } from '@/app/actions/finance/ups-actual-charges';

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  return execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' },
  ).trim();
}

const AGENCY_ORG = '37200000-0000-4000-8000-000000000001';
const ADMIN_ORG = '37200000-0000-4000-8000-000000000002';
const SHIPPER_LINKED = '37200000-0000-4000-8000-000000000003';
const SHIPPER_OTHER = '37200000-0000-4000-8000-000000000004';
const ORDER_LINKED = '37200000-0000-4000-8000-000000000010';
const ORDER_SELF = '37200000-0000-4000-8000-000000000011';
const ORDER_OTHER = '37200000-0000-4000-8000-000000000012';
const ORDER_OUT_OF_SCOPE = '37200000-0000-4000-8000-000000000013';
const EMAIL = 'b372-agency@test.kr';

const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
let agencySession: SupabaseClient;
let agencyProfile: { id: string; role: string; org_id: string; status: string };

async function deleteUser() {
  const { data } = await admin.auth.admin.listUsers();
  const u = data?.users?.find((x) => x.email === EMAIL);
  if (u) await admin.auth.admin.deleteUser(u.id);
}

function cleanup() {
  psql(`DELETE FROM public.zen_ups_actual_charges WHERE order_id IN ('${ORDER_LINKED}','${ORDER_SELF}','${ORDER_OTHER}','${ORDER_OUT_OF_SCOPE}');`);
  psql(`DELETE FROM public.zen_tracking_configs WHERE order_id IN ('${ORDER_LINKED}','${ORDER_SELF}','${ORDER_OTHER}','${ORDER_OUT_OF_SCOPE}');`);
  psql(`DELETE FROM public.zen_orders WHERE id IN ('${ORDER_LINKED}','${ORDER_SELF}','${ORDER_OTHER}','${ORDER_OUT_OF_SCOPE}');`);
  psql(`DELETE FROM public.zen_agency_shippers WHERE agency_org_id='${AGENCY_ORG}';`);
  psql(`DELETE FROM public.zen_profiles WHERE email='${EMAIL}';`);
  psql(`DELETE FROM public.zen_organizations WHERE id IN ('${AGENCY_ORG}','${ADMIN_ORG}','${SHIPPER_LINKED}','${SHIPPER_OTHER}');`);
}

beforeAll(async () => {
  if (!ANON_KEY || !SERVICE_KEY) throw new Error('Supabase env keys required');
  cleanup();
  await deleteUser();

  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${AGENCY_ORG}', 'B372 Agency', 'AGENCY', 'ACTIVE'),
      ('${ADMIN_ORG}', 'B372 Platform', 'PLATFORM', 'ACTIVE'),
      ('${SHIPPER_LINKED}', 'B372 Linked Shipper', 'SHIPPER', 'ACTIVE'),
      ('${SHIPPER_OTHER}', 'B372 Other Shipper', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.zen_agency_shippers (agency_org_id, shipper_org_id, shipper_type, is_active)
    VALUES ('${AGENCY_ORG}', '${SHIPPER_LINKED}', 'CORPORATE', true)
    ON CONFLICT (agency_org_id, shipper_org_id) DO UPDATE SET is_active = true;
    INSERT INTO public.zen_orders
      (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, recipient_country_code, ups_product_code, incoterms, cargo_details)
    VALUES
      ('${ORDER_LINKED}', 'ZEN-B372-LINKED', '${SHIPPER_LINKED}', '${AGENCY_ORG}', 'UPS', 'DELIVERED', 'R', '010', 'US', 'WW_EXPEDITED', 'DDP', '{}'::jsonb),
      ('${ORDER_SELF}',   'ZEN-B372-SELF',   '${AGENCY_ORG}',   '${AGENCY_ORG}', 'UPS', 'DELIVERED', 'R', '010', 'US', 'WW_EXPEDITED', 'DDP', '{}'::jsonb),
      ('${ORDER_OTHER}',  'ZEN-B372-OTHER',  '${SHIPPER_OTHER}', NULL,            'UPS', 'DELIVERED', 'R', '010', 'US', 'WW_EXPEDITED', 'DDP', '{}'::jsonb),
      ('${ORDER_OUT_OF_SCOPE}', 'ZEN-B372-OUT', '${SHIPPER_OTHER}', '${AGENCY_ORG}', 'UPS', 'DELIVERED', 'R', '010', 'US', 'WW_EXPEDITED', 'DDP', '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.zen_tracking_configs (order_id, tracking_no, provider_type)
    VALUES
      ('${ORDER_LINKED}', 'TRK372-LINKED', 'MANUAL'),
      ('${ORDER_SELF}',   'TRK372-SELF',   'MANUAL'),
      ('${ORDER_OTHER}',  'TRK372-OTHER',  'MANUAL'),
      ('${ORDER_OUT_OF_SCOPE}', 'TRK372-OUT', 'MANUAL')
    ON CONFLICT (order_id) DO NOTHING;
  `);

  const { data: created, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { role: 'AGENCY', org_id: AGENCY_ORG },
    user_metadata: { full_name: 'B372 Agency' },
  });
  if (error || !created.user) throw new Error(`createUser: ${error?.message}`);
  agencyProfile = { id: created.user.id, role: 'AGENCY', org_id: AGENCY_ORG, status: 'ACTIVE' };

  await admin.from('zen_profiles').upsert({
    id: created.user.id,
    org_id: AGENCY_ORG,
    email: EMAIL,
    role: 'AGENCY',
    status: 'ACTIVE',
    full_name: 'B372 Agency',
  }, { onConflict: 'id' });

  agencySession = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: signInError } = await agencySession.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (signInError) throw new Error(`signIn: ${signInError.message}`);
});

beforeEach(() => {
  mockValidateUserAction.mockResolvedValue({
    supabase: agencySession,
    user: { id: agencyProfile.id },
    profile: agencyProfile,
  });
});

afterAll(async () => {
  try { cleanup(); } catch { /* best-effort */ }
  try { await deleteUser(); } catch { /* best-effort */ }
});

describe('TASK-B-372 §1.1 — AGENCY 검색 스코프', () => {
  it('소속 화주·자가화주 오더는 order_no로 검색되고 타 화주 오더는 제외된다', async () => {
    const linked = await searchDeliveredUpsOrders('ZEN-B372-LINKED');
    expect(linked.map((o: any) => o.id)).toEqual([ORDER_LINKED]);

    const self = await searchDeliveredUpsOrders('ZEN-B372-SELF');
    expect(self.map((o: any) => o.id)).toEqual([ORDER_SELF]);

    const other = await searchDeliveredUpsOrders('ZEN-B372-OTHER');
    expect(other).toHaveLength(0);

    // RLS상 보이지만 소속 화주가 아닌 오더도 스코프 필터로 제외되어야 한다.
    const out = await searchDeliveredUpsOrders('ZEN-B372-OUT');
    expect(out).toHaveLength(0);
  });

  it('2단계(tracking_no) 경로에도 스코프가 적용된다 — 타 화주는 0건', async () => {
    const linked = await searchDeliveredUpsOrders('TRK372-LINKED');
    expect(linked.map((o: any) => o.id)).toEqual([ORDER_LINKED]);

    const self = await searchDeliveredUpsOrders('TRK372-SELF');
    expect(self.map((o: any) => o.id)).toEqual([ORDER_SELF]);

    const other = await searchDeliveredUpsOrders('TRK372-OTHER');
    expect(other).toHaveLength(0);

    const out = await searchDeliveredUpsOrders('TRK372-OUT');
    expect(out).toHaveLength(0);
  });
});

describe('TASK-B-372 §1.1 — AGENCY 실비등록 스코프', () => {
  it('읽을 수 있지만 소속 화주가 아닌 오더는 shipper_scope_denied로 거부된다', async () => {
    const res = await recordUpsActualCharges(ORDER_OUT_OF_SCOPE, [
      { chargeType: 'TEST', amount: 10, currency: 'USD' },
    ]);
    expect(res.success).toBe(false);
    expect(res.error).toContain('본인 소속 화주의 오더만');
  });

  it('소속 화주·자가화주 오더는 실비등록에 성공한다 (소유 검증 후 admin client)', async () => {
    for (const orderId of [ORDER_LINKED, ORDER_SELF]) {
      const res = await recordUpsActualCharges(orderId, [
        { chargeType: 'TEST', amount: 10, currency: 'USD' },
      ]);
      expect(res.success, JSON.stringify(res)).toBe(true);
      expect(Number(psql(`SELECT count(*) FROM public.zen_ups_actual_charges WHERE order_id='${orderId}' AND charge_type='TEST';`))).toBe(1);
    }
  });
});
