import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderStatus } from '@/types/orders';

// TASK-B-339 (Issue #1254): updateOrder 서버 강제 + 안전장치.
//   ① UPS 등록(활성 라벨) 후 수정 차단 (UI 우회·구버전 화면 방어)
//   ② 안전장치 ① — 실측 패키지 값 변경 시 measured_at 이월 해제 (창고 재실측 필요)
//   ③ 안전장치 ② — 낡은 폼 덮어쓰기 방지(낙관적 동시성)
//
// OrderRepository를 mock해 updateHeader/insertPackage의 **인자**를 직접 단언한다
// (실 supabase chain mock으로는 저장 인자를 검증하기 어렵다).

const ORDER_ID = '33900000-0000-4000-8000-000000000010';
const SHIPPER_A = '33900000-0000-4000-8000-000000000011';
const SHIPPER_B = '33900000-0000-4000-8000-000000000012';
const PKG_ID = '33900000-0000-4000-8000-000000000020';
const MEASURED_AT = '2026-10-01T00:00:00.000Z';
const ORIGIN_PORT = '33900000-0000-4000-8000-000000000031';
const DEST_PORT = '33900000-0000-4000-8000-000000000032';

const repoMock = vi.hoisted(() => {
  const state: any = {
    order: null as any,
    packages: [] as any[],
    items: [] as any[],
  };
  const calls: Record<string, any[][]> = {
    updateHeader: [],
    insertPackage: [],
    insertItems: [],
    deleteItemsByOrderId: [],
    deletePackagesByOrderId: [],
  };

  class MockOrderRepository {
    constructor(_supabase: any) {}
    async findById() {
      return { data: state.order, error: state.order ? null : { message: 'not found' } };
    }
    async getItemsByOrderId() {
      return { data: state.items, error: null };
    }
    async getPackagesByOrderId() {
      return { data: state.packages, error: null };
    }
    async getItemsFullByOrderId() {
      return { data: state.items, error: null };
    }
    async updateHeader(orderId: string, header: any) {
      calls.updateHeader.push([orderId, header]);
      return { data: header, error: null };
    }
    async deleteItemsByOrderId(orderId: string) {
      calls.deleteItemsByOrderId.push([orderId]);
      return { error: null };
    }
    async deletePackagesByOrderId(orderId: string) {
      calls.deletePackagesByOrderId.push([orderId]);
      return { error: null };
    }
    async insertPackage(pkg: any) {
      calls.insertPackage.push([pkg]);
      return { data: { ...pkg, id: 'new-pkg-id' }, error: null };
    }
    async insertItems(items: any[]) {
      calls.insertItems.push([items]);
      return { error: null };
    }
  }

  return {
    OrderRepository: MockOrderRepository,
    AdminRepository: vi.fn(),
    state,
    calls,
    reset() {
      state.order = null;
      state.packages = [];
      state.items = [];
      Object.values(calls).forEach((list) => (list.length = 0));
    },
  };
});

const editLogInsertMock = vi.hoisted(() => vi.fn());

const hasActiveUpsLabelMock = vi.hoisted(() => vi.fn());
const refreshUpsRateSnapshotMock = vi.hoisted(() => vi.fn());
const assertActiveUpsProductMock = vi.hoisted(() => vi.fn());
const syncInventoryFromOrderMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/repositories', () => ({
  OrderRepository: repoMock.OrderRepository,
  AdminRepository: repoMock.AdminRepository,
}));
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));
vi.mock('@/app/actions/master', () => ({ generateOrderNo: vi.fn(), generateMasterOrderNo: vi.fn() }));
vi.mock('@/app/actions/operations/inventory', () => ({
  syncInventoryFromOrder: (...args: any[]) => syncInventoryFromOrderMock(...args),
}));
vi.mock('@/app/actions/ups/freight', () => ({
  estimateUpsFreight: vi.fn().mockResolvedValue({ platform: { totalSellingPrice: 1, currency: 'USD' } }),
}));
vi.mock('@/lib/orders/ups-product-guard', () => ({
  assertActiveUpsProduct: (...args: any[]) => assertActiveUpsProductMock(...args),
}));
vi.mock('@/lib/orders/ups-registration', () => ({
  hasActiveUpsLabel: (...args: any[]) => hasActiveUpsLabelMock(...args),
}));
vi.mock('@/lib/orders/rate-snapshot-refresh', () => ({
  refreshUpsRateSnapshot: (...args: any[]) => refreshUpsRateSnapshotMock(...args),
}));

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    order_no: 'ZEN-339-1',
    status: OrderStatus.WAREHOUSED,
    transport_mode: 'UPS',
    shipper_id: SHIPPER_A,
    ups_product_code: 'WW_EXPEDITED',
    recipient_name: 'Original Recipient',
    ...overrides,
  };
}

