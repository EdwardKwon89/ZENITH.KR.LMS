import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

// TASK-B-286 (Issue #1075 / DEF-B-056, Critical): zen_order_items INSERT RLS 정책 누락으로
// 오더 수정 저장 시 아이템 전량 소실 회귀 테스트.
//
// 실제 로컬 DB(docker supabase_db_ZENITH_LMS_001)에 아이템 포함 오더를 세팅하고, 실제
// updateOrder() 서버 액션을 **화주 조직 소속 authenticated 사용자**로 실행한 뒤 DB에 아이템이
// 실제로 남아있는지 직접 조회해 검증한다. (JWT 인증 클라이언트 사용 — service_role 우회 없이
// RLS 정책을 실제로 통과해야만 성공)
//
// 핵심: updateOrder()가 패키지 delete+reinsert 시 ON DELETE CASCADE로 기존 아이템을 지우고,
// 신규 아이템 INSERT가 RLS 정책 부재로 조용히 실패하던 결함 — 정책(20260811080000) 적용 후
// 아이템이 보존되어야 한다.
//
// 되돌리기 검증: INSERT 정책을 제거하면 updateOrder()가 throw하거나 아이템이 소실됨을
// 재현할 수 있어야 한다 (아래 TC-286-04가 그 역할).

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
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
function b64urlBytes(b: Buffer): string {
  return Buffer.from(b).toString('base64url');
}
// 로컬 Supabase JWT 서명으로 화주 조직 소속 사용자 인증 토큰 생성
function makeJwt(sub: string, email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub, role: 'authenticated', email, iat: now, exp: now + 3600,
    aud: 'authenticated', iss: 'supabase',
    app_metadata: { provider: 'email', role: 'SHIPPER' },
    user_metadata: {},
  });
  const sig = b64urlBytes(crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

// ── mocks ────────────────────────────────────────────────────────────────
const mockValidateUserAction = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: mockValidateUserAction,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));

// 테스트 전용 UUID 상수
const SHIPPER_USER = '28600000-0000-4000-8000-000000000001'; // 화주 조직 소속 사용자
const ADMIN_ORG = '28600000-0000-4000-8000-000000000002';
const SHIPPER_ORG = '28600000-0000-4000-8000-000000000003';
const ORDER_REG = '28600000-0000-4000-8000-000000000010'; // REGISTERED (기존 수정 경로)
const ORDER_WARE = '28600000-0000-4000-8000-000000000011'; // WAREHOUSED+UPS (부분 수정 경로)

