import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { buildOrderEditDefaults } from '@/lib/orders/edit-defaults';
import { buildCreateOrderPayload } from '@/lib/ups/label-mapping';

dotenv.config({ path: '.env.local' });

// TASK-B-346 PR② (Issue #1278): 수하인 회사명(`recipient_company`) 저장 정합성 실DB 검증.
//
// 등록(RPC create_order_atomic v7) → DB 저장 → 수정 저장 → 수정화면 복원 → SHXK 전송
// 전 구간을 **실제 로컬 DB로 왕복 검증**한다 (R-14, 모의 금지).
// 서버 액션(createOrder/updateOrder)과 RPC는 실제 실행하고, 결과는 psql로 zen_orders를
// 직접 SELECT해 단언한다.
//
// 케이스:
//   TC-346-01 신규 등록(RPC v7) — recipient_company가 zen_orders에 그대로 저장
//   TC-346-02 신규 등록 시 미입력 → NULL 저장 (빈 문자열 아님)
//   TC-346-03 수정 경로(updateHeader) — 값 변경/빈 값 저장 반영
//   TC-346-04 수정화면 복원(buildOrderEditDefaults) — 실DB 행 → 저장값 그대로
//   TC-346-05 SHXK 전송(buildCreateOrderPayload) — 실DB 값 → consignee_company / 미입력 시 키 생략
//
// ⚠️ 되돌리기 검증 (테스트 유효성):
//   (A) `supabase/migrations/20261113090100_task_b346_create_order_atomic_v7.sql`의
//       `recipient_company` insert 컬럼·값 제거 → `npx supabase db reset` 후 TC-346-01 FAIL.
//   (B) `src/app/actions/operations/orders.ts` headerData의 `recipient_company` 제거
//       → TC-346-03 FAIL (수정값이 DB에 반영되지 않음).
//   각각 `git checkout -- <파일>`(+ A는 db reset)로 복구 후 재실행 PASS 확인.

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
const USER = '34600000-0000-4000-8000-000000000001';
const ORG = '34600000-0000-4000-8000-000000000002';

function getPortId(type: string): string {
  return psql(`SELECT id FROM public.zen_ports WHERE type='${type}' LIMIT 1`);
}

