// TASK-B-367 (Issue #1377): SETTLED 오더 중량·치수 수정 가드 — 헬퍼 단위 + 실제 updateOrder 호출.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const ORDER_ID = '36700000-0000-4000-8000-000000000010';
const SHIPPER_A = '36700000-0000-4000-8000-000000000011';
const PKG_ID = '36700000-0000-4000-8000-000000000020';
const ORIGIN_PORT = '36700000-0000-4000-8000-000000000031';
const DEST_PORT = '36700000-0000-4000-8000-000000000032';

const repoMock = vi.hoisted(() => {
  const state: any = { order: null as any, packages: [] as any[], items: [] as any[] };
  const calls: Record<string, any[][]> = { updateHeader: [], deleteItems: [], deletePackages: [], insertPackage: [], insertItems: [] };
  class MockOrderRepository {
    constructor(_supabase: any) {}
    async findById() { return { data: state.order, error: state.order ? null : { message: 'not found' } }; }
    async getItemsByOrderId() { return { data: state.items, error: null }; }
    async getPackagesByOrderId() { return { data: state.packages, error: null }; }
    async getItemsFullByOrderId() { return { data: state.items, error: null }; }
    async updateHeader(orderId: string, header: any) { calls.updateHeader.push([orderId, header]); return { error: null }; }
    async deleteItemsByOrderId(orderId: string) { calls.deleteItems.push([orderId]); return { error: null }; }
    async deletePackagesByOrderId(orderId: string) { calls.deletePackages.push([orderId]); return { error: null }; }
    async insertPackage(pkg: any) { calls.insertPackage.push([pkg]); return { data: { ...pkg, id: 'new-pkg' }, error: null }; }
    async insertItems(items: any[]) { calls.insertItems.push([items]); return { error: null }; }
  }
  return {
    OrderRepository: MockOrderRepository,
    AdminRepository: vi.fn(),
    state, calls,
    reset() {
      state.order = null; state.packages = []; state.items = [];
      Object.values(calls).forEach((list) => (list.length = 0));
    },
  };
});

