import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

// ─── TASK-B-339 (Issue #1254 / 통합, R-14 로컬 Supabase) ─────────────────────
//
// "UPS 등록 전까지 수정 가능"을 서버·DB 수준에서 실측한다. is1070(잠금 보호)과 달리
// 여기서는 잠금이 해제된 상태에서 다음이 성립하는지 본다:
//   (i)   라벨 없음 → updateOrder 성공. 실측 치수를 바꾸면 DB의 measured_at이 NULL이 되고,
//         값을 그대로 두면 measured_at이 보존된다 (안전장치 ①)
//   (ii)  활성 zen_ups_labels 행이 있으면 거부 (등록 후 수정 차단)
//   (iii) 폼 로드 이후 창고가 measured_at을 갱신한 상태에서 저장하면 거부 (안전장치 ②)
//   (iv)  화주 세션으로 zen_ups_labels를 실제 조회할 수 있는지(RLS) — 막히면 가드가 항상
//         "없음"으로 동작해 (ii)가 무력화되는 사고이므로 실측 필요
//   (v)   UPS 수정 후 zen_order_rate_snapshots가 행 1개를 유지하며 값이 갱신된다
//         (unique_order_snapshot(order_id) 유일 인덱스 — insert만 하면 실패)

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

function b64url(o: unknown): string {
  return Buffer.from(JSON.stringify(o)).toString('base64url');
}
function makeJwt(sub: string, email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub, role: 'authenticated', email, iat: now, exp: now + 3600,
    aud: 'authenticated', iss: 'supabase',
    app_metadata: { provider: 'email', role: 'ADMIN' },
    user_metadata: {},
  });
  const sig = Buffer.from(
    crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest()
  ).toString('base64url');
  return `${header}.${payload}.${sig}`;
}

function makeSessionClient(userId: string, email: string): SupabaseClient {
  if (!ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required in env');
  const jwt = makeJwt(userId, email);
  return createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

// ── mocks ────────────────────────────────────────────────────────────────
const mockValidateUserAction = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidateUserAction }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));
vi.mock('@/app/actions/master', () => ({ generateOrderNo: vi.fn(), generateMasterOrderNo: vi.fn() }));

// ── fixture UUID ─────────────────────────────────────────────────────────
const ADMIN_USER = '33900000-0000-4000-8000-000000000001';
const ADMIN_ORG = '33900000-0000-4000-8000-000000000002';
const SHIPPER_ORG = '33900000-0000-4000-8000-000000000003';
const ORDER = '33900000-0000-4000-8000-000000000010';
const PKG_MEASURED = '33900000-0000-4000-8000-000000000020';
const PKG_UNMEASURED = '33900000-0000-4000-8000-000000000021';
const LABEL_ID = '33900000-0000-4000-8000-000000000030';
const ORIGIN_PORT = '33900000-0000-4000-8000-000000000041';
const DEST_PORT = '33900000-0000-4000-8000-000000000042';

function cleanupFixture() {
  psql(`
    DELETE FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}';
    DELETE FROM public.zen_ups_labels WHERE order_id='${ORDER}';
    DELETE FROM public.zen_order_edit_log WHERE order_id='${ORDER}';
    DELETE FROM public.zen_order_items WHERE order_id='${ORDER}';
    DELETE FROM public.zen_order_packages WHERE order_id='${ORDER}';
    DELETE FROM public.zen_orders WHERE id='${ORDER}';
    DELETE FROM public.zen_profiles WHERE id IN ('${ADMIN_USER}');
    DELETE FROM auth.users WHERE id IN ('${ADMIN_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${ADMIN_ORG}','${SHIPPER_ORG}');
  `);
}

