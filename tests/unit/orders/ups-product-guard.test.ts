import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder, updateOrder, saveOrderRateSnapshot } from '@/app/actions/orders';
import { assertActiveUpsProduct } from '@/lib/orders/ups-product-guard';
import { validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';

// ─── TASK-B-336 / Issue #1247 / DEF-B-151 회귀 테스트 ────────────────────────
//
// 결함: createOrder/updateOrder가 미존재·비활성 ups_product_code를 그대로 통과시켜
// 오더가 생성된 뒤 saveOrderRateSnapshot이 조용히 스킵 → 운임 스냅샷 누락(정산 불가).
// 조치: 오더 생성(RPC) 이전에 zen_ups_products(product_code + is_active=true) 검증으로
//       거부하고, 스냅샷 스킵 지점에 경고 로그를 남긴다.
//
// 주의(작업 지시 1·2): mock이 "항상 통과"하는 vacuous 테스트가 되지 않도록,
// 상품코드 mock이 전달된 product_code를 실제로 비교하고 is_active 조건 인자를 캡처한다.

const h = vi.hoisted(() => {
  const createOrderViaRpc = vi.fn();
  const findById = vi.fn();
  const getItemsByOrderId = vi.fn();
  const updateHeader = vi.fn();
  const getPackagesByOrderId = vi.fn();
  const getItemsFullByOrderId = vi.fn();
  const deleteItemsByOrderId = vi.fn();
  const deletePackagesByOrderId = vi.fn();
  const insertPackage = vi.fn();
  const insertItems = vi.fn();

  class OrderRepository {
    createOrderViaRpc = createOrderViaRpc;
    findById = findById;
    getItemsByOrderId = getItemsByOrderId;
    updateHeader = updateHeader;
    getPackagesByOrderId = getPackagesByOrderId;
    getItemsFullByOrderId = getItemsFullByOrderId;
    deleteItemsByOrderId = deleteItemsByOrderId;
    deletePackagesByOrderId = deletePackagesByOrderId;
    insertPackage = insertPackage;
    insertItems = insertItems;
  }
  class AdminRepository {}

  return {
    createOrderViaRpc, findById, getItemsByOrderId, updateHeader,
    getPackagesByOrderId, getItemsFullByOrderId, deleteItemsByOrderId,
    deletePackagesByOrderId, insertPackage, insertItems,
    OrderRepository, AdminRepository,
  };
});

vi.mock('@/lib/repositories', () => ({
  OrderRepository: h.OrderRepository,
  AdminRepository: h.AdminRepository,
}));

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/app/actions/master', () => ({
  generateOrderNo: vi.fn().mockResolvedValue('ZEN-2026-000001'),
  generateMasterOrderNo: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
  }),
}));

