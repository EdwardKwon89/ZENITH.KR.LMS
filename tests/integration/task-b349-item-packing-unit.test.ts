import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { buildOrderEditDefaults } from '@/lib/orders/edit-defaults';
import { buildInvoiceFromItems } from '@/lib/ups/label-mapping';
import { PACKING_UNIT_OPTIONS } from '@/lib/orders/packing-units';

dotenv.config({ path: '.env.local' });

// TASK-B-349 (Issue #1281): 아이템 Packing Unit(`item_packing_unit`) 저장 정합성 실DB 검증.
//
// 등록 → 저장 → 수정화면 표시 → 수정 저장 → SHXK unit_code 전송 전 구간에서
// 선택값이 그대로 유지되는지 **실제 로컬 DB로 왕복 검증**한다 (R-14, 모의 금지).
// 서버 액션(createOrder/updateOrder)과 RPC(create_order_atomic)는 실제 실행하고,
// 결과는 psql로 zen_order_items / zen_order_packages를 직접 SELECT해 단언한다.
//
// 케이스:
//   TC-349-01 신규 등록(RPC) — 아이템3개 상이 단위(PCE/SET/KG) 저장 (의심지역 (d) jsonb 키 매핑 포함)
//   TC-349-02 수정 경로(insertItems) — 단위 보존(SET→SET)·변경(PCE→MTR)
//   TC-349-03 수정화면 복원(buildOrderEditDefaults) — 실DB 행 → 저장값 그대로 + 레거시(EA/PCS/CTN/널) 반환값 기록
//   TC-349-04 SHXK 전송(buildInvoiceFromItems) — 실DB 단위와 unit_code 일치 + 목록 밖 값 PCE 폴백 고정
//   TC-349-05 패키지 packing_unit(BOX) ↔ 아이템 item_packing_unit 상호 덮어쓰기 없음
//
// ⚠️ 되돌리기 검증 (테스트 유효성):
//   (A) `supabase/migrations/20260816110000_task_b305_create_order_atomic_v6.sql`의
//       `item_packing_unit` insert 컬럼·값 제거 → `supabase db reset` 후 TC-349-01 FAIL
//   (B) `src/app/actions/operations/orders.ts` itemsToInsert의 `item_packing_unit: item.item_packing_unit` 제거
//       → TC-349-02 FAIL (컬럼 기본값 NULL이라 보존/변경 단언 모두 깨짐)
//   각각 `git checkout -- <파일>`로 복구 후 재실행 PASS 확인.

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
const USER = '34900000-0000-4000-8000-000000000001';
const ORG = '34900000-0000-4000-8000-000000000002';

function getPortId(type: string): string {
  return psql(`SELECT id FROM public.zen_ports WHERE type='${type}' LIMIT 1`);
}

function setupFixture() {
  cleanupFixture();
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES ('${ORG}', '349 Shipper Org', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
    INSERT INTO auth.users (id, email) VALUES ('${USER}', '349@test.kr')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES ('${USER}', '${ORG}', '349@test.kr', 'SHIPPER', 'ACTIVE')
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

/** 실DB의 아이템 행을 {item_name, item_packing_unit} 배열로 조회 (item_name 오름차순) */
function getItemsJson(orderId: string): Array<{ item_name: string; item_packing_unit: string | null }> {
  const json = psql(
    `SELECT coalesce(json_agg(json_build_object('item_name', i.item_name, 'item_packing_unit', i.item_packing_unit) ORDER BY i.item_name), '[]'::json)` +
      ` FROM public.zen_order_items i WHERE i.order_id='${orderId}'`
  );
  return JSON.parse(json);
}

/** 실DB의 패키지+아이템 계층을 buildOrderEditDefaults/buildInvoiceFromItems 입력 형태로 조회 */
function getPackagesJson(orderId: string): Array<Record<string, any>> {
  const json = psql(
    `SELECT coalesce(json_agg(json_build_object(` +
      `'id', p.id, 'packing_unit', p.packing_unit, 'packing_count', p.packing_count,` +
      ` 'gross_weight', p.gross_weight, 'content_type', p.content_type,` +
      ` 'items', coalesce((SELECT json_agg(json_build_object(` +
      ` 'item_name', i.item_name, 'quantity', i.quantity, 'unit_price', i.unit_price,` +
      ` 'currency', i.currency, 'hs_code', i.hs_code, 'item_packing_unit', i.item_packing_unit) ORDER BY i.item_name)` +
      ` FROM public.zen_order_items i WHERE i.package_id = p.id), '[]'::json))), '[]'::json)` +
      ` FROM public.zen_order_packages p WHERE p.order_id='${orderId}'`
  );
  return JSON.parse(json);
}

function buildCreatePayload(items: Array<{ name: string; unit: string }>) {
  return {
    order_type: 'B2B' as const,
    shipper_id: ORG,
    recipient_name: 'Recv B349',
    recipient_address: '123 Test St',
    recipient_phone: '01034903490',
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
        items: items.map((it) => ({
          item_name: it.name,
          quantity: 1,
          unit_price: 10,
          currency: 'USD',
          item_packing_unit: it.unit,
        })),
      },
    ],
  };
}

