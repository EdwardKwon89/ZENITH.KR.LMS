import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

// TASK-B-303 (Issue #1125): 오더 등록/수정 이력(zen_order_edit_log) — updateOrder 회귀 테스트 (실 DB)
//
// 실제 로컬 DB(docker supabase_db_ZENITH_LMS_001)에 오더 fixture를 세팅하고,
// 실제 updateOrder() 서버 액션을 실행한 뒤 edit_log에 old_data/new_data가 정확히 기록되는지 검증.
//
// 핵심: ① 변경 있으면 UPDATE 기록(old/new 정확한 전/후 값) ② 무변경 재제출은 로그 추가 안 됨(hasChanges 가드)
//       ③ packages 변경은 화이트리스트 제외로 로그 영향 없음 ④ WAREHOUSED+UPS 부분수정도 정상 기록(기존 TASK-B-284 유지)

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

// ── mocks ────────────────────────────────────────────────────────
const mockValidateUserAction = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: mockValidateUserAction,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));

// 테스트 전용 UUID 상수
const ADMIN_USER = '30300000-0000-4000-8000-000000000001';
const ADMIN_ORG = '30300000-0000-4000-8000-000000000002';
const SHIPPER_ORG = '30300000-0000-4000-8000-000000000003';
const ORDER = '30300000-0000-4000-8000-000000000010';
const PKG_MEASURED = '30300000-0000-4000-8000-000000000020';
const PKG_UNMEASURED = '30300000-0000-4000-8000-000000000021';