vi.mock('@/app/actions/ups/freight', () => ({
  estimateUpsFreight: vi.fn().mockResolvedValue({
    platform: { totalSellingPrice: 100, currency: 'USD' },
    agency: null,
    shipper: null,
  }),
}));
vi.mock('@/app/actions/operations/inventory', () => ({ syncInventoryFromOrder: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/app/actions/finance', () => ({ generateInvoicesForOrder: vi.fn() }));

const ACTIVE_CODE = 'WW_SAVER_NONDOC';

// zen_ups_products 체인 mock — 전달된 product_code/is_active를 실제로 비교한다.
function buildProductsChain(opts: { activeCode?: string; dbError?: { message: string } | null } = {}) {
  const { activeCode = ACTIVE_CODE, dbError = null } = opts;
  const filters: Record<string, unknown> = {};
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn((col: string, val: unknown) => {
      filters[col] = val;
      return chain;
    }),
    maybeSingle: vi.fn(() => {
      if (dbError) return Promise.resolve({ data: null, error: dbError });
      const match = filters.product_code === activeCode && filters.is_active === true;
      return Promise.resolve({ data: match ? { id: 'prod-1', product_code: activeCode } : null, error: null });
    }),
  };
  return { chain, filters };
}

function buildSupabase(opts: { activeCode?: string; fromProducts?: { chain: any; filters: Record<string, unknown> } } = {}) {
  const products = opts.fromProducts ?? buildProductsChain({ activeCode: opts.activeCode });
  const fromCalls: string[] = [];
  const from = vi.fn((table: string) => {
    fromCalls.push(table);
    if (table === 'zen_ups_products') return products.chain;
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      // TASK-B-339: updateOrder의 UPS 라벨 가드(hasActiveUpsLabel)가 zen_ups_labels에
      //   .limit(1).maybeSingle() 체인을 사용한다 — 체인 호환용으로만 추가(단언 무관).
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    };
  });
  const supabase = { from, rpc: vi.fn().mockResolvedValue({ data: { id: 'new-order-id' }, error: null }) };
  return { supabase, products, fromCalls, from };
}

function makeUpsPayloadInput(assign: { ups_product_code?: string; transport_mode?: 'UPS' | 'AIR' } = {}) {
  const { ups_product_code = 'WW_EXPEDITED', transport_mode = 'UPS' } = assign;
  return {
    order_type: 'B2C_ECOM' as const,
    shipper_id: '4bd7d15a-9042-4b72-8822-68c13000b001',
    recipient_name: 'John Doe',
    recipient_address: '456 Oak St',
    recipient_phone: '01055556666',
    recipient_country_code: 'US',
    recipient_zipcode: '90001',
    recipient_city: 'Los Angeles',
    shipper_contact_phone: '01000000000',
    transport_mode,
    origin_port_id: '550e8400-e29b-41d4-a716-446655440001',
    dest_port_id: '550e8400-e29b-41d4-a716-446655440002',
    ups_product_code,
    incoterms: 'DDP' as const,
    packages: [
      {
        packing_unit: 'BOX',
        packing_count: 1,
        gross_weight: 5,
        items: [{ item_name: 'Widget', quantity: 1, unit_price: 50, currency: 'USD', item_packing_unit: 'UNIT', hs_code: '8471300000' }],
      },
    ],
  };
}

describe('TASK-B-336: assertActiveUpsProduct (Issue #1247 / DEF-B-151)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-336-01: 활성 코드 통과 + 쿼리에 product_code·is_active=true 조건이 포함됨', async () => {
    const { chain, filters } = buildProductsChain({ activeCode: ACTIVE_CODE });
    const supabase = { from: vi.fn(() => chain) };

    await expect(assertActiveUpsProduct(supabase as any, ACTIVE_CODE)).resolves.toBeUndefined();

    expect(filters.product_code).toBe(ACTIVE_CODE);
    expect(filters.is_active).toBe(true);
  });

  it('TC-336-02: 미존재 코드(WWE) → 거부 메시지(코드 포함)로 throw', async () => {
    const { chain } = buildProductsChain({ activeCode: ACTIVE_CODE });
    const supabase = { from: vi.fn(() => chain) };

    await expect(assertActiveUpsProduct(supabase as any, 'WWE')).rejects.toThrow(
      '존재하지 않거나 비활성화된 UPS 상품 코드입니다: WWE'
    );
  });

  it('TC-336-03: DB 조회 error → "없음"과 구분된 DB 오류로 throw', async () => {
    const { chain } = buildProductsChain({ dbError: { message: 'connection reset' } });
    const supabase = { from: vi.fn(() => chain) };

    await expect(assertActiveUpsProduct(supabase as any, ACTIVE_CODE)).rejects.toThrow(
      'UPS 상품 코드 검증 중 오류가 발생했습니다: connection reset'
    );
  });
});

describe('TASK-B-336: createOrder 사전 거부 (RPC 이전)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.createOrderViaRpc.mockResolvedValue({ data: { id: 'new-order-id' }, error: null });
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-123' },
      profile: { id: 'user-123', org_id: 'org-1', role: 'SHIPPER' },
      supabase: null,
    });
  });

  it('TC-336-04: 미존재 코드 → RPC(오더 생성) 이전에 throw, createOrderViaRpc 0회', async () => {
    const { supabase } = buildSupabase({ activeCode: ACTIVE_CODE });
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-123' },
      profile: { id: 'user-123', org_id: 'org-1', role: 'SHIPPER' },
      supabase,
    });

    await expect(createOrder(makeUpsPayloadInput({ ups_product_code: 'WWE' }) as any)).rejects.toThrow(
      '존재하지 않거나 비활성화된 UPS 상품 코드입니다: WWE'
    );

    expect(h.createOrderViaRpc).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('TC-336-05: 실존 활성 코드 → 검증 통과 후 오더 생성(RPC) 1회', async () => {
    const { supabase } = buildSupabase({ activeCode: ACTIVE_CODE });
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-123' },
      profile: { id: 'user-123', org_id: 'org-1', role: 'SHIPPER' },
      supabase,
    });

    await createOrder(makeUpsPayloadInput({ ups_product_code: ACTIVE_CODE }) as any);

    expect(h.createOrderViaRpc).toHaveBeenCalledTimes(1);
  });

  it('TC-336-06: 비UPS(AIR) 오더 → zen_ups_products 조회 자체가 없음', async () => {
    const { supabase, fromCalls } = buildSupabase({ activeCode: ACTIVE_CODE });
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-123' },
      profile: { id: 'user-123', org_id: 'org-1', role: 'SHIPPER' },
      supabase,
    });

    await createOrder(makeUpsPayloadInput({ transport_mode: 'AIR', ups_product_code: 'WWE' }) as any);

    expect(fromCalls).not.toContain('zen_ups_products');
    expect(h.createOrderViaRpc).toHaveBeenCalledTimes(1);
  });
});

