import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

// TASK-B-284 (Issue #1070): UPS 오더 WAREHOUSED 단계 부분 수정 허용 (measured_at 기반) 회귀 테스트.
//
// 실제 로컬 DB(docker supabase_db_ZENITH_LMS_001)에 WAREHOUSED+UPS 오더 + 패키지(실측/미실측)를
// 세팅하고, 실제 updateOrder() 서버 액션을 실행한 뒤 DB 상태를 직접 조회해 검증한다.
//
// 핵심: UI 숨김이 아니라 서버가 실제로 실측값을 무시/보호하는지가 관건 — updateOrder()가
// measured_at이 있는 패키지의 치수/무게를 화주가 보낸 새 값으로 덮어쓰지 않는지 확인.
//
// 되돌리기 검증: measured_at 잠금 로직 제거 시 실측 패키지 치수/무게가 실제로 덮어써지는
// 회귀를 재현할 수 있어야 한다 (아래 TC-284-02가 그 역할).

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

// ── mocks ────────────────────────────────────────────────────────────────
const mockValidateUserAction = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: mockValidateUserAction,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));

// 테스트 전용 UUID 상수
const ADMIN_USER = '28400000-0000-4000-8000-000000000001';
const ADMIN_ORG = '28400000-0000-4000-8000-000000000002';
const SHIPPER_ORG = '28400000-0000-4000-8000-000000000003';
const ORDER = '28400000-0000-4000-8000-000000000010';
const PKG_MEASURED = '28400000-0000-4000-8000-000000000020';
const PKG_UNMEASURED = '28400000-0000-4000-8000-000000000021';

