// TASK-B-375 (Issue #1356) — zen_ups_actual_charges 화주·대리점 SELECT RLS 제거 검증.
// 실제 로그인 세션·실DB. 정책 제거 전 SELECT 가능(되돌리기) → 제거 후 0건을 실측한다.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
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

import {
  getUpsActualCharges,
  getUpsChargeReconciliation,
  searchDeliveredUpsOrders,
  recordUpsActualCharges,
} from '@/app/actions/finance/ups-actual-charges';

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  return execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' },
  ).trim();
}

const PLATFORM_ORG = '37500000-0000-4000-8000-000000000001';
const SHIPPER_ORG = '37500000-0000-4000-8000-000000000002';
const AGENCY_ORG = '37500000-0000-4000-8000-000000000003';
const ORDER = '37500000-0000-4000-8000-000000000010';

const ACCOUNTS = [
  { key: 'super', email: 'b375-super@test.kr', role: 'ZENITH_SUPER_ADMIN', org: PLATFORM_ORG },
  { key: 'admin', email: 'b375-admin@test.kr', role: 'ADMIN', org: PLATFORM_ORG },
  { key: 'manager', email: 'b375-manager@test.kr', role: 'MANAGER', org: PLATFORM_ORG },
  { key: 'shipper', email: 'b375-shipper@test.kr', role: 'SHIPPER', org: SHIPPER_ORG },
  { key: 'agency', email: 'b375-agency@test.kr', role: 'AGENCY', org: AGENCY_ORG },
  { key: 'operator', email: 'b375-operator@test.kr', role: 'OPERATOR', org: PLATFORM_ORG },
] as const;

type Key = (typeof ACCOUNTS)[number]['key'];
type Profile = { id: string; role: string; org_id: string; status: string };

const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
const anon = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
const sessions: Partial<Record<Key, SupabaseClient>> = {};
const profiles: Partial<Record<Key, Profile>> = {};

async function deleteUsers() {
  const { data } = await admin.auth.admin.listUsers();
  const emails: string[] = ACCOUNTS.map((a) => a.email);
  for (const u of data?.users ?? []) {
    if (u.email && emails.includes(u.email)) await admin.auth.admin.deleteUser(u.id);
  }
}

function cleanup() {
  psql(`DELETE FROM public.zen_ups_actual_charges WHERE order_id='${ORDER}';`);
  psql(`DELETE FROM public.zen_order_costs WHERE order_id='${ORDER}';`);
  psql(`DELETE FROM public.zen_orders WHERE id='${ORDER}';`);
  psql(`DELETE FROM public.zen_profiles WHERE email LIKE 'b375-%@test.kr';`);
  psql(`DELETE FROM public.zen_organizations WHERE id IN ('${PLATFORM_ORG}','${SHIPPER_ORG}','${AGENCY_ORG}');`);
}

const REBUILD_POLICY = `
CREATE POLICY shipper_agency_select ON public.zen_ups_actual_charges
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_orders o
      JOIN public.zen_profiles p ON p.id = auth.uid()
      WHERE o.id = zen_ups_actual_charges.order_id
        AND (o.shipper_id = p.org_id OR o.agency_org_id = p.org_id)
    )
  );
`;