describe('TASK-B-336: updateOrder 조건부 검증', () => {
  const baseOrder = {
    id: 'order-1',
    status: 'REGISTERED',
    transport_mode: 'UPS',
    ups_product_code: ACTIVE_CODE,
    shipper_id: '4bd7d15a-9042-4b72-8822-68c13000b001',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    h.findById.mockResolvedValue({ data: { ...baseOrder }, error: null });
    h.getItemsByOrderId.mockResolvedValue({ data: [] });
    h.getPackagesByOrderId.mockResolvedValue({ data: [] });
    h.getItemsFullByOrderId.mockResolvedValue({ data: [] });
    h.updateHeader.mockResolvedValue({ error: null });
    h.deleteItemsByOrderId.mockResolvedValue({ error: null });
    h.deletePackagesByOrderId.mockResolvedValue({ error: null });
    h.insertPackage.mockResolvedValue({ data: { id: 'pkg-1' }, error: null });
    h.insertItems.mockResolvedValue({ error: null });
  });

  it('TC-336-07: 기존 저장값과 동일 코드 → 검증 생략(조회 0회), 수정 진행', async () => {
    const { supabase, fromCalls } = buildSupabase({ activeCode: ACTIVE_CODE });
    (validateUserAction as any).mockResolvedValue({
      profile: { id: 'user-123', org_id: 'org-1', role: 'AGENCY' },
      supabase,
    });

    await updateOrder('order-1', makeUpsPayloadInput({ ups_product_code: ACTIVE_CODE }) as any);

    expect(fromCalls).not.toContain('zen_ups_products');
    expect(h.updateHeader).toHaveBeenCalledTimes(1);
  });

  it('TC-336-08: 기존값과 다른 미존재 코드 → 검증 후 throw, updateHeader 0회', async () => {
    const { supabase, fromCalls } = buildSupabase({ activeCode: ACTIVE_CODE });
    (validateUserAction as any).mockResolvedValue({
      profile: { id: 'user-123', org_id: 'org-1', role: 'AGENCY' },
      supabase,
    });

    await expect(
      updateOrder('order-1', makeUpsPayloadInput({ ups_product_code: 'WWE' }) as any)
    ).rejects.toThrow('존재하지 않거나 비활성화된 UPS 상품 코드입니다: WWE');

    expect(fromCalls).toContain('zen_ups_products');
    expect(h.updateHeader).not.toHaveBeenCalled();
  });
});

describe('TASK-B-336: saveOrderRateSnapshot 무음 스킵 경고 로그', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-336-09: 상품 미존재로 스킵 시 logger.warn(오더 ID·코드 포함), 동작 불변', async () => {
    const { supabase } = buildSupabase({ activeCode: ACTIVE_CODE });

    await saveOrderRateSnapshot({
      supabase,
      orderId: 'order-1',
      validated: makeUpsPayloadInput({ ups_product_code: 'WWE' }) as any,
      profile: { org_id: 'org-1', role: 'SHIPPER' },
      estimateFn: vi.fn(),
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[ORDER_RATE_SNAPSHOT]'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('orderId=order-1'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('product_code=WWE'));
    // 동작 불변: 스냅샷 insert 미발생
    expect(supabase.from).not.toHaveBeenCalledWith('zen_order_rate_snapshots');
  });
});