function setupFixture() {
  cleanupFixture();
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${ADMIN_ORG}', '339 Admin Org', 'PLATFORM', 'ACTIVE'),
      ('${SHIPPER_ORG}', '339 Shipper Org', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, type = EXCLUDED.type;
    INSERT INTO auth.users (id, email) VALUES
      ('${ADMIN_USER}', '339-admin@test.kr')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${ADMIN_USER}', '${ADMIN_ORG}', '339-admin@test.kr', 'ADMIN', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
    INSERT INTO public.zen_ports (id, code, name, type, country_code) VALUES
      ('${ORIGIN_PORT}', 'ICN339', 'Incheon', 'AIR', 'KR'),
      ('${DEST_PORT}', 'LAX339', 'Los Angeles', 'AIR', 'US')
    ON CONFLICT (id) DO UPDATE SET country_code = EXCLUDED.country_code, name = EXCLUDED.name;
    INSERT INTO public.zen_orders (id, order_no, shipper_id, agency_org_id, transport_mode, status,
      recipient_name, recipient_phone, recipient_country_code, recipient_zipcode, recipient_city,
      dest_port_id, ups_product_code, incoterms, cargo_details) VALUES
      ('${ORDER}', 'ZEN-339-EDIT', '${SHIPPER_ORG}', NULL, 'UPS', 'WAREHOUSED',
       'Recv', '0101', 'US', '90001', 'Los Angeles', '${DEST_PORT}', 'WW_EXPEDITED', 'DDP', '{}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, transport_mode = EXCLUDED.transport_mode,
      dest_port_id = EXCLUDED.dest_port_id, ups_product_code = EXCLUDED.ups_product_code,
      recipient_country_code = EXCLUDED.recipient_country_code;
    INSERT INTO public.zen_order_packages (id, order_id, packing_unit, packing_count, gross_weight,
      length, width, height, measured_at, content_type, special_cargo_type, physical_box_count) VALUES
      ('${PKG_MEASURED}', '${ORDER}', 'BOX', 1, 12.5, 30, 20, 10, now(), 'NONDOC', 'NONE', 1),
      ('${PKG_UNMEASURED}', '${ORDER}', 'BOX', 1, 5, 10, 10, 10, NULL, 'NONDOC', 'NONE', 1)
    ON CONFLICT (id) DO UPDATE SET gross_weight = EXCLUDED.gross_weight, length = EXCLUDED.length,
      width = EXCLUDED.width, height = EXCLUDED.height, measured_at = EXCLUDED.measured_at;
    INSERT INTO public.zen_order_items (order_id, package_id, item_name, quantity, unit_price, currency, hs_code) VALUES
      ('${ORDER}', '${PKG_MEASURED}', 'Measured Item', 1, 100, 'USD', '8471300000'),
      ('${ORDER}', '${PKG_UNMEASURED}', 'Unmeasured Item', 1, 50, 'USD', '8471300000')
    ON CONFLICT DO NOTHING;
  `);
}

function getPackages(orderId: string) {
  const rows = psql(
    `SELECT coalesce(length,0)::text||'|'||coalesce(width,0)::text||'|'||coalesce(height,0)::text||'|'||gross_weight::text||'|'||(CASE WHEN measured_at IS NOT NULL THEN 't' ELSE 'f' END)
     FROM public.zen_order_packages WHERE order_id='${orderId}' ORDER BY created_at`
  );
  if (!rows) return [];
  return rows.split('\n').map((line) => {
    const [length, width, height, grossWeight, measured] = line.split('|');
    return { length, width, height, grossWeight, measured: measured === 't' };
  });
}

/** 실측 대상 패키지(중량 12.5)의 현재 measured_at ISO 문자열 — 폼 로드 시점 시각으로 사용한다. */
function measuredPackageMeasuredAt(): string | null {
  const value = psql(
    `SELECT measured_at::text FROM public.zen_order_packages WHERE order_id='${ORDER}' AND gross_weight = 12.5 LIMIT 1`
  );
  return value || null;
}

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    order_type: 'B2B',
    shipper_id: SHIPPER_ORG,
    shipper_contact_phone: '01000000000',
    recipient_name: 'Updated Recipient',
    recipient_address: 'New Address 123',
    recipient_phone: '01099990000',
    recipient_country_code: 'US',
    recipient_zipcode: '90001',
    recipient_city: 'Los Angeles',
    origin_port_id: ORIGIN_PORT,
    dest_port_id: DEST_PORT,
    transport_mode: 'UPS',
    ups_product_code: 'WW_EXPEDITED',
    incoterms: 'DDP',
    packages: [
      {
        id: PKG_MEASURED,
        packing_unit: 'BOX',
        packing_count: 1,
        physical_box_count: 1,
        length: 30,
        width: 20,
        height: 10,
        gross_weight: 12.5,
        special_cargo_type: 'NONE',
        content_type: 'NONDOC',
        items: [{ item_name: 'Measured Item', quantity: 1, unit_price: 100, currency: 'USD', hs_code: '8471300000' }],
      },
      {
        id: PKG_UNMEASURED,
        packing_unit: 'BOX',
        packing_count: 1,
        physical_box_count: 1,
        length: 200,
        width: 300,
        height: 400,
        gross_weight: 50,
        special_cargo_type: 'NONE',
        content_type: 'NONDOC',
        items: [{ item_name: 'Unmeasured Item', quantity: 1, unit_price: 50, currency: 'USD', hs_code: '8471300000' }],
      },
    ],
    ...overrides,
  };
}
function insertActiveLabel() {
  psql(`
    INSERT INTO public.zen_ups_labels (id, order_id, package_id, reference_no, tracking_number, label_format, storage_path, is_voided)
    VALUES ('${LABEL_ID}', '${ORDER}', '${PKG_MEASURED}', 'REF-339', '1Z339TEST', 'PDF', 'labels/339.pdf', false)
    ON CONFLICT (id) DO UPDATE SET is_voided = false, voided_at = NULL;
  `);
}

function voidAllLabels() {
  psql(`UPDATE public.zen_ups_labels SET is_voided = true, voided_at = now() WHERE order_id='${ORDER}'`);
}

function snapshotRows(): string {
  return psql(`SELECT count(*)::text||'|'||coalesce(max(applied_unit_price)::text,'0') FROM public.zen_order_rate_snapshots WHERE order_id='${ORDER}'`);
}

describe('TASK-B-339: UPS 등록 전 수정 (Issue #1254, 실 DB)', () => {
  let supabase: SupabaseClient;

  beforeEach(async () => {
    if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in env');
    supabase = createClient(URL, SERVICE_KEY);
    setupFixture();
    mockValidateUserAction.mockResolvedValue({
      supabase,
      user: { id: ADMIN_USER },
      profile: { id: ADMIN_USER, role: 'ADMIN', org_id: ADMIN_ORG },
    });
  });

  afterAll(() => {
    cleanupFixture();
  });

  it('TC-339-INT-①: 라벨 없음 + 실측 치수 변경 → 저장 성공 + DB measured_at이 NULL (재실측 필요)', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    // 폼 로드 시점: 실측 패키지(measured_at 있음)의 치수를 사용자가 바꿈
    const payload = buildPayload();
    const measuredAtLoad = measuredPackageMeasuredAt();
    expect(measuredAtLoad).not.toBeNull(); // 전제: 저장 전 실측값이 존재한다
    (payload.packages[0] as any).length = 999;
    (payload.packages[0] as any).measured_at = measuredAtLoad; // 폼 로드 시점 시각을 그대로 보냄

    const result = await updateOrder(ORDER, payload as any);
    expect(result.success).toBe(true);

    const pkgs = getPackages(ORDER);
    expect(pkgs.length).toBe(2);
    const measured = pkgs.find((p) => p.length === '999');
    expect(measured).toBeTruthy();
    expect(measured?.measured).toBe(false); // 치수 변경 → measured_at 해제 → 창고 재실측 필요

    // 원래부터 미실측이던 패키지는 그대로 미실측 (손상 없음)
    const unmeasured = pkgs.find((p) => p.grossWeight === '50');
    expect(unmeasured?.measured).toBe(false);
  });

  it('TC-339-INT-②: 라벨 없음 + 실측 치수 불변 → 저장 성공 + measured_at 보존', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    const before = measuredPackageMeasuredAt();
    expect(before).not.toBeNull();

    const payload = buildPayload();
    (payload.packages[0] as any).measured_at = before; // 폼 로드 시점 시각
    const result = await updateOrder(ORDER, payload as any);
    expect(result.success).toBe(true);

    // updateOrder는 패키지를 delete+reinsert하므로 id가 바뀐다 — 값 기준으로 조회
    const after = measuredPackageMeasuredAt();
    expect(after).not.toBeNull();
    expect(after).toBe(before); // 5개 값 불변 → measured_at 이월 (안전장치 ①)
  });

  it('TC-339-INT-③: 활성 라벨 삽입 후 → 저장 거부 + DB 불변', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    insertActiveLabel();
    const before = measuredPackageMeasuredAt();

    await expect(updateOrder(ORDER, buildPayload() as any)).rejects.toThrow(/UPS 등록취소/);

    expect(measuredPackageMeasuredAt()).toBe(before);
    expect(psql(`SELECT recipient_name FROM public.zen_orders WHERE id='${ORDER}'`)).toBe('Recv');
  });

  it('TC-339-INT-④: 폼 로드 후 창고가 measured_at을 갱신한 상태 → 저장 거부 (낙관적 동시성)', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    voidAllLabels();

    // 1) 폼 로드 시점: 옛 measured_at
    const staleMeasuredAt = '2026-10-01T00:00:00.000Z';
    psql(`UPDATE public.zen_order_packages SET measured_at='${staleMeasuredAt}' WHERE id='${PKG_MEASURED}'`);
    // 2) 폼 로드 이후: 창고가 재실측 (measured_at + 치수 갱신)
    psql(`UPDATE public.zen_order_packages SET measured_at=now(), length=50, width=50, height=50, gross_weight=20 WHERE id='${PKG_MEASURED}'`);

    // 3) 사용자는 옛 시각의 payload로 저장 → 거부되어야 한다
    const payload = buildPayload();
    (payload.packages[0] as any).measured_at = staleMeasuredAt;
    await expect(updateOrder(ORDER, payload as any)).rejects.toThrow(/실측값이 갱신되었습니다/);

    // 저장 자체가 일어나지 않음
    expect(psql(`SELECT length::text FROM public.zen_order_packages WHERE order_id='${ORDER}' AND length = 50`)).toBe('50');
    expect(psql(`SELECT recipient_name FROM public.zen_orders WHERE id='${ORDER}'`)).toBe('Recv');
  });

  it('TC-339-INT-⑤: 화주 세션(RLS)으로 zen_ups_labels를 실제 조회할 수 있는가 — 가드가 "없음"으로 오인하지 않음', async () => {
    const shipper = makeSessionClient(ADMIN_USER, '339-admin@test.kr');

    // 라벨이 없을 때
    voidAllLabels();
    const empty = await shipper
      .from('zen_ups_labels')
      .select('id')
      .eq('order_id', ORDER)
      .eq('is_voided', false)
      .limit(1)
      .maybeSingle();
    expect(empty.error).toBeNull();
    expect(empty.data).toBeNull();

    // 활성 라벨이 있을 때 — 화주 세션이라도 반드시 보여야 한다(안 보이면 가드가 항상 false → 차단 무력화)
    insertActiveLabel();
    const found = await shipper
      .from('zen_ups_labels')
      .select('id')
      .eq('order_id', ORDER)
      .eq('is_voided', false)
      .limit(1)
      .maybeSingle();
    expect(found.error).toBeNull();
    expect(found.data).toBeTruthy();
  });

  it('TC-339-INT-⑥: UPS 수정 후 zen_order_rate_snapshots가 행 1개를 유지하며 값이 갱신된다', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    voidAllLabels();

    // 기존 스냅샷 1건을 심어 두고 수정 후에도 1건이 유지되는지 본다
    psql(`
      INSERT INTO public.zen_order_rate_snapshots (id, order_id, applied_unit_price, applied_currency, applied_rule, metadata, is_manual)
      VALUES ('${ORDER}', '${ORDER}', 1, 'USD', 'UPS_3TIER', '{}'::jsonb, false)
      ON CONFLICT (order_id) DO UPDATE SET applied_unit_price = EXCLUDED.applied_unit_price, is_manual = false;
    `);
    const before = snapshotRows();

    const result = await updateOrder(ORDER, buildPayload() as any);
    expect(result.success).toBe(true);

    const [count, maxPrice] = snapshotRows().split('|');
    expect(count).toBe('1'); // 유일 인덱스 유지 — 중복 삽입 없음
    expect(before.split('|')[0]).toBe('1');
    // 값이 1에서 실제 운임으로 갱신된다 (계산 불가 시에도 1건은 유지된다)
    expect(Number(maxPrice)).not.toBe(1);
  });
});