function makePackage(overrides: Record<string, unknown> = {}) {
  return {
    id: PKG_ID,
    packing_unit: 'BOX',
    packing_count: 1,
    physical_box_count: 1,
    length: 30,
    width: 20,
    height: 10,
    gross_weight: 12.5,
    items: [{ item_name: 'Item', quantity: 1, unit_price: 1, currency: 'USD', hs_code: '8471300000' }],
    ...overrides,
  };
}

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    order_type: 'B2B',
    shipper_id: SHIPPER_A,
    shipper_contact_phone: '01000000000',
    recipient_name: 'Updated Recipient',
    recipient_address: '123 Test St',
    recipient_phone: '01012345678',
    origin_port_id: ORIGIN_PORT,
    dest_port_id: DEST_PORT,
    recipient_country_code: 'US',
    recipient_zipcode: '90001',
    recipient_city: 'Los Angeles',
    transport_mode: 'UPS',
    ups_product_code: 'WW_EXPEDITED',
    incoterms: 'DDP',
    delivery_method: 'DIRECT',
    packages: [makePackage()],
    ...overrides,
  };
}

async function loadUpdateOrder() {
  const { updateOrder } = await import('@/app/actions/operations/orders');
  return updateOrder;
}

describe('TASK-B-339: updateOrder — UPS 등록 전까지 수정 (Issue #1254)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    repoMock.reset();
    const { validateUserAction } = await import('@/lib/auth/guards');
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-1' },
      profile: { id: 'user-1', org_id: 'org-1', role: 'ADMIN' },
      supabase: {
        from: (table: string) => ({
          insert: (...args: any[]) => {
            if (table === 'zen_order_edit_log') return editLogInsertMock(...args);
            return Promise.resolve({ data: null, error: null });
          },
        }),
      },
    });
    hasActiveUpsLabelMock.mockResolvedValue(false);
    refreshUpsRateSnapshotMock.mockResolvedValue(undefined);
    assertActiveUpsProductMock.mockResolvedValue(undefined);
    syncInventoryFromOrderMock.mockResolvedValue(undefined);
  });

  it('TC-339-①: UPS + 활성 라벨 → throw + updateHeader 0회 (등록 후 수정 차단)', async () => {
    repoMock.state.order = makeOrder();
    hasActiveUpsLabelMock.mockResolvedValue(true);

    const updateOrder = await loadUpdateOrder();
    await expect(updateOrder(ORDER_ID, makePayload() as any)).rejects.toThrow(/UPS 등록취소/);

    expect(repoMock.calls.updateHeader).toHaveLength(0);
    expect(repoMock.calls.insertPackage).toHaveLength(0);
    expect(repoMock.calls.deleteItemsByOrderId).toHaveLength(0);
  });

  it('TC-339-②: WAREHOUSED+UPS+라벨 없음 → shipper_id·transport_mode 변경값이 updateHeader에 반영 (잠금 해제)', async () => {
    repoMock.state.order = makeOrder();
    repoMock.state.packages = [];

    const updateOrder = await loadUpdateOrder();
    const result = await updateOrder(
      ORDER_ID,
      makePayload({ shipper_id: SHIPPER_B, transport_mode: 'AIR' }) as any
    );

    expect(result.success).toBe(true);
    expect(repoMock.calls.updateHeader).toHaveLength(1);
    const header = repoMock.calls.updateHeader[0][1];
    expect(header.shipper_id).toBe(SHIPPER_B);
    expect(header.transport_mode).toBe('AIR');
  });

  it('TC-339-③: 실측 패키지 5개 값 불변 → insertPackage 인자에 measured_at 이월', async () => {
    repoMock.state.order = makeOrder();
    repoMock.state.packages = [
      { id: PKG_ID, length: 30, width: 20, height: 10, gross_weight: 12.5, packing_count: 1, measured_at: MEASURED_AT },
    ];

    const updateOrder = await loadUpdateOrder();
    await updateOrder(ORDER_ID, makePayload() as any);

    expect(repoMock.calls.insertPackage).toHaveLength(1);
    const inserted = repoMock.calls.insertPackage[0][0];
    expect(inserted.measured_at).toBe(MEASURED_AT);
    expect(inserted.length).toBe(30);
    expect(inserted.gross_weight).toBe(12.5);
  });

  it('TC-339-④: 실측 패키지 값 변경 → measured_at 없음 (창고 재실측 필요)', async () => {
    repoMock.state.order = makeOrder();
    repoMock.state.packages = [
      { id: PKG_ID, length: 30, width: 20, height: 10, gross_weight: 12.5, packing_count: 1, measured_at: MEASURED_AT },
    ];

    const updateOrder = await loadUpdateOrder();
    await updateOrder(
      ORDER_ID,
      makePayload({ packages: [makePackage({ length: 999 })] }) as any
    );

    const inserted = repoMock.calls.insertPackage[0][0];
    expect(inserted.measured_at).toBeUndefined();
    expect(inserted.length).toBe(999);
  });

  it('TC-339-⑤: 페이로드 measured_at ≠ DB measured_at → throw + 삭제/삽입 0회 (낙관적 동시성)', async () => {
    repoMock.state.order = makeOrder();
    repoMock.state.packages = [
      { id: PKG_ID, length: 30, width: 20, height: 10, gross_weight: 12.5, packing_count: 1, measured_at: MEASURED_AT },
    ];

    const updateOrder = await loadUpdateOrder();
    await expect(
      updateOrder(
        ORDER_ID,
        makePayload({
          packages: [makePackage({ measured_at: '2026-10-20T00:00:00.000Z' })],
        }) as any
      )
    ).rejects.toThrow(/실측값이 갱신되었습니다/);

    expect(repoMock.calls.updateHeader).toHaveLength(0);
    expect(repoMock.calls.deleteItemsByOrderId).toHaveLength(0);
    expect(repoMock.calls.deletePackagesByOrderId).toHaveLength(0);
    expect(repoMock.calls.insertPackage).toHaveLength(0);
  });

  it('TC-339-⑥: 비UPS 오더(REGISTERED+AIR) → 라벨 조회 0회 (UPS 전용 가드)', async () => {
    // WAREHOUSED+비UPS는 스코프에서 이미 수정 불가라 라벨 조회 이전에 막힌다 —
    // 그래서 수정 가능한 REGISTERED+AIR로 가드 호출 여부를 검증한다.
    repoMock.state.order = makeOrder({ status: OrderStatus.REGISTERED, transport_mode: 'AIR' });

    const updateOrder = await loadUpdateOrder();
    await updateOrder(ORDER_ID, makePayload({ transport_mode: 'AIR' }) as any);

    expect(hasActiveUpsLabelMock).not.toHaveBeenCalled();
  });

  it('TC-339-⑦: UPS 오더 수정 성공 시 운임 스냅샷 갱신 호출 (결함 ③)', async () => {
    repoMock.state.order = makeOrder();

    const updateOrder = await loadUpdateOrder();
    await updateOrder(ORDER_ID, makePayload() as any);

    expect(refreshUpsRateSnapshotMock).toHaveBeenCalledTimes(1);
    expect(refreshUpsRateSnapshotMock.mock.calls[0][0].orderId).toBe(ORDER_ID);
  });

  it('TC-339-⑦-b: REGISTERED+AIR → UPS로 변경 시 운임 스냅샷 갱신 호출 (수정 후 운송수단 기준)', async () => {
    repoMock.state.order = makeOrder({ status: OrderStatus.REGISTERED, transport_mode: 'AIR' });

    const updateOrder = await loadUpdateOrder();
    await updateOrder(ORDER_ID, makePayload({ transport_mode: 'UPS' }) as any);

    expect(refreshUpsRateSnapshotMock).toHaveBeenCalledTimes(1);
  });

  it('TC-339-⑦-c: UPS → AIR로 변경 시 운임 스냅샷 갱신 호출 안 함', async () => {
    repoMock.state.order = makeOrder();

    const updateOrder = await loadUpdateOrder();
    await updateOrder(ORDER_ID, makePayload({ transport_mode: 'AIR' }) as any);

    expect(refreshUpsRateSnapshotMock).not.toHaveBeenCalled();
  });

  it('TC-339-⑧: 스냅샷 갱신 실패해도 수정 저장은 롤백되지 않고 성공한다', async () => {
    repoMock.state.order = makeOrder();
    refreshUpsRateSnapshotMock.mockRejectedValue(new Error('snapshot boom'));

    const updateOrder = await loadUpdateOrder();
    await expect(updateOrder(ORDER_ID, makePayload() as any)).resolves.toEqual({ success: true });
  });

  it('TC-339-⑨: 실측값 문자열/숫자 차이(문자열 10 vs 숫자 10)는 동일 값으로 보고 measured_at 이월 유지', async () => {
    repoMock.state.order = makeOrder();
    repoMock.state.packages = [
      { id: PKG_ID, length: '30', width: '20', height: '10', gross_weight: '12.5', packing_count: '1', measured_at: MEASURED_AT },
    ];

    const updateOrder = await loadUpdateOrder();
    await updateOrder(
      ORDER_ID,
      makePayload({ packages: [makePackage({ length: 30, width: 20, height: 10, gross_weight: 12.5, packing_count: 1 })] }) as any
    );

    expect(repoMock.calls.insertPackage[0][0].measured_at).toBe(MEASURED_AT);
  });

  it('TC-339-⑨-b: DB 치수가 null인 실측 패키지에 폼이 0을 제출 → measured_at 이월 (null=0 정규화)', async () => {
    // edit-defaults.ts가 DB null 치수를 0으로 실어 보내고 폼(valueAsNumber)이 그 0을 그대로 제출한다.
    repoMock.state.order = makeOrder();
    repoMock.state.packages = [
      { id: PKG_ID, length: null, width: null, height: null, gross_weight: 12.5, packing_count: 1, measured_at: MEASURED_AT },
    ];

    const updateOrder = await loadUpdateOrder();
    await updateOrder(
      ORDER_ID,
      makePayload({ packages: [makePackage({ length: 0, width: 0, height: 0 })] }) as any
    );

    expect(repoMock.calls.insertPackage[0][0].measured_at).toBe(MEASURED_AT);
  });

  it('TC-339-⑨-c: DB length가 null인데 payload가 5 → measured_at 없음 (실제 값 변경)', async () => {
    repoMock.state.order = makeOrder();
    repoMock.state.packages = [
      { id: PKG_ID, length: null, width: 20, height: 10, gross_weight: 12.5, packing_count: 1, measured_at: MEASURED_AT },
    ];

    const updateOrder = await loadUpdateOrder();
    await updateOrder(
      ORDER_ID,
      makePayload({ packages: [makePackage({ length: 5, width: 20, height: 10 })] }) as any
    );

    expect(repoMock.calls.insertPackage[0][0].measured_at).toBeUndefined();
  });

  it('TC-339-⑨-d: DB gross_weight가 null(0과 동일 취급)이고 payload가 0 → measured_at 이월', async () => {
    // payload null은 z.number() 필수 스키마에서 Zod가 거부되어(저장 자체 불가) 반대 방향(null↔0)으로 검증한다.
    repoMock.state.order = makeOrder();
    repoMock.state.packages = [
      { id: PKG_ID, length: 30, width: 20, height: 10, gross_weight: null, packing_count: 1, measured_at: MEASURED_AT },
    ];

    const updateOrder = await loadUpdateOrder();
    await updateOrder(
      ORDER_ID,
      makePayload({ packages: [makePackage({ gross_weight: 0 })] }) as any
    );

    expect(repoMock.calls.insertPackage[0][0].measured_at).toBe(MEASURED_AT);
  });
});