const mockValidateUserAction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/repositories', () => ({ OrderRepository: repoMock.OrderRepository, AdminRepository: repoMock.AdminRepository }));
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidateUserAction, validateAdminAction: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));
vi.mock('@/app/actions/master', () => ({ generateOrderNo: vi.fn(), generateMasterOrderNo: vi.fn() }));
vi.mock('@/app/actions/operations/inventory', () => ({ syncInventoryFromOrder: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/orders/ups-product-guard', () => ({ assertActiveUpsProduct: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/orders/ups-registration', () => ({ hasActiveUpsLabel: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/orders/rate-snapshot-refresh', () => ({ refreshUpsRateSnapshot: vi.fn().mockResolvedValue(undefined) }));

import { assertSettledCargoEditAllowed } from '@/lib/orders/settled-cargo-guard';

const LOCKED = '오더정산이 완료된 오더는 원가·중량을 수정할 수 없습니다.';
const STATUS_INVALID = '현재 상태에서는 오더를 수정할 수 없습니다.';

function makePackage(overrides: Record<string, unknown> = {}) {
  return {
    id: PKG_ID,
    packing_unit: 'BOX', packing_count: 1, physical_box_count: 1,
    length: 30, width: 20, height: 10, gross_weight: 12.5,
    items: [{ item_name: 'Item', quantity: 1, unit_price: 1, currency: 'USD', hs_code: '8471300000' }],
    ...overrides,
  };
}
function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    order_type: 'B2B', shipper_id: SHIPPER_A, shipper_contact_phone: '01000000000',
    recipient_name: 'Updated Recipient', recipient_address: '123 Test St', recipient_phone: '01012345678',
    origin_port_id: ORIGIN_PORT, dest_port_id: DEST_PORT, recipient_country_code: 'US',
    recipient_zipcode: '90001', recipient_city: 'Los Angeles',
    transport_mode: 'AIR', delivery_method: 'DIRECT', packages: [makePackage()],
    ...overrides,
  };
}
function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID, order_no: 'ZEN-367-1', status: 'RETURNED', transport_mode: 'AIR',
    shipper_id: SHIPPER_A, recipient_name: 'Original Recipient', cost_settlement_status: 'SETTLED',
    ...overrides,
  };
}
async function loadUpdateOrder() {
  const { updateOrder } = await import('@/app/actions/operations/orders');
  return updateOrder;
}

beforeEach(async () => {
  vi.clearAllMocks();
  repoMock.reset();
  mockValidateUserAction.mockResolvedValue({
    user: { id: 'user-1' }, profile: { id: 'user-1', org_id: 'org-1', role: 'ADMIN' },
    supabase: { from: () => ({ insert: () => Promise.resolve({ error: null }) }) },
  });
  repoMock.state.packages = [makePackage()];
  repoMock.state.items = makePackage().items as any[];
});

describe('TASK-B-367: 헬퍼 단위 — 중량·치수만 차단', () => {
  const before = [makePackage()] as any;

  it('비SETTLED → 중량 변경도 통과', async () => {
    await expect(assertSettledCargoEditAllowed(false, before, [makePackage({ gross_weight: 99 })] as any))
      .resolves.toBeUndefined();
  });

  it('SETTLED + 화물 동일 → 통과', async () => {
    await expect(assertSettledCargoEditAllowed(true, before, [makePackage()] as any))
      .resolves.toBeUndefined();
  });

  it('SETTLED + 중량 변경 → cost_settled_locked', async () => {
    await expect(assertSettledCargoEditAllowed(true, before, [makePackage({ gross_weight: 20 })] as any))
      .rejects.toThrow(LOCKED);
  });

  it('SETTLED + 치수 변경 → cost_settled_locked', async () => {
    await expect(assertSettledCargoEditAllowed(true, before, [makePackage({ length: 40 })] as any))
      .rejects.toThrow(LOCKED);
  });

  it('SETTLED + 패키지 수 변경 → cost_settled_locked', async () => {
    await expect(assertSettledCargoEditAllowed(true, before, [makePackage(), makePackage({ id: 'p2' })] as any))
      .rejects.toThrow(LOCKED);
  });
});

describe('TASK-B-367: 실제 updateOrder 호출 — SETTLED editable 상태', () => {
  it('중량 수정 시도 → cost_settled_locked, 모든 쓰기 전에 차단', async () => {
    repoMock.state.order = makeOrder();
    const updateOrder = await loadUpdateOrder();
    await expect(updateOrder(ORDER_ID, makePayload({ packages: [makePackage({ gross_weight: 20 })] }) as any))
      .rejects.toThrow(LOCKED);
    expect(repoMock.calls.updateHeader).toHaveLength(0);
    expect(repoMock.calls.deletePackages).toHaveLength(0);
  });

  it('치수 수정 시도 → cost_settled_locked', async () => {
    repoMock.state.order = makeOrder();
    const updateOrder = await loadUpdateOrder();
    await expect(updateOrder(ORDER_ID, makePayload({ packages: [makePackage({ length: 40 })] }) as any))
      .rejects.toThrow(LOCKED);
    expect(repoMock.calls.updateHeader).toHaveLength(0);
  });

  it('비중량 필드(수취인명)만 수정 → 통과 (헤더 업데이트 발생)', async () => {
    repoMock.state.order = makeOrder();
    const updateOrder = await loadUpdateOrder();
    const res = await updateOrder(ORDER_ID, makePayload({ recipient_name: 'New Name' }) as any);
    expect(res).toEqual({ success: true });
    expect(repoMock.calls.updateHeader).toHaveLength(1);
  });

  it('SETTLED 아닌 오더의 중량 수정 → 통과 (기존 동작 보존)', async () => {
    repoMock.state.order = makeOrder({ cost_settlement_status: 'NOT_SETTLED' });
    const updateOrder = await loadUpdateOrder();
    const res = await updateOrder(ORDER_ID, makePayload({ packages: [makePackage({ gross_weight: 20 })] }) as any);
    expect(res).toEqual({ success: true });
    expect(repoMock.calls.updateHeader).toHaveLength(1);
  });

  it('DELIVERED SETTLED 오더 → 기존 상태 가드가 order_edit_status_invalid 로 먼저 차단', async () => {
    repoMock.state.order = makeOrder({ status: 'DELIVERED' });
    const updateOrder = await loadUpdateOrder();
    await expect(updateOrder(ORDER_ID, makePayload() as any)).rejects.toThrow(STATUS_INVALID);
    expect(repoMock.calls.updateHeader).toHaveLength(0);
  });
});
