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
const INV_ADMIN_TO_AGENCY = '37200000-0000-4000-8000-000000000030';
const INV_AGENCY_TO_SHIPPER = '37200000-0000-4000-8000-000000000031';
const INV_FINALIZED = '37200000-0000-4000-8000-000000000032';

const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
let agencySession: SupabaseClient;
let agencyProfile: { id: string; role: string; org_id: string; status: string };

async function deleteUser() {
  const { data } = await admin.auth.admin.listUsers();
  const u = data?.users?.find((x) => x.email === EMAIL);
  if (u) await admin.auth.admin.deleteUser(u.id);
}

function resetInvoiceFixtures() {
  // 마감 인보이스 잔여물이 zen_order_costs 변경 트리거/FK에 막히므로 테스트 정리에서만 트리거를 끈다.
  psql(`
    SET session_replication_role = replica;
    DELETE FROM public.zen_invoices WHERE invoice_no LIKE 'INV-B372-%';
    DELETE FROM public.zen_ups_actual_charges WHERE order_id IN ('${ORDER_LINKED}','${ORDER_SELF}','${ORDER_OTHER}','${ORDER_OUT_OF_SCOPE}');
    DELETE FROM public.zen_order_costs WHERE order_id IN ('${ORDER_LINKED}','${ORDER_SELF}','${ORDER_OTHER}','${ORDER_OUT_OF_SCOPE}');
    SET session_replication_role = origin;
  `);
}

function cleanup() {
  resetInvoiceFixtures();
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
  resetInvoiceFixtures();
  agencyProfile.status = 'ACTIVE';
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

  it('SUSPENDED AGENCY는 service_role 쓰기에 도달하지 못한다 (0행)', async () => {
    psql(`UPDATE public.zen_profiles SET status='SUSPENDED' WHERE email='${EMAIL}';`);
    agencyProfile.status = 'SUSPENDED';

    const res = await recordUpsActualCharges(ORDER_LINKED, [
      { chargeType: 'TEST', amount: 10, currency: 'USD' },
    ]);

    expect(res.success).toBe(false);
    expect(Number(psql(`SELECT count(*) FROM public.zen_ups_actual_charges WHERE order_id='${ORDER_LINKED}';`))).toBe(0);
    psql(`UPDATE public.zen_profiles SET status='ACTIVE' WHERE email='${EMAIL}';`);
  });

  it('마감 인보이스가 있으면 AGENCY는 쓰기 전에 거부하고 기존 실비 행을 보존한다', async () => {
    psql(`
      INSERT INTO public.zen_ups_actual_charges (order_id, charge_type, charge_amount, currency, entered_by)
      VALUES ('${ORDER_LINKED}', 'BEFORE', 5, 'USD', '${agencyProfile.id}');
      INSERT INTO public.zen_invoices (id, invoice_no, shipper_id, total_amount, currency, due_date, status, metadata, invoice_tier, billed_org_id)
      VALUES ('${INV_FINALIZED}', 'INV-B372-FIN', '${SHIPPER_LINKED}', 100, 'USD', '2026-12-31', 'UNPAID',
              '{"source_order_id":"${ORDER_LINKED}"}'::jsonb, 'ADMIN_TO_AGENCY', '${AGENCY_ORG}');
      UPDATE public.zen_invoices SET is_finalized=true, finalized_at=now() WHERE id='${INV_FINALIZED}';
    `);

    const res = await recordUpsActualCharges(ORDER_LINKED, [
      { chargeType: 'AFTER', amount: 10, currency: 'USD' },
    ]);

    expect(res.success).toBe(false);
    expect(res.error).toContain('마감');
    const row = psql(`SELECT count(*)::text||'|'||max(charge_type) FROM public.zen_ups_actual_charges WHERE order_id='${ORDER_LINKED}';`);
    expect(row).toBe('1|BEFORE');
  });

  it('미마감 인보이스: AGENCY_TO_SHIPPER만 갱신하고 ADMIN_TO_AGENCY는 건드리지 않는다', async () => {
    psql(`
      INSERT INTO public.zen_invoices (id, invoice_no, shipper_id, total_amount, currency, due_date, status, metadata, invoice_tier, billed_org_id)
      VALUES
        ('${INV_ADMIN_TO_AGENCY}', 'INV-B372-AA', '${AGENCY_ORG}', 110, 'USD', '2026-12-31', 'UNPAID',
         '{"source_order_id":"${ORDER_LINKED}","platform_breakdown":{"baseFreight":100,"fuelSurcharge":10,"surgeFee":0,"otherCharges":0}}'::jsonb,
         'ADMIN_TO_AGENCY', '${AGENCY_ORG}'),
        ('${INV_AGENCY_TO_SHIPPER}', 'INV-B372-AS', '${SHIPPER_LINKED}', 50, 'USD', '2026-12-31', 'UNPAID',
         '{"source_order_id":"${ORDER_LINKED}"}'::jsonb, 'AGENCY_TO_SHIPPER', '${SHIPPER_LINKED}');
      INSERT INTO public.zen_order_costs (order_id, cost_type, unit_price, quantity, currency, is_revenue)
      VALUES ('${ORDER_LINKED}', 'BASE_FREIGHT', 100, 1, 'USD', false);
      INSERT INTO public.zen_order_costs (order_id, cost_type, unit_price, quantity, currency, is_revenue, invoice_id)
      VALUES ('${ORDER_LINKED}', 'OTHER_CHARGE', 50, 1, 'USD', true, '${INV_AGENCY_TO_SHIPPER}');
    `);

    const res = await recordUpsActualCharges(ORDER_LINKED, [
      { chargeType: 'TEST', amount: 10, currency: 'USD' },
    ]);
    expect(res.success, JSON.stringify(res)).toBe(true);

    const adminToAgency = Number(psql(`SELECT total_amount FROM public.zen_invoices WHERE id='${INV_ADMIN_TO_AGENCY}';`));
    const agencyToShipper = Number(psql(`SELECT total_amount FROM public.zen_invoices WHERE id='${INV_AGENCY_TO_SHIPPER}';`));
    expect(adminToAgency).toBe(110);
    expect(agencyToShipper).toBe(60);
  });
});