describe('TASK-B-349: 아이템 Packing Unit 저장 정합성 실DB 검증 (Issue #1281)', () => {
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

  it('TC-349-01: 신규 등록(RPC create_order_atomic) — 상이 단위 PCE/SET/KG가 DB에 정확히 저장', async () => {
    const { createOrder } = await import('@/app/actions/operations/orders');
    const result = await createOrder(
      buildCreatePayload([
        { name: 'Item A', unit: 'PCE' },
        { name: 'Item B', unit: 'SET' },
        { name: 'Item C', unit: 'KG' },
      ]) as any
    );
    expect(result.id).toBeTruthy();

    // RPC의 jsonb 키 매핑(의심지역 d)까지 포함 — payload의 단위가 DB에 그대로 도착해야 함
    expect(getItemsJson(result.id)).toEqual([
      { item_name: 'Item A', item_packing_unit: 'PCE' },
      { item_name: 'Item B', item_packing_unit: 'SET' },
      { item_name: 'Item C', item_packing_unit: 'KG' },
    ]);
  });

  it('TC-349-02: 수정 경로(insertItems) — 단위 보존(SET→SET)·변경(PCE→MTR)이 DB에 반영', async () => {
    const { createOrder, updateOrder } = await import('@/app/actions/operations/orders');
    const created = await createOrder(buildCreatePayload([{ name: 'Item U', unit: 'SET' }]) as any);
    expect(created.id).toBeTruthy();

    // 1차: 동일 단위로 재저장 → 보존
    const r1 = await updateOrder(created.id, buildCreatePayload([{ name: 'Item U', unit: 'SET' }]) as any);
    expect(r1.success).toBe(true);
    expect(getItemsJson(created.id)).toEqual([{ item_name: 'Item U', item_packing_unit: 'SET' }]);

    // 2차: 단위 변경 → 변경값 저장
    const r2 = await updateOrder(created.id, buildCreatePayload([{ name: 'Item U', unit: 'MTR' }]) as any);
    expect(r2.success).toBe(true);
    expect(getItemsJson(created.id)).toEqual([{ item_name: 'Item U', item_packing_unit: 'MTR' }]);
  });

  it('TC-349-03: 수정화면 복원(buildOrderEditDefaults) — 실DB 행 → 저장값 그대로 + 레거시/널 반환값 기록', async () => {
    const { createOrder } = await import('@/app/actions/operations/orders');
    const created = await createOrder(
      buildCreatePayload([
        { name: 'Item A', unit: 'PCE' },
        { name: 'Item B', unit: 'SET' },
        { name: 'Item C', unit: 'KG' },
      ]) as any
    );
    expect(created.id).toBeTruthy();

    // 레거시·비정상 저장분을 DB에 직접 심는다 (B-337 이전값 EA·PCS, 목록 밖 CTN, 널)
    psql(`UPDATE public.zen_order_items SET item_packing_unit='EA' WHERE order_id='${created.id}' AND item_name='Item A'`);
    psql(`UPDATE public.zen_order_items SET item_packing_unit='PCS' WHERE order_id='${created.id}' AND item_name='Item B'`);
    psql(
      `INSERT INTO public.zen_order_items (order_id, package_id, item_name, quantity, unit_price, currency, item_packing_unit)
       SELECT order_id, package_id, 'Legacy CTN', 1, 1, 'USD', 'CTN' FROM public.zen_order_items WHERE order_id='${created.id}' LIMIT 1`
    );
    psql(
      `INSERT INTO public.zen_order_items (order_id, package_id, item_name, quantity, unit_price, currency, item_packing_unit)
       SELECT order_id, package_id, 'Legacy Null', 1, 1, 'USD', NULL FROM public.zen_order_items WHERE order_id='${created.id}' LIMIT 1`
    );

    const packages = getPackagesJson(created.id);
    expect(packages.length).toBe(1);

    // 실DB 행 → 수정화면 기본값 생성 — 저장값이 그대로 복원되어야 함
    const defaults = buildOrderEditDefaults({ transport_mode: 'AIR', packages } as any) as any;
    const restored: Record<string, unknown> = Object.fromEntries(
      (defaults.packages[0].items as any[]).map((it) => [it.item_name, it.item_packing_unit])
    );
    expect(restored).toEqual({
      'Item A': 'EA', // 레거시 EA — ?? 기본값으로 덮이지 않고 그대로 복원
      'Item B': 'PCS', // 레거시 PCS — 그대로 복원
      'Item C': 'KG',
      'Legacy CTN': 'CTN', // 목록 밖 값도 보존(표시 문제와 별개 — 아래 옵션 목록 단언)
      'Legacy Null': 'PCE', // 널은 PCE 폴백 (edit-defaults.ts `?? 'PCE'`)
    });

    // (c) 판정 근거: EA·PCS는 현재 SHXK 정본7개 옵션에 포함 → select 표시 전환 문제 없음.
    //     목록 밖 값(CTN)은 옵션에 없어 화면 표시 시첫 옵션으로 바뀔 수 있음(저장값 보존과는 별개).
    const optionValues = PACKING_UNIT_OPTIONS.map((o) => o.value);
    expect(optionValues).toEqual(expect.arrayContaining(['PCE', 'SET', 'MTR', 'PCS', 'EA', 'YDS', 'KG']));
    expect(optionValues).not.toContain('CTN');
  });

  it('TC-349-04: SHXK 전송(buildInvoiceFromItems) — 실DB 단위와 unit_code 일치 + 목록 밖 PCE 폴백 고정', async () => {
    const { createOrder } = await import('@/app/actions/operations/orders');
    const created = await createOrder(
      buildCreatePayload([
        { name: 'Item A', unit: 'PCE' },
        { name: 'Item B', unit: 'SET' },
        { name: 'Item C', unit: 'KG' },
      ]) as any
    );
    expect(created.id).toBeTruthy();

    // 실DB에서 읽은 패키지/아이템 → SHXK invoice — 단위 그대로 전달
    const packages = getPackagesJson(created.id);
    const invoice = buildInvoiceFromItems(packages);
    const unitByName = Object.fromEntries(invoice.map((row) => [row.invoice_enname, row.unit_code]));
    expect(unitByName).toEqual({ 'Item A': 'PCE', 'Item B': 'SET', 'Item C': 'KG' });

    // 현행 동작 고정: 목록 밖 값은 조용히 PCE 폴백 (label-mapping.ts resolveShxkUnitCode)
    const fallback = buildInvoiceFromItems([
      { items: [{ item_name: 'Odd', quantity: 1, unit_price: 1, item_packing_unit: 'CTN' }] },
    ]);
    expect(fallback[0].unit_code).toBe('PCE');

    // TASK-B-337 현행 동작: 목록 내 레거시 EA는 폴백 없이 그대로 전송
    const legacy = buildInvoiceFromItems([
      { items: [{ item_name: 'Old', quantity: 1, unit_price: 1, item_packing_unit: 'EA' }] },
    ]);
    expect(legacy[0].unit_code).toBe('EA');
  });

  it('TC-349-05: 패키지 packing_unit(BOX)과 아이템 item_packing_unit은 서로 덮어쓰지 않는다', async () => {
    const { createOrder, updateOrder } = await import('@/app/actions/operations/orders');
    const units = [
      { name: 'Item A', unit: 'PCE' },
      { name: 'Item B', unit: 'SET' },
      { name: 'Item C', unit: 'KG' },
    ];
    const created = await createOrder(buildCreatePayload(units) as any);
    expect(created.id).toBeTruthy();

    // 등록 직후: 패키지는 BOX / 아이템은 각자 단위 (상호 침범 없음)
    expect(psql(`SELECT packing_unit FROM public.zen_order_packages WHERE order_id='${created.id}'`)).toBe('BOX');
    expect(getItemsJson(created.id).map((r) => r.item_packing_unit)).toEqual(['PCE', 'SET', 'KG']);

    // 수정 저장 후에도 패키지 BOX 유지 + 아이템 단위 불변
    const r = await updateOrder(created.id, buildCreatePayload(units) as any);
    expect(r.success).toBe(true);
    expect(psql(`SELECT packing_unit FROM public.zen_order_packages WHERE order_id='${created.id}'`)).toBe('BOX');
    expect(getItemsJson(created.id).map((r2) => r2.item_packing_unit)).toEqual(['PCE', 'SET', 'KG']);
  });
});
