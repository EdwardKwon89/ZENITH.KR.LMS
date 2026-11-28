// TASK-B-370 (Issue #1420) — 안전 뷰 전환: 화주·대리점·관리자·비소유 세션별 실DB 검증.
// service_role 단독 검증이 아니라 실제 로그인 세션(signInWithPassword)으로 RLS/뷰를 통과시킨다.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
// CI Supabase 정책: 소문자·대문자·숫자·기호 각 1자 이상
const PASSWORD = 'Password1234!';

vi.mock('@/lib/ups/estimate-core', () => ({
  estimateUpsFreightCore: vi.fn(),
}));

import { refreshUpsRateSnapshot } from '@/lib/orders/rate-snapshot-refresh';
import { saveOrderRateSnapshot, applyPackageMeasurements } from '@/app/actions/operations/orders';

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  return execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' },
  ).trim();
}

const ADMIN_ORG = '37000000-0000-4000-8000-000000000002';
const SHIPPER_A = '37000000-0000-4000-8000-000000000003';
const SHIPPER_B = '37000000-0000-4000-8000-000000000004';
const AGENCY_ORG = '37000000-0000-4000-8000-000000000005';
const ORDER = '37000000-0000-4000-8000-000000000010';
const PACKAGE = '37000000-0000-4000-8000-000000000020';

const ACCOUNTS = [
  { key: 'admin', email: 'b370-admin@test.kr', role: 'ADMIN', org: ADMIN_ORG },
  { key: 'shipperA', email: 'b370-shipper-a@test.kr', role: 'SHIPPER', org: SHIPPER_A },
  { key: 'agency', email: 'b370-agency@test.kr', role: 'AGENCY', org: AGENCY_ORG },
  { key: 'shipperB', email: 'b370-shipper-b@test.kr', role: 'SHIPPER', org: SHIPPER_B },
  { key: 'manager', email: 'b370-manager@test.kr', role: 'MANAGER', org: ADMIN_ORG },
] as const;

type AccountKey = (typeof ACCOUNTS)[number]['key'];

const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
const sessions: Partial<Record<AccountKey, SupabaseClient>> = {};
const profiles: Record<AccountKey, { id: string; role: string; org_id: string }> = {} as any;

async function deleteUsers() {
  const { data } = await admin.auth.admin.listUsers();
  const emails = ACCOUNTS.map((a) => a.email);
  for (const u of data?.users ?? []) {
    if (u.email && emails.includes(u.email)) await admin.auth.admin.deleteUser(u.id);
  }
}

function cleanup() {
  psql(`DELETE FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';`);
  psql(`DELETE FROM public.zen_order_packages WHERE order_id='${ORDER}';`);
  psql(`DELETE FROM public.zen_orders WHERE id='${ORDER}';`);
  psql(`DELETE FROM public.zen_profiles WHERE email LIKE 'b370-%@test.kr';`);
  psql(`DELETE FROM public.zen_organizations WHERE id IN ('${ADMIN_ORG}','${SHIPPER_A}','${SHIPPER_B}','${AGENCY_ORG}');`);
}

function resetSnapshot(price = 111) {
  psql(`
    DELETE FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';
    INSERT INTO public.zen_order_rate_snapshots
      (order_id, applied_unit_price, applied_currency, applied_rule, is_manual, metadata)
    VALUES
      ('${ORDER}', ${price}, 'USD', 'UPS_3TIER', false,
       '{"platform":{"totalSellingPrice":111,"currency":"USD"},"agency":{"agencyCostPrice":90},"shipper":{"finalFreight":100}}'::jsonb);
  `);
}

function resetPackage(weight = 5) {
  psql(`UPDATE public.zen_order_packages SET gross_weight=${weight}, length=30, width=20, height=10, measured_at=NULL WHERE id='${PACKAGE}';`);
}

