import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';
import { OrderStatus } from '@/types/orders';

const mockValidate = vi.hoisted(() => vi.fn());
const mockUpdateStatus = vi.hoisted(() => vi.fn());
const mockRepoFindById = vi.hoisted(() => vi.fn());
const mockRepoGetStatus = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidate }));
vi.mock('@/app/actions/operations/orders', () => ({ updateOrderStatus: mockUpdateStatus }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/repositories', () => ({
  BaseRepository: class {},
  OrderRepository: class {
    constructor() {
      this.findById = mockRepoFindById;
      this.getStatus = mockRepoGetStatus;
    }
  },
}));

import {
  getPickupOrders,
  confirmPickup,
  cancelPickup,
  getTodayPickupHistory,
  cancelInbound,
} from '@/app/actions/operations/warehouse';

function makeChainable(rows: any[]) {
  const chain: any = {};
  chain._rows = rows;
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.in = () => chain;
  chain.gte = () => chain;
  chain.lte = () => chain;
  chain.contains = () => chain;
  chain.limit = () => chain;
  chain.order = () => chain;
  chain.then = (resolve: any) => resolve({ data: chain._rows, error: null });
  chain.maybeSingle = () => Promise.resolve({ data: chain._rows?.[0] || null, error: null });
  return chain;
}

function makeDbMock(opts: {
  agencyShippers?: any[];
  orders?: any[];
  history?: any[];
}) {
  return {
    from(table: string) {
      if (table === 'zen_agency_shippers') return makeChainable(opts.agencyShippers || []);
      if (table === 'zen_orders') return makeChainable(opts.orders || []);
      if (table === 'order_status_history') return makeChainable(opts.history || []);
      return makeChainable([]);
    },
  };
}