function setupFixture(status = 'REGISTERED') {
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
      ('${ADMIN_ORG}', '303 Admin Org', 'CORPORATE', 'ACTIVE'),
      ('${SHIPPER_ORG}', '303 Shipper Org', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    INSERT INTO auth.users (id, email) VALUES
      ('${ADMIN_USER}', '303-admin@test.kr')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${ADMIN_USER}', '${ADMIN_ORG}', '303-admin@test.kr', 'ADMIN', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
    INSERT INTO public.zen_orders (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, recipient_country_code, cargo_details) VALUES
      ('${ORDER}', 'ZEN-303', '${SHIPPER_ORG}', NULL, 'UPS', '${status}', 'Recv', '010-1', 'US', '{}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    INSERT INTO public.zen_order_packages (id, order_id, packing_unit, packing_count, gross_weight, length, width, height, measured_at, content_type, special_cargo_type, physical_box_count) VALUES
      ('${PKG_MEASURED}', '${ORDER}', 'BOX', 1, 12.5, 30, 20, 10, ${status === 'WAREHOUSED' ? 'now()' : 'NULL'}, 'NONDOC', 'NONE', 1),
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

describe('TASK-B-303: 오더 수정 이력 — zen_order_edit_log (Issue #1125)', () => {
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

  it('TC-B303-08: 변경 있는 수정 → edit_log에 action=UPDATE + old/new 전후 값 기록 (실 DB)', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    const result = await updateOrder(ORDER, buildPayload() as any);
    expect(result.success).toBe(true);

    const action = psql(`SELECT action FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(action).toBe('UPDATE');

    // old_data: 수정 전 값
    const oldPhone = psql(`SELECT old_data->>'recipient_phone' FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(oldPhone).toBe('010-1');
    const oldName = psql(`SELECT old_data->>'recipient_name' FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(oldName).toBe('Recv');
    // new_data: 수정 후 값
    const newPhone = psql(`SELECT new_data->>'recipient_phone' FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(newPhone).toBe('010-9999-0000');
    const newName = psql(`SELECT new_data->>'recipient_name' FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(newName).toBe('Updated Recipient');
    // 화이트리스트 밖 필드는 스냅샷에 없음
    const hasEstimated = psql(`SELECT (new_data ? 'estimated_cost')::text FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(hasEstimated).toBe('false');
    const hasPackages = psql(`SELECT (new_data ? 'packages')::text FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(hasPackages).toBe('false');
  });

  it('TC-B303-09: 무변경 재제출 → hasChanges 가드로 로그 추가 안 됨 (실 DB)', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    const payload = buildPayload() as any;

    // 1차: 실제 변경 → 로그 1건
    await updateOrder(ORDER, payload);
    let count = psql(`SELECT count(*) FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(count).toBe('1');

    // 2차: 동일 payload 재제출 → 화이트리스트 필드 변경 없음 → 로그 그대로 1건
    await updateOrder(ORDER, payload);
    count = psql(`SELECT count(*) FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(count).toBe('1');
  });

  it('TC-B303-10: packages(화이트리스트 제외)만 변경 → 로그 영향 없음 (실 DB)', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');

    // 1차: DB를 buildPayload 값으로 맞춤 → 로그 1건
    await updateOrder(ORDER, buildPayload() as any);
    let count = psql(`SELECT count(*) FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(count).toBe('1');

    // 2차: packages 구성만 변경(핵심 필드는 동일) → TASK-B-311: 화물 변경 시 로그 1건 추가
    await updateOrder(ORDER, buildPayload({
      packages: [
        {
          id: PKG_MEASURED,
          packing_unit: 'BOX',
          packing_count: 1,
          physical_box_count: 1,
          length: 11,
          width: 11,
          height: 11,
          gross_weight: 2,
          special_cargo_type: 'NONE',
          content_type: 'NONDOC',
          items: [{ item_name: 'Renamed Item', quantity: 2, unit_price: 300, currency: 'USD' }],
        },
      ],
    }) as any);
    count = psql(`SELECT count(*) FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    // TASK-B-311: 화물 변경만으로도 로그 생성 (총 2건)
    expect(count).toBe('2');
  });

  it('TC-B303-11: WAREHOUSED+UPS 부분수정 → 기존 TASK-B-284 감사 로직과 함께 UPDATE 기록 (실 DB)', async () => {
    setupFixture('WAREHOUSED');
    const { updateOrder } = await import('@/app/actions/operations/orders');
    const result = await updateOrder(ORDER, buildPayload() as any);
    expect(result.success).toBe(true);

    const action = psql(`SELECT action FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(action).toBe('UPDATE');
    const statusAtEdit = psql(`SELECT order_status_at_edit FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(statusAtEdit).toBe('WAREHOUSED');
    const newPhone = psql(`SELECT new_data->>'recipient_phone' FROM public.zen_order_edit_log WHERE order_id='${ORDER}'`);
    expect(newPhone).toBe('010-9999-0000');
  });

  it('TC-B303-12: createOrder 실DB → edit_log에 action=CREATE + new_data 스냅샷 기록 (실 DB)', async () => {
    mockValidateUserAction.mockResolvedValue({
      supabase,
      user: { id: ADMIN_USER },
      profile: { id: ADMIN_USER, role: 'ADMIN', org_id: SHIPPER_ORG },
    });
    const { createOrder } = await import('@/app/actions/operations/orders');
    const result = await createOrder(buildPayload() as any) as any;
    const createdOrderId = result?.id as string;
    expect(createdOrderId).toBeTruthy();

    try {
      const action = psql(`SELECT action FROM public.zen_order_edit_log WHERE order_id='${createdOrderId}'`);
      expect(action).toBe('CREATE');
      const newName = psql(`SELECT new_data->>'recipient_name' FROM public.zen_order_edit_log WHERE order_id='${createdOrderId}'`);
      expect(newName).toBe('Updated Recipient');
      const newPhone = psql(`SELECT new_data->>'recipient_phone' FROM public.zen_order_edit_log WHERE order_id='${createdOrderId}'`);
      expect(newPhone).toBe('010-9999-0000');
      const oldIsNull = psql(`SELECT (old_data IS NULL)::text FROM public.zen_order_edit_log WHERE order_id='${createdOrderId}'`);
      expect(oldIsNull).toBe('true');
      const statusAtEdit = psql(`SELECT order_status_at_edit FROM public.zen_order_edit_log WHERE order_id='${createdOrderId}'`);
      expect(statusAtEdit).toBe('REGISTERED');
    } finally {
      // 생성된 오더 + 이력 정리 (후속 테스트 격리)
      psql(`
        DELETE FROM public.zen_order_edit_log WHERE order_id='${createdOrderId}';
        DELETE FROM public.zen_order_items WHERE order_id='${createdOrderId}';
        DELETE FROM public.zen_order_packages WHERE order_id='${createdOrderId}';
        DELETE FROM public.zen_orders WHERE id='${createdOrderId}';
      `);
    }
  });
});