function setupFixture() {
  psql(`
    DELETE FROM public.zen_order_edit_log WHERE order_id IN ('${ORDER_REG}','${ORDER_WARE}');
    DELETE FROM public.zen_order_items WHERE order_id IN ('${ORDER_REG}','${ORDER_WARE}');
    DELETE FROM public.zen_order_packages WHERE order_id IN ('${ORDER_REG}','${ORDER_WARE}');
    DELETE FROM public.zen_orders WHERE id IN ('${ORDER_REG}','${ORDER_WARE}');
    DELETE FROM public.zen_profiles WHERE id IN ('${SHIPPER_USER}');
    DELETE FROM auth.users WHERE id IN ('${SHIPPER_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${ADMIN_ORG}','${SHIPPER_ORG}');
  `);
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${ADMIN_ORG}', '286 Admin Org', 'CORPORATE', 'ACTIVE'),
      ('${SHIPPER_ORG}', '286 Shipper Org', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    INSERT INTO auth.users (id, email) VALUES
      ('${SHIPPER_USER}', '286-shipper@test.kr')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${SHIPPER_USER}', '${SHIPPER_ORG}', '286-shipper@test.kr', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
    INSERT INTO public.zen_orders (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, cargo_details) VALUES
      ('${ORDER_REG}', 'ZEN-286-REG', '${SHIPPER_ORG}', NULL, 'AIR', 'REGISTERED', 'Recv1', '010-1', '{}'::jsonb),
      ('${ORDER_WARE}', 'ZEN-286-WARE', '${SHIPPER_ORG}', NULL, 'UPS', 'WAREHOUSED', 'Recv2', '010-2', '{}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    INSERT INTO public.zen_order_packages (id, order_id, packing_unit, packing_count, gross_weight, length, width, height, content_type, special_cargo_type, physical_box_count) VALUES
      ('28600000-0000-4000-8000-000000000020', '${ORDER_REG}', 'BOX', 1, 5, 10, 10, 10, 'NONDOC', 'NONE', 1),
      ('28600000-0000-4000-8000-000000000021', '${ORDER_WARE}', 'BOX', 1, 5, 10, 10, 10, 'NONDOC', 'NONE', 1)
    ON CONFLICT (id) DO UPDATE SET gross_weight = EXCLUDED.gross_weight;
    INSERT INTO public.zen_order_items (order_id, package_id, item_name, quantity, unit_price, currency) VALUES
      ('${ORDER_REG}', '28600000-0000-4000-8000-000000000020', 'Widget REG', 1, 100, 'USD'),
      ('${ORDER_WARE}', '28600000-0000-4000-8000-000000000021', 'Widget WARE', 1, 100, 'USD')
    ON CONFLICT (id) DO NOTHING;
  `);
}

function cleanupFixture() {
  psql(`
    DELETE FROM public.zen_order_edit_log WHERE order_id IN ('${ORDER_REG}','${ORDER_WARE}');
    DELETE FROM public.zen_order_items WHERE order_id IN ('${ORDER_REG}','${ORDER_WARE}');
    DELETE FROM public.zen_order_packages WHERE order_id IN ('${ORDER_REG}','${ORDER_WARE}');
    DELETE FROM public.zen_orders WHERE id IN ('${ORDER_REG}','${ORDER_WARE}');
    DELETE FROM public.zen_profiles WHERE id IN ('${SHIPPER_USER}');
    DELETE FROM auth.users WHERE id IN ('${SHIPPER_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${ADMIN_ORG}','${SHIPPER_ORG}');
  `);
}

function getItemCount(orderId: string): string {
  return psql(`SELECT count(*) FROM public.zen_order_items WHERE order_id='${orderId}'`);
}

function buildPayload(orderId: string, overrides: Record<string, unknown> = {}) {
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
    transport_mode: orderId === ORDER_WARE ? 'UPS' as const : 'AIR' as const,
    ...(orderId === ORDER_WARE
      ? { ups_product_code: 'WW_EXPEDITED', incoterms: 'DDP' as const }
      : { origin_port_id: '550e8400-e29b-41d4-a716-446655440001', dest_port_id: '550e8400-e29b-41d4-a716-446655440002' }),
    packages: [
      {
        packing_unit: 'BOX',
        packing_count: 1,
        physical_box_count: 1,
        length: 20,
        width: 30,
        height: 40,
        gross_weight: 50,
        special_cargo_type: 'NONE',
        content_type: 'NONDOC',
        items: [{ item_name: `Item ${orderId}`, quantity: 2, unit_price: 200, currency: 'USD' }],
      },
    ],
    ...overrides,
  };
}

// 화주 조직 소속 authenticated 클라이언트 (RLS 실제 평가)
function makeOrgMemberClient(): SupabaseClient {
  if (!ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required in env');
  const jwt = makeJwt(SHIPPER_USER, '286-shipper@test.kr');
  return createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

describe('TASK-B-286: zen_order_items RLS INSERT 누락 — 아이템 소실 (Issue #1075 / DEF-B-056)', () => {
  beforeEach(() => {
    setupFixture();
    // updateOrder()가 사용하는 클라이언트 = 화주 조직 소속 authenticated (RLS 실제 평가)
    const client = makeOrgMemberClient();
    mockValidateUserAction.mockResolvedValue({
      supabase: client,
      user: { id: SHIPPER_USER },
      profile: { id: SHIPPER_USER, role: 'SHIPPER', org_id: SHIPPER_ORG },
    });
  });

  afterAll(() => {
    cleanupFixture();
  });

  it('TC-286-01: REGISTERED 오더 수정 저장 후 아이템 보존 (기존 수정 경로, authenticated RLS)', async () => {
    const before = getItemCount(ORDER_REG);
    expect(before).toBe('1');

    const { updateOrder } = await import('@/app/actions/operations/orders');
    const result = await updateOrder(ORDER_REG, buildPayload(ORDER_REG) as any);
    expect(result.success).toBe(true);

    // 저장 후 아이템이 실제로 남아있어야 함 (DEF-B-056 버그: 0건 소실)
    const after = getItemCount(ORDER_REG);
    expect(after).toBe('1');
  });

  it('TC-286-02: WAREHOUSED+UPS 부분 수정 후에도 아이템 보존 (authenticated RLS)', async () => {
    const before = getItemCount(ORDER_WARE);
    expect(before).toBe('1');

    const { updateOrder } = await import('@/app/actions/operations/orders');
    const result = await updateOrder(ORDER_WARE, buildPayload(ORDER_WARE) as any);
    expect(result.success).toBe(true);

    const after = getItemCount(ORDER_WARE);
    expect(after).toBe('1');
  });

  it('TC-286-03: 아이템 내용이 실제로 갱신됨 (item_name 반영)', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');
    const result = await updateOrder(ORDER_REG, buildPayload(ORDER_REG) as any);
    expect(result.success).toBe(true);

    const itemName = psql(`SELECT item_name FROM public.zen_order_items WHERE order_id='${ORDER_REG}' LIMIT 1`);
    expect(itemName).toBe('Item 28600000-0000-4000-8000-000000000010');
  });

  it('TC-286-04: INSERT 정책 제거 시 updateOrder가 throw (되돌리기 검증)', async () => {
    // 1) INSERT 정책 제거 (DEF-B-056 원래 버그 상태 재현)
    psql(`
      DROP POLICY IF EXISTS "Admins can insert order items" ON public.zen_order_items;
      DROP POLICY IF EXISTS "Members can insert items for own organization orders" ON public.zen_order_items;
    `);

    // 2) updateOrder()가 아이템 저장 실패로 throw해야 함 (방어 코드)
    const { updateOrder } = await import('@/app/actions/operations/orders');
    await expect(updateOrder(ORDER_REG, buildPayload(ORDER_REG) as any)).rejects.toThrow(/아이템 저장 실패/);

    // 3) 복원
    psql(`
      CREATE POLICY "Admins can insert order items" ON public.zen_order_items FOR INSERT TO authenticated
      WITH CHECK (get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text]));
      CREATE POLICY "Members can insert items for own organization orders" ON public.zen_order_items FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.zen_orders WHERE zen_orders.id = zen_order_items.order_id AND is_org_member(auth.uid(), zen_orders.shipper_id)));
    `);

    // 4) 복원 후 다시 저장 성공 + 아이템 보존 확인
    const restored = await updateOrder(ORDER_REG, buildPayload(ORDER_REG) as any);
    expect(restored.success).toBe(true);
    expect(getItemCount(ORDER_REG)).toBe('1');
  });
});