function setupFixture() {
  psql(`
    DELETE FROM public.zen_order_edit_log WHERE order_id='${ORDER}';
    DELETE FROM public.zen_order_items WHERE order_id='${ORDER}';
    DELETE FROM public.zen_order_packages WHERE order_id='${ORDER}';
    DELETE FROM public.zen_orders WHERE id='${ORDER}';
    DELETE FROM public.zen_profiles WHERE id IN ('${ADMIN_USER}');
    DELETE FROM auth.users WHERE id IN ('${ADMIN_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${ADMIN_ORG}','${SHIPPER_ORG}');
  `);
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${ADMIN_ORG}', '284 Admin Org', 'CORPORATE', 'ACTIVE'),
      ('${SHIPPER_ORG}', '284 Shipper Org', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    INSERT INTO auth.users (id, email) VALUES
      ('${ADMIN_USER}', '284-admin@test.kr')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${ADMIN_USER}', '${ADMIN_ORG}', '284-admin@test.kr', 'ADMIN', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
    INSERT INTO public.zen_orders (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, cargo_details) VALUES
      ('${ORDER}', 'ZEN-284-WARE', '${SHIPPER_ORG}', NULL, 'UPS', 'WAREHOUSED', 'Recv', '010-1', '{}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    -- 실측 완료 패키지 (창고가 측정한 값 — SHXK 전송 컬럼과 동일)
    INSERT INTO public.zen_order_packages (id, order_id, packing_unit, packing_count, gross_weight, length, width, height, measured_at, content_type, special_cargo_type, physical_box_count) VALUES
      ('${PKG_MEASURED}', '${ORDER}', 'BOX', 1, 12.5, 30, 20, 10, now(), 'NONDOC', 'NONE', 1),
      -- 미실측 패키지
      ('${PKG_UNMEASURED}', '${ORDER}', 'BOX', 1, 5, 10, 10, 10, NULL, 'NONDOC', 'NONE', 1)
    ON CONFLICT (id) DO UPDATE SET gross_weight = EXCLUDED.gross_weight, length = EXCLUDED.length, width = EXCLUDED.width, height = EXCLUDED.height, measured_at = EXCLUDED.measured_at;
    INSERT INTO public.zen_order_items (order_id, package_id, item_name, quantity, unit_price, currency) VALUES
      ('${ORDER}', '${PKG_MEASURED}', 'Measured Item', 1, 100, 'USD'),
      ('${ORDER}', '${PKG_UNMEASURED}', 'Unmeasured Item', 1, 50, 'USD')
    ON CONFLICT (id) DO NOTHING;
  `);
}

function cleanupFixture() {
  psql(`
    DELETE FROM public.zen_order_edit_log WHERE order_id='${ORDER}';
    DELETE FROM public.zen_order_items WHERE order_id='${ORDER}';
    DELETE FROM public.zen_order_packages WHERE order_id='${ORDER}';
    DELETE FROM public.zen_orders WHERE id='${ORDER}';
    DELETE FROM public.zen_profiles WHERE id IN ('${ADMIN_USER}');
    DELETE FROM auth.users WHERE id IN ('${ADMIN_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${ADMIN_ORG}','${SHIPPER_ORG}');
  `);
}

function getPkg(orderId: string, measured: boolean): { gw: string; len: string; wid: string; hgt: string; pkgMeasured: string } {
  // updateOrder가 패키지를 delete+reinsert하므로 id가 재생성됨 — measured_at 유무로 식별
  const row = psql(`SELECT gross_weight||'|'||coalesce(length,0)||'|'||coalesce(width,0)||'|'||coalesce(height,0)||'|'||(CASE WHEN measured_at IS NOT NULL THEN 't' ELSE 'f' END)
    FROM public.zen_order_packages WHERE order_id='${orderId}' AND (measured_at IS NOT NULL) = ${measured} LIMIT 1`);
  const [gw, len, wid, hgt, pkgMeasured] = row.split('|');
  return { gw, len, wid, hgt, pkgMeasured };
}

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    order_type: 'B2B' as const,
    shipper_id: SHIPPER_ORG,
    recipient_name: 'Updated Recipient',
    recipient_address: 'New Address 123',
    recipient_phone: '010-9999-0000',
    recipient_country_code: 'US',
    recipient_zipcode: '90001',
    recipient_city: 'Los Angeles',
    shipper_contact_phone: '010-0000-0000',
    transport_mode: 'UPS' as const,
    ups_product_code: 'WW_EXPEDITED',
    incoterms: 'DDP' as const,
    packages: [
      {
        id: PKG_MEASURED,
        packing_unit: 'BOX',
        packing_count: 1,
        physical_box_count: 1,
        length: 999,
        width: 999,
        height: 999,
        gross_weight: 999,
        special_cargo_type: 'NONE',
        content_type: 'NONDOC',
        items: [{ item_name: 'Measured Item', quantity: 1, unit_price: 100, currency: 'USD' }],
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
        items: [{ item_name: 'Unmeasured Item', quantity: 1, unit_price: 50, currency: 'USD' }],
      },
    ],
    ...overrides,
  };
}

describe('DEF-B-052~ TASK-B-284: UPS WAREHOUSED 부분 수정 (Issue #1070)', () => {
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

  it('TC-284-01: WAREHOUSED+UPS — 헤더 수정 성공 + 미실측 패키지 치수/무게 수정 성공 (실 DB)', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    const payload = buildPayload();
    const result = await updateOrder(ORDER, payload as any);

    expect(result.success).toBe(true);

    // 헤더 수정 반영
    const recipientName = psql(`SELECT recipient_name FROM public.zen_orders WHERE id='${ORDER}'`);
    expect(recipientName).toBe('Updated Recipient');

    // 미실측 패키지는 새 치수/무게로 갱신됨
    const pkg = getPkg(ORDER, false);
    expect(pkg.gw).toBe('50');
    expect(pkg.len).toBe('200');
    expect(pkg.wid).toBe('300');
    expect(pkg.hgt).toBe('400');
    expect(pkg.pkgMeasured).toBe('f');
  });

  it('TC-284-02: WAREHOUSED+UPS — 실측 패키지 치수/무게 수정 시도 → DB 값 불변 (서버 레벨 보호)', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    const payload = buildPayload(); // PKG_MEASURED는 length/width/height/gross_weight=999 시도
    const result = await updateOrder(ORDER, payload as any);

    expect(result.success).toBe(true);

    // 실측 패키지는 999로 덮어쓰이지 않고 기존 실측값(30x20x10, 12.5kg) 유지
    const pkg = getPkg(ORDER, true);
    expect(pkg.gw).toBe('12.5');
    expect(pkg.len).toBe('30');
    expect(pkg.wid).toBe('20');
    expect(pkg.hgt).toBe('10');
    expect(pkg.pkgMeasured).toBe('t'); // measured_at 유지
  });

  it('TC-284-03: WAREHOUSED+UPS — 아이템 수정은 measured_at과 무관하게 항상 성공', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    const payload = buildPayload({
      packages: [
        {
          id: PKG_MEASURED,
          packing_unit: 'BOX',
          packing_count: 1,
          physical_box_count: 1,
          length: 999,
          width: 999,
          height: 999,
          gross_weight: 999,
          special_cargo_type: 'NONE',
          content_type: 'NONDOC',
          items: [{ item_name: 'Measured Item RENAMED', quantity: 2, unit_price: 200, currency: 'USD' }],
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
          items: [{ item_name: 'Unmeasured Item', quantity: 1, unit_price: 50, currency: 'USD' }],
        },
      ],
    });
    const result = await updateOrder(ORDER, payload as any);
    expect(result.success).toBe(true);

    const itemName = psql(`SELECT item_name FROM public.zen_order_items WHERE order_id='${ORDER}' AND item_name LIKE 'Measured Item%' LIMIT 1`);
    expect(itemName).toBe('Measured Item RENAMED');
  });

  it('TC-284-04: WAREHOUSED+UPS — shipper_id/transport_mode 수정 시도 → 무시됨 (잠금)', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    // SHIPPER_ORG 대신 다른 org를 보내고 transport_mode를 AIR로 시도
    const payload = buildPayload({
      shipper_id: ADMIN_ORG,
      transport_mode: 'AIR',
      origin_port_id: '550e8400-e29b-41d4-a716-446655440001',
      dest_port_id: '550e8400-e29b-41d4-a716-446655440002',
    });
    const result = await updateOrder(ORDER, payload as any);
    expect(result.success).toBe(true);

    const shipperId = psql(`SELECT shipper_id FROM public.zen_orders WHERE id='${ORDER}'`);
    expect(shipperId).toBe(SHIPPER_ORG); // 기존 유지
    const transportMode = psql(`SELECT transport_mode FROM public.zen_orders WHERE id='${ORDER}'`);
    expect(transportMode).toBe('UPS'); // 기존 유지
  });

  it('TC-284-05: WAREHOUSED+UPS 수정 시 감사 로그 기록', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    const result = await updateOrder(ORDER, buildPayload() as any);
    expect(result.success).toBe(true);

    const logCount = psql(`SELECT count(*) FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(logCount).toBe('1');
    const statusAtEdit = psql(`SELECT order_status_at_edit FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(statusAtEdit).toBe('WAREHOUSED');
  });

  it('TC-284-06: WAREHOUSED+비UPS(AIR) — 수정 거부 (실 DB)', async () => {
    // AIR 오더를 WAREHOUSED로 세팅
    psql(`UPDATE public.zen_orders SET transport_mode='AIR' WHERE id='${ORDER}'`);
    const { updateOrder } = await import('@/app/actions/operations/orders');
    const payload = buildPayload({
      transport_mode: 'AIR',
      origin_port_id: '550e8400-e29b-41d4-a716-446655440001',
      dest_port_id: '550e8400-e29b-41d4-a716-446655440002',
    });
    await expect(updateOrder(ORDER, payload as any)).rejects.toThrow(/cannot be edited/);
  });
});