describe('TC-DEF-112: UPS 오더픽업 + 입고취소', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────
  // B-1: 오더픽업 (Pickup)
  // ─────────────────────────────

  it('TC-B1-01: 권한 없음 → 403 (getPickupOrders)', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'u1' },
      profile: { id: 'u1', role: USER_ROLES.OPERATOR, org_id: 'org-1' },
    });
    await expect(getPickupOrders()).rejects.toThrow('권한이 없습니다.');
  });

  it('TC-B1-02: ADMIN → UPS REGISTERED+PICKUP 오더 조회 성공', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'admin' },
      profile: { id: 'admin', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      supabase: makeDbMock({
        orders: [
          { id: 'o1', order_no: 'Z-001', status: OrderStatus.REGISTERED, delivery_method: 'PICKUP', transport_mode: 'UPS' },
          { id: 'o2', order_no: 'Z-002', status: OrderStatus.REGISTERED, delivery_method: 'PICKUP', transport_mode: 'UPS' },
        ],
      }),
    });
    const result = await getPickupOrders();
    expect(result.success).toBe(true);
    expect(result.orders.length).toBe(2);
  });

  it('TC-B1-03: confirmPickup → updateOrderStatus(SCHEDULED) 호출', async () => {
    mockUpdateStatus.mockResolvedValue({ success: true });
    mockValidate.mockResolvedValue({
      user: { id: 'admin' },
      profile: { id: 'admin', role: USER_ROLES.ADMIN, org_id: 'org-1' },
    });
    const result = await confirmPickup('order-1');
    expect(result.success).toBe(true);
    expect(mockUpdateStatus).toHaveBeenCalledWith('order-1', OrderStatus.SCHEDULED, '[픽업완료]');
  });

  it('TC-B1-04: cancelPickup → updateOrderStatus(REGISTERED) 호출', async () => {
    mockUpdateStatus.mockResolvedValue({ success: true });
    mockValidate.mockResolvedValue({
      user: { id: 'admin' },
      profile: { id: 'admin', role: USER_ROLES.ADMIN, org_id: 'org-1' },
    });
    const result = await cancelPickup('order-1');
    expect(result.success).toBe(true);
    expect(mockUpdateStatus).toHaveBeenCalledWith('order-1', OrderStatus.REGISTERED, '[픽업취소]');
  });

  it('TC-B1-05: getTodayPickupHistory → SCHEDULED + [픽업완료] 필터', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'admin' },
      profile: { id: 'admin', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      supabase: makeDbMock({
        history: [
          { id: 'h1', next_status: 'SCHEDULED', reason: '[픽업완료]', order: { order_no: 'Z-001' } },
        ],
      }),
    });
    const result = await getTodayPickupHistory();
    expect(result.length).toBe(1);
    expect(result[0].next_status).toBe('SCHEDULED');
  });

  it('TC-B1-06: AGENCY getPickupOrders → 소속 화주 오더만 조회', async () => {
    const ordersData = [
      { id: 'o1', order_no: 'Z-001', status: OrderStatus.REGISTERED, delivery_method: 'PICKUP', transport_mode: 'UPS', shipper_id: 'shipper-A' },
    ];
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: {
        from(table: string) {
          if (table === 'zen_agency_shippers') {
            return makeChainable([{ shipper_org_id: 'shipper-A' }]);
          }
          if (table === 'zen_orders') {
            return makeChainable(ordersData);
          }
          return makeChainable([]);
        },
      },
    });
    const result = await getPickupOrders();
    expect(result.success).toBe(true);
    expect(result.orders.length).toBe(1);
  });

  it('TC-B1-07: AGENCY 소속 화주 없음 → 빈 목록', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: makeDbMock({ agencyShippers: [] }),
    });
    const result = await getPickupOrders();
    expect(result.success).toBe(true);
    expect(result.orders).toEqual([]);
  });

  // ─────────────────────────────
  // B-2: 입고취소 (Cancel Inbound)
  // ─────────────────────────────

  it('TC-B2-01: cancelInbound 권한 없음 → 403', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'u1' },
      profile: { id: 'u1', role: USER_ROLES.OPERATOR, org_id: 'org-1' },
    });
    await expect(cancelInbound('order-1')).rejects.toThrow('권한이 없습니다.');
  });

  it('TC-B2-02: cancelInbound → WAREHOUSED 아닌 오더 → 차단', async () => {
    mockRepoGetStatus.mockResolvedValue({
      data: { id: 'order-1', status: OrderStatus.PACKED },
      error: null,
    });
    mockValidate.mockResolvedValue({
      user: { id: 'admin' },
      profile: { id: 'admin', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      supabase: makeDbMock({}),
    });
    await expect(cancelInbound('order-1')).rejects.toThrow('WAREHOUSED 상태의 오더만 입고취소할 수 있습니다.');
  });

  it('TC-B2-03: cancelInbound → 직전 상태(SCHEDULED)로 복구', async () => {
    const historyData = [{ prev_status: OrderStatus.SCHEDULED, next_status: OrderStatus.WAREHOUSED }];
    mockRepoGetStatus.mockResolvedValue({
      data: { id: 'order-1', status: OrderStatus.WAREHOUSED },
      error: null,
    });
    mockUpdateStatus.mockResolvedValue({ success: true });
    mockValidate.mockResolvedValue({
      user: { id: 'admin' },
      profile: { id: 'admin', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      supabase: {
        from(table: string) {
          if (table === 'order_status_history') return makeChainable(historyData);
          return makeChainable([]);
        },
      },
    });
    const result = await cancelInbound('order-1');
    expect(result.success).toBe(true);
    expect(result.restoredStatus).toBe(OrderStatus.SCHEDULED);
    expect(mockUpdateStatus).toHaveBeenCalledWith('order-1', OrderStatus.SCHEDULED, '[입고취소]');
  });

  it('TC-B2-04: cancelInbound → 직전 이력 없음 → REGISTERED로 복구', async () => {
    mockRepoGetStatus.mockResolvedValue({
      data: { id: 'order-2', status: OrderStatus.WAREHOUSED },
      error: null,
    });
    mockUpdateStatus.mockResolvedValue({ success: true });
    mockValidate.mockResolvedValue({
      user: { id: 'admin' },
      profile: { id: 'admin', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      supabase: {
        from() { return makeChainable([]); },
      },
    });
    const result = await cancelInbound('order-2');
    expect(result.success).toBe(true);
    expect(result.restoredStatus).toBe(OrderStatus.REGISTERED);
    expect(mockUpdateStatus).toHaveBeenCalledWith('order-2', OrderStatus.REGISTERED, '[입고취소]');
  });

  // ─────────────────────────────
  // 상태 전이 규칙 검증 (status-machine)
  // ─────────────────────────────

  it('TC-B2-05: SCHEDULED→REGISTERED 전이 허용 확인', async () => {
    const { canChangeStatus } = await import('@/lib/logistics/status-machine');
    const result = canChangeStatus(OrderStatus.SCHEDULED, OrderStatus.REGISTERED, USER_ROLES.ADMIN);
    expect(result.allowed).toBe(true);
  });

  it('TC-B2-06: WAREHOUSED→SCHEDULED 전이 허용 확인', async () => {
    const { canChangeStatus } = await import('@/lib/logistics/status-machine');
    const result = canChangeStatus(OrderStatus.WAREHOUSED, OrderStatus.SCHEDULED, USER_ROLES.ADMIN);
    expect(result.allowed).toBe(true);
  });

  it('TC-B2-07: REGISTERED→WAREHOUSED 전이 허용 확인', async () => {
    const { canChangeStatus } = await import('@/lib/logistics/status-machine');
    const result = canChangeStatus(OrderStatus.REGISTERED, OrderStatus.WAREHOUSED, USER_ROLES.ADMIN);
    expect(result.allowed).toBe(true);
  });
});