beforeAll(async () => {
  if (!ANON_KEY || !SERVICE_KEY) throw new Error('Supabase env keys required');
  cleanup();
  await deleteUsers();

  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${PLATFORM_ORG}', 'B375 Platform', 'PLATFORM', 'ACTIVE'),
      ('${SHIPPER_ORG}', 'B375 Shipper', 'SHIPPER', 'ACTIVE'),
      ('${AGENCY_ORG}', 'B375 Agency', 'AGENCY', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.zen_orders
      (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, recipient_country_code, ups_product_code, incoterms, cargo_details)
    VALUES
      ('${ORDER}', 'ZEN-B375-RLS', '${SHIPPER_ORG}', '${AGENCY_ORG}', 'UPS', 'DELIVERED', 'R', '010', 'US', 'WW_EXPEDITED', 'DDP', '{}'::jsonb);
    INSERT INTO public.zen_ups_actual_charges (order_id, charge_type, charge_amount, currency)
    VALUES ('${ORDER}', 'TEST', 10, 'USD');
    INSERT INTO public.zen_order_costs (order_id, cost_type, unit_price, quantity, currency, is_revenue)
    VALUES ('${ORDER}', 'BASE_FREIGHT', 100, 1, 'USD', false);
  `);

  for (const acc of ACCOUNTS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: acc.email,
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { role: acc.role, org_id: acc.org },
      user_metadata: { full_name: acc.key },
    });
    if (error || !data.user) throw new Error(`createUser ${acc.email}: ${error?.message}`);
    profiles[acc.key] = { id: data.user.id, role: acc.role, org_id: acc.org, status: 'ACTIVE' };
    await admin.from('zen_profiles').upsert({
      id: data.user.id,
      org_id: acc.org,
      email: acc.email,
      role: acc.role,
      status: 'ACTIVE',
      full_name: acc.key,
    }, { onConflict: 'id' });

    const client = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: signInError } = await client.auth.signInWithPassword({ email: acc.email, password: PASSWORD });
    if (signInError) throw new Error(`signIn ${acc.email}: ${signInError.message}`);
    sessions[acc.key] = client;
  }
});

afterAll(async () => {
  try {
    psql(`DROP POLICY IF EXISTS shipper_agency_select ON public.zen_ups_actual_charges;`);
    cleanup();
  } catch { /* best-effort */ }
  try { await deleteUsers(); } catch { /* best-effort */ }
});

async function selectCharges(client: SupabaseClient): Promise<number> {
  const { data, error } = await client
    .from('zen_ups_actual_charges')
    .select('id')
    .eq('order_id', ORDER);
  if (error) {
    // GRANT 자체가 없는 역할(anon 등)은 오류도 "0건"으로 간주한다(더 제한적).
    return 0;
  }
  return data?.length ?? 0;
}

async function createPolicy() {
  psql(REBUILD_POLICY);
}
async function dropPolicy() {
  psql(`DROP POLICY IF EXISTS shipper_agency_select ON public.zen_ups_actual_charges;`);
}

describe('TASK-B-375 — 정책 제거 후 화주·대리점·OPERATOR·anon SELECT 0건', () => {
  it('대상 세션은 실비 원본 행을 볼 수 없다', async () => {
    expect(await selectCharges(sessions.shipper!)).toBe(0);
    expect(await selectCharges(sessions.agency!)).toBe(0);
    expect(await selectCharges(sessions.operator!)).toBe(0);
    expect(await selectCharges(anon)).toBe(0);
  });

  it('관리자(ADMIN) 세션은 zen_order_costs를 계속 읽을 수 있다', async () => {
    const { data, error } = await sessions.admin!
      .from('zen_order_costs')
      .select('id')
      .eq('order_id', ORDER);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('정책을 재생성하면 화주·대리점 SELECT가 복구된다 (되돌리기 — vacuous 아님)', async () => {
    await createPolicy();
    expect(await selectCharges(sessions.shipper!)).toBe(1);
    expect(await selectCharges(sessions.agency!)).toBe(1);
    await dropPolicy();
    expect(await selectCharges(sessions.shipper!)).toBe(0);
    expect(await selectCharges(sessions.agency!)).toBe(0);
  });
});

describe('TASK-B-375 — 관리자 3역할은 4개 함수 정상 (admin client 경로)', () => {
  it.each(['super', 'admin', 'manager'] as Key[])('%s 세션: 검색·조회·대사·등록 성공', async (key) => {
    mockValidateUserAction.mockResolvedValue({
      supabase: sessions[key],
      user: { id: profiles[key]!.id },
      profile: profiles[key],
    });

    expect((await searchDeliveredUpsOrders('ZEN-B375-RLS')).map((o: any) => o.id)).toEqual([ORDER]);
    await expect(getUpsActualCharges(ORDER)).resolves.toBeTruthy();
    const recon = await getUpsChargeReconciliation(ORDER);
    expect(recon).not.toBeNull();

    const res = await recordUpsActualCharges(ORDER, [
      { chargeType: 'BY_ADMIN', amount: 5, currency: 'USD' },
    ]);
    expect(res.success, JSON.stringify(res)).toBe(true);
    psql(`DELETE FROM public.zen_ups_actual_charges WHERE order_id='${ORDER}' AND charge_type='BY_ADMIN';`);
  });
});