function setupFixture() {
  cleanupFixture();
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES ('${ORG}', '346 Shipper Org', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
    INSERT INTO auth.users (id, email) VALUES ('${USER}', '346@test.kr')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES ('${USER}', '${ORG}', '346@test.kr', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
  `);
}

function cleanupFixture() {
  psql(`
    DELETE FROM public.zen_order_edit_log WHERE order_id IN (SELECT id FROM public.zen_orders WHERE created_by='${USER}');
    DELETE FROM public.zen_order_items WHERE order_id IN (SELECT id FROM public.zen_orders WHERE created_by='${USER}');
    DELETE FROM public.zen_order_packages WHERE order_id IN (SELECT id FROM public.zen_orders WHERE created_by='${USER}');
    DELETE FROM public.zen_orders WHERE created_by='${USER}';
    DELETE FROM public.zen_profiles WHERE id='${USER}';
    DELETE FROM auth.users WHERE id='${USER}';
    DELETE FROM public.zen_organizations WHERE id='${ORG}';
  `);
}

/** 실DB zen_orders.recipient_company 직접 조회 (NULL은 null로 구분) */
function getCompany(orderId: string): string | null {
  const out = psql(`SELECT coalesce(recipient_company, '<NULL>') FROM public.zen_orders WHERE id='${orderId}'`);
  return out === '<NULL>' ? null : out;
}

/** 실DB zen_orders 행 전체를 JSON으로 조회 (buildOrderEditDefaults/buildCreateOrderPayload 입력) */
function getOrderRow(orderId: string): Record<string, any> {
  return JSON.parse(psql(`SELECT row_to_json(o) FROM public.zen_orders o WHERE id='${orderId}'`));
}

/** 실DB 패키지+아이템 계층을 buildCreateOrderPayload 입력 형태로 조회 */
function getPackagesJson(orderId: string): Array<Record<string, any>> {
  const json = psql(
    `SELECT coalesce(json_agg(json_build_object(` +
      `'id', p.id, 'packing_unit', p.packing_unit, 'packing_count', p.packing_count,` +
      ` 'physical_box_count', p.physical_box_count, 'gross_weight', p.gross_weight, 'content_type', p.content_type,` +
      ` 'items', coalesce((SELECT json_agg(json_build_object(` +
      ` 'item_name', i.item_name, 'quantity', i.quantity, 'unit_price', i.unit_price,` +
      ` 'currency', i.currency, 'hs_code', i.hs_code, 'item_packing_unit', i.item_packing_unit) ORDER BY i.item_name)` +
      ` FROM public.zen_order_items i WHERE i.package_id = p.id), '[]'::json))), '[]'::json)` +
      ` FROM public.zen_order_packages p WHERE p.order_id='${orderId}'`
  );
  return JSON.parse(json);
}

function buildCreatePayload(company?: string) {
  return {
    order_type: 'B2B' as const,
    shipper_id: ORG,
    recipient_name: 'Recv B346',
    ...(company !== undefined ? { recipient_company: company } : {}),
    recipient_address: '123 Test St',
    recipient_phone: '01034603460',
    recipient_country_code: 'US',
    recipient_zipcode: '90001',
    recipient_city: 'LA',
    shipper_contact_phone: '01000000000',
    transport_mode: 'AIR' as const,
    origin_port_id: getPortId('AIR'),
    dest_port_id: getPortId('AIR'),
    packages: [
      {
        packing_unit: 'BOX',
        packing_count: 1,
        physical_box_count: 1,
        length: 10,
        width: 10,
        height: 10,
        gross_weight: 5,
        special_cargo_type: 'NONE',
        content_type: 'GENERAL',
        items: [{ item_name: 'Item A', quantity: 1, unit_price: 10, currency: 'USD', item_packing_unit: 'PCE' }],
      },
    ],
  };
}

describe('TASK-B-346 PR②: 수하인 회사명 저장 정합성 실DB 검증 (Issue #1278)', () => {
  let supabase: SupabaseClient;

  beforeEach(async () => {
    if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in env');
    supabase = createClient(URL, SERVICE_KEY);
    setupFixture();
    mockValidateUserAction.mockResolvedValue({
      supabase,
      user: { id: USER },
      profile: { id: USER, role: 'SHIPPER', org_id: ORG },
    });
  });

  afterAll(() => {
    cleanupFixture();
  });

  it('TC-346-01: 신규 등록(RPC create_order_atomic v7) — recipient_company가 DB에 그대로 저장', async () => {
    const { createOrder } = await import('@/app/actions/operations/orders');
    const result = await createOrder(buildCreatePayload('Acme Trading Co') as any);
    expect(result.id).toBeTruthy();

    // RPC의 p_payload->>'recipient_company' 매핑까지 포함 — 실DB 직접 SELECT로 단언
    expect(getCompany(result.id)).toBe('Acme Trading Co');
  });

  it('TC-346-02: 신규 등록 시 회사명 미입력 → NULL 저장', async () => {
    const { createOrder } = await import('@/app/actions/operations/orders');
    const result = await createOrder(buildCreatePayload() as any);
    expect(result.id).toBeTruthy();

    expect(getCompany(result.id)).toBeNull();
  });

  it('TC-346-03: 수정 경로(updateOrder → updateHeader) — 값 변경·빈 값이 DB에 반영', async () => {
    const { createOrder, updateOrder } = await import('@/app/actions/operations/orders');
    const created = await createOrder(buildCreatePayload('First Co') as any);
    expect(created.id).toBeTruthy();
    expect(getCompany(created.id)).toBe('First Co');

    // 값 변경
    const r1 = await updateOrder(created.id, buildCreatePayload('Second Co') as any);
    expect(r1.success).toBe(true);
    expect(getCompany(created.id)).toBe('Second Co');

    // 빈 값으로 비우기 (폼에서 지운 경우)
    const r2 = await updateOrder(created.id, buildCreatePayload('') as any);
    expect(r2.success).toBe(true);
    expect(getCompany(created.id)).toBe('');
  });

  it('TC-346-04: 수정화면 복원(buildOrderEditDefaults) — 실DB 행의 회사명을 그대로 반환', async () => {
    const { createOrder } = await import('@/app/actions/operations/orders');
    const created = await createOrder(buildCreatePayload('Restore Me Ltd') as any);
    expect(created.id).toBeTruthy();

    const defaults = buildOrderEditDefaults(getOrderRow(created.id)) as any;
    expect(defaults.recipient_company).toBe('Restore Me Ltd');
  });

  it('TC-346-05: SHXK 전송(buildCreateOrderPayload) — 실DB 값 → consignee_company / 미입력 시 키 생략', async () => {
    const { createOrder } = await import('@/app/actions/operations/orders');
    const created = await createOrder(buildCreatePayload('Acme Trading Co') as any);
    expect(created.id).toBeTruthy();

    const payload = buildCreateOrderPayload(
      'SHP-CODE',
      getOrderRow(created.id),
      'US',
      getPackagesJson(created.id),
      { name: 'SNTL', country: 'KR' },
    );
    expect((payload.consignee as any).consignee_company).toBe('Acme Trading Co');

    // 회사명 미입력 오더 → 키 자체가 없어야 한다
    const created2 = await createOrder(buildCreatePayload() as any);
    const payload2 = buildCreateOrderPayload(
      'SHP-CODE',
      getOrderRow(created2.id),
      'US',
      getPackagesJson(created2.id),
      { name: 'SNTL', country: 'KR' },
    );
    expect(payload2.consignee as any).not.toHaveProperty('consignee_company');
  });
});