beforeAll(async () => {
  if (!ANON_KEY || !SERVICE_KEY) throw new Error('Supabase env keys required');
  cleanup();
  await deleteUsers();

  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${ADMIN_ORG}', 'B370 Platform', 'PLATFORM', 'ACTIVE'),
      ('${SHIPPER_A}', 'B370 Shipper A', 'SHIPPER', 'ACTIVE'),
      ('${SHIPPER_B}', 'B370 Shipper B', 'SHIPPER', 'ACTIVE'),
      ('${AGENCY_ORG}', 'B370 Agency', 'AGENCY', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
  `);

  for (const acc of ACCOUNTS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: acc.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: acc.key },
    });
    if (error || !data.user) throw new Error(`createUser ${acc.email}: ${error?.message}`);
    profiles[acc.key] = { id: data.user.id, role: acc.role, org_id: acc.org };
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

  psql(`
    INSERT INTO public.zen_orders
      (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, recipient_country_code, ups_product_code, incoterms, cargo_details)
    VALUES
      ('${ORDER}', 'ZEN-B370-ORDER', '${SHIPPER_A}', '${AGENCY_ORG}', 'UPS', 'REGISTERED', 'R', '010', 'US', 'WW_EXPEDITED', 'DDP', '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.zen_order_packages
      (id, order_id, packing_unit, packing_count, length, width, height, gross_weight)
    VALUES
      ('${PACKAGE}', '${ORDER}', 'BOX', 1, 30, 20, 10, 5)
    ON CONFLICT (id) DO NOTHING;
  `);
  resetSnapshot();
});

afterAll(async () => {
  try { cleanup(); } catch { /* best-effort */ }
  try { await deleteUsers(); } catch { /* best-effort */ }
});

describe('TASK-B-370 안전 뷰 — 세션별 실DB 조회', () => {
  it('화주(소유)/대리점/관리자 세션은 안전 뷰에서 1행, 비소유 화주는 0행', async () => {
    for (const key of ['shipperA', 'agency', 'admin'] as AccountKey[]) {
      const { data, error } = await sessions[key]!
        .from('zen_order_rate_snapshots_safe')
        .select('order_id, applied_unit_price, metadata')
        .eq('order_id', ORDER);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].metadata.platform.totalSellingPrice).toBe(111);
      expect(data![0].metadata.agency).toBeUndefined();
      expect(data![0].metadata.shipper).toBeUndefined();
    }

    const other = await sessions.shipperB!
      .from('zen_order_rate_snapshots_safe')
      .select('order_id')
      .eq('order_id', ORDER);
    expect(other.error).toBeNull();
    expect(other.data).toHaveLength(0);
  });
});

describe('TASK-B-370 쓰기 — 소유 검증 후 admin client', () => {
  it('화주(소유) 세션: refreshUpsRateSnapshot 이 1행을 UPDATE 한다', async () => {
    resetSnapshot();
    const estimateFn = vi.fn().mockResolvedValue({ platform: { totalSellingPrice: 201, currency: 'USD' } });

    await refreshUpsRateSnapshot({
      supabase: sessions.shipperA!,
      orderId: ORDER,
      profile: profiles.shipperA,
      estimateFn,
    });

    const [count, price] = psql(`SELECT count(*)::text||'|'||max(applied_unit_price)::text FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';`).split('|');
    expect(Number(count)).toBe(1);
    expect(Number(price)).toBe(201);
  });

  it('대리점 세션: refreshUpsRateSnapshot 이 UPDATE 한다', async () => {
    resetSnapshot();
    const estimateFn = vi.fn().mockResolvedValue({ platform: { totalSellingPrice: 202, currency: 'USD' } });

    await refreshUpsRateSnapshot({
      supabase: sessions.agency!,
      orderId: ORDER,
      profile: profiles.agency,
      estimateFn,
    });

    expect(Number(psql(`SELECT applied_unit_price FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';`))).toBe(202);
  });

  it('관리자 세션: refreshUpsRateSnapshot 이 UPDATE 한다', async () => {
    resetSnapshot();
    const estimateFn = vi.fn().mockResolvedValue({ platform: { totalSellingPrice: 203, currency: 'USD' } });

    await refreshUpsRateSnapshot({
      supabase: sessions.admin!,
      orderId: ORDER,
      profile: profiles.admin,
      estimateFn,
    });

    expect(Number(psql(`SELECT applied_unit_price FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';`))).toBe(203);
  });

  it('비소유 화주 세션: 쓰기 0회 — 행 수·금액 불변, 추정 함수 미호출', async () => {
    resetSnapshot(111);
    const estimateFn = vi.fn();

    await refreshUpsRateSnapshot({
      supabase: sessions.shipperB!,
      orderId: ORDER,
      profile: profiles.shipperB,
      estimateFn,
    });

    expect(estimateFn).not.toHaveBeenCalled();
    const [count, price] = psql(`SELECT count(*)::text||'|'||max(applied_unit_price)::text FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';`).split('|');
    expect(Number(count)).toBe(1);
    expect(Number(price)).toBe(111);
  });

  it('오더 등록 경로(saveOrderRateSnapshot): 소유 화주는 스냅샷 INSERT, 비소유는 INSERT 0건', async () => {
    psql(`DELETE FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';`);
    const estimate = {
      platform: { totalSellingPrice: 301, currency: 'USD' },
      agency: { agencyCostPrice: 250 },
      shipper: { finalFreight: 290 },
    };
    const validated = {
      ups_product_code: 'WW_EXPEDITED',
      packages: [{ gross_weight: 5, length: 30, width: 20, height: 10 }],
      dest_port_id: null,
      recipient_country_code: 'US',
      incoterms: 'DDP',
    } as any;

    await saveOrderRateSnapshot({
      supabase: sessions.shipperB!,
      orderId: ORDER,
      validated,
      profile: profiles.shipperB,
      estimateFn: vi.fn().mockResolvedValue(estimate),
    });
    expect(psql(`SELECT count(*) FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';`)).toBe('0');

    await saveOrderRateSnapshot({
      supabase: sessions.shipperA!,
      orderId: ORDER,
      validated,
      profile: profiles.shipperA,
      estimateFn: vi.fn().mockResolvedValue(estimate),
    });
    const [price, hasAgency, hasShipper] = psql(`SELECT applied_unit_price::text||'|'||(metadata ? 'agency')::text||'|'||(metadata ? 'shipper')::text FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';`).split('|');
    expect(Number(price)).toBe(301);
    expect(hasAgency).toBe('true');
    expect(hasShipper).toBe('true');
  });

  it('실측 경로(applyPackageMeasurements): 소유 화주가 중량 변경 시 스냅샷 1행 UPDATE', async () => {
    resetSnapshot();
    resetPackage(5);
    const freight = await import('@/lib/ups/estimate-core');
    (freight.estimateUpsFreightCore as any).mockResolvedValue({ platform: { totalSellingPrice: 401, currency: 'USD' } });

    const result = await applyPackageMeasurements(
      sessions.shipperA!,
      profiles.shipperA,
      ORDER,
      [{ packageId: PACKAGE, gross_weight: 7 }],
    );

    expect(result.changed).toBe(true);
    expect(result.oldFreight).toBe(111);
    expect(result.newFreight).toBe(401);
    expect(Number(psql(`SELECT gross_weight FROM public.zen_order_packages WHERE id='${PACKAGE}';`))).toBe(7);
    const [count, price] = psql(`SELECT count(*)::text||'|'||max(applied_unit_price)::text FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';`).split('|');
    expect(Number(count)).toBe(1);
    expect(Number(price)).toBe(401);
  });

  it('실측 경로: 대리점 세션이 중량 변경 시 스냅샷 1행 UPDATE', async () => {
    resetSnapshot();
    resetPackage(5);
    const freight = await import('@/lib/ups/estimate-core');
    (freight.estimateUpsFreightCore as any).mockResolvedValue({ platform: { totalSellingPrice: 402, currency: 'USD' } });

    const result = await applyPackageMeasurements(
      sessions.agency!,
      profiles.agency,
      ORDER,
      [{ packageId: PACKAGE, gross_weight: 7 }],
    );

    expect(result.changed).toBe(true);
    expect(result.oldFreight).toBe(111);
    expect(result.newFreight).toBe(402);
    const [count, price] = psql(`SELECT count(*)::text||'|'||max(applied_unit_price)::text FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';`).split('|');
    expect(Number(count)).toBe(1);
    expect(Number(price)).toBe(402);
  });

  it('실측 경로: 관리자 세션이 중량 변경 시 스냅샷 1행 UPDATE', async () => {
    resetSnapshot();
    resetPackage(5);
    const freight = await import('@/lib/ups/estimate-core');
    (freight.estimateUpsFreightCore as any).mockResolvedValue({ platform: { totalSellingPrice: 403, currency: 'USD' } });

    const result = await applyPackageMeasurements(
      sessions.admin!,
      profiles.admin,
      ORDER,
      [{ packageId: PACKAGE, gross_weight: 7 }],
    );

    expect(result.changed).toBe(true);
    expect(result.newFreight).toBe(403);
    const [count, price] = psql(`SELECT count(*)::text||'|'||max(applied_unit_price)::text FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';`).split('|');
    expect(Number(count)).toBe(1);
    expect(Number(price)).toBe(403);
  });

  it('실측 경로: 패키지를 읽을 수 있는 비소유 MANAGER 는 스냅샷을 덮어쓰지 않는다', async () => {
    resetSnapshot(111);
    resetPackage(5);
    const freight = await import('@/lib/ups/estimate-core');
    (freight.estimateUpsFreightCore as any).mockResolvedValue({ platform: { totalSellingPrice: 404, currency: 'USD' } });

    await applyPackageMeasurements(
      sessions.manager!,
      profiles.manager,
      ORDER,
      [{ packageId: PACKAGE, gross_weight: 7 }],
    );

    // 패키지는 MANAGER 권한으로 변경되지만(읽기/쓰기 허용), 스냅샷은 소유자가 아니므로 불변.
    expect(Number(psql(`SELECT gross_weight FROM public.zen_order_packages WHERE id='${PACKAGE}';`))).toBe(7);
    const [count, price] = psql(`SELECT count(*)::text||'|'||max(applied_unit_price)::text FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';`).split('|');
    expect(Number(count)).toBe(1);
    expect(Number(price)).toBe(111);
  });
});
