// TASK-B-372 (Issue #1356) — JSJung 확정: UPS 실비는 SUPER_ADMIN·ADMIN·MANAGER 전용.
// 실제 로그인 세션·실DB로 실비 조회·검색·대사 함수의 허용/거부를 검증한다.
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

import {
  searchDeliveredUpsOrders,
  getUpsActualCharges,
  getUpsChargeReconciliation,
} from '@/app/actions/finance/ups-actual-charges';

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  return execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' },
  ).trim();
}

const PLATFORM_ORG = '37200000-0000-4000-8000-000000000001';
const SHIPPER_ORG = '37200000-0000-4000-8000-000000000002';
const AGENCY_ORG = '37200000-0000-4000-8000-000000000003';
const ORDER = '37200000-0000-4000-8000-000000000010';

const ACCOUNTS = [
  { key: 'super', email: 'b372-super@test.kr', role: 'ZENITH_SUPER_ADMIN', org: PLATFORM_ORG, allowed: true },
  { key: 'admin', email: 'b372-admin@test.kr', role: 'ADMIN', org: PLATFORM_ORG, allowed: true },
  { key: 'manager', email: 'b372-manager@test.kr', role: 'MANAGER', org: PLATFORM_ORG, allowed: true },
  { key: 'agency', email: 'b372-agency@test.kr', role: 'AGENCY', org: AGENCY_ORG, allowed: false },
  { key: 'shipper', email: 'b372-shipper@test.kr', role: 'SHIPPER', org: SHIPPER_ORG, allowed: false },
  { key: 'operator', email: 'b372-operator@test.kr', role: 'OPERATOR', org: PLATFORM_ORG, allowed: false },
] as const;

type Key = (typeof ACCOUNTS)[number]['key'];
type Profile = { id: string; role: string; org_id: string; status: string };

const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
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
  psql(`DELETE FROM public.zen_profiles WHERE email LIKE 'b372-%@test.kr';`);
  psql(`DELETE FROM public.zen_organizations WHERE id IN ('${PLATFORM_ORG}','${SHIPPER_ORG}','${AGENCY_ORG}');`);
}

beforeAll(async () => {
  if (!ANON_KEY || !SERVICE_KEY) throw new Error('Supabase env keys required');
  cleanup();
  await deleteUsers();

  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${PLATFORM_ORG}', 'B372 Platform', 'PLATFORM', 'ACTIVE'),
      ('${SHIPPER_ORG}', 'B372 Shipper', 'SHIPPER', 'ACTIVE'),
      ('${AGENCY_ORG}', 'B372 Agency', 'AGENCY', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.zen_orders
      (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, recipient_country_code, ups_product_code, incoterms, cargo_details)
    VALUES
      ('${ORDER}', 'ZEN-B372-ADMIN-ONLY', '${SHIPPER_ORG}', '${AGENCY_ORG}', 'UPS', 'DELIVERED', 'R', '010', 'US', 'WW_EXPEDITED', 'DDP', '{}'::jsonb);
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

beforeEach(() => {
  psql(`DELETE FROM public.zen_ups_actual_charges WHERE order_id='${ORDER}';`);
});

function actAs(key: Key) {
  mockValidateUserAction.mockResolvedValue({
    supabase: sessions[key],
    user: { id: profiles[key]!.id },
    profile: profiles[key],
  });
}

afterAll(async () => {
  try { cleanup(); } catch { /* best-effort */ }
  try { await deleteUsers(); } catch { /* best-effort */ }
});

describe('TASK-B-372 — 관리자 3역할: 실비 조회·검색·대사 허용', () => {
  it.each(['super', 'admin', 'manager'] as Key[])('%s 세션: 검색·조회·대사 모두 성공', async (key) => {
    actAs(key);

    const searched = await searchDeliveredUpsOrders('ZEN-B372-ADMIN-ONLY');
    expect(searched.map((o: any) => o.id)).toEqual([ORDER]);

    await expect(getUpsActualCharges(ORDER)).resolves.toBeTruthy();
    const recon = await getUpsChargeReconciliation(ORDER);
    expect(recon).not.toBeNull();
  });
});

describe('TASK-B-372 — 비관리자 3역할: 실비 조회·검색·대사 거부', () => {
  it.each(['agency', 'shipper', 'operator'] as Key[])('%s 세션: 검색·조회·대사 모두 거부 + 행 불변', async (key) => {
    actAs(key);

    await expect(searchDeliveredUpsOrders('ZEN-B372-ADMIN-ONLY')).rejects.toThrow('권한이 없습니다.');
    await expect(getUpsActualCharges(ORDER)).rejects.toThrow('권한이 없습니다.');
    await expect(getUpsChargeReconciliation(ORDER)).rejects.toThrow('권한이 없습니다.');

    expect(psql(`SELECT count(*) FROM public.zen_ups_actual_charges WHERE order_id='${ORDER}';`)).toBe('0');
  });
});
