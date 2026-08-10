import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';
import { OrderStatus } from '@/types/orders';

const mockValidate = vi.hoisted(() => vi.fn());
const mockUpdateStatus = vi.hoisted(() => vi.fn());
const mockAttachOperatorNames = vi.hoisted(() => vi.fn((_supabase: any, data: any[]) => Promise.resolve(data)));

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidate }));
vi.mock('@/app/actions/operations/orders', () => ({
  updateOrderStatus: mockUpdateStatus,
  attachOperatorNames: mockAttachOperatorNames,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

const mockRepo = vi.hoisted(() => ({ findById: vi.fn() }));
vi.mock('@/lib/repositories', () => ({
  BaseRepository: class {},
  OrderRepository: class { constructor() { (this as any).findById = mockRepo.findById; } },
  FinanceRepository: class {},
  AdminRepository: class {},
}));

vi.mock('@/app/actions/operations/ups-labels', () => ({
  registerUpsOrder: vi.fn().mockResolvedValue({ success: true, data: { shxk_order_id: 'SHXK-1' } }),
  cancelUpsRegistration: vi.fn().mockResolvedValue({ success: true }),
  fetchAndIssueUpsLabel: vi.fn(),
  voidUpsLabel: vi.fn(),
}));

import {
  getWarehousedOrders,
  getTodayReleasedOrders,
  getTodayUpsHistory,
  getTodayDepartureHistory,
  confirmOutbound,
  confirmUpsRegistration,
} from '@/app/actions/operations/warehouse';

// getAgencyShipperIds가 query.in("shipper_id", shipperIds)로 넘긴 배열을 캡처하는 mock.
function makeInCaptureDb(opts: {
  agencyShippers?: any[];
  orders?: any[];
  history?: any[];
  pkgs?: any[];
  capturedIn?: any[];
  }) {
  return {
    from(table: string) {
      const chain: any = {};
      chain._rows =
        table === 'zen_agency_shippers' ? (opts.agencyShippers || []) :
        table === 'zen_orders' ? (opts.orders || []) :
        table === 'order_status_history' ? (opts.history || []) :
        table === 'zen_order_packages' ? (opts.pkgs || []) :
        [];
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.in = (...args: any[]) => { (opts.capturedIn || []).push(args); return chain; };
      chain.gte = () => chain;
      chain.like = () => chain;
      chain.lte = () => chain;
      chain.order = () => chain;
      chain.insert = () => Promise.resolve({ error: null });
      chain.single = () => Promise.resolve({ data: null, error: null });
      chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
      chain.then = (resolve: any) => resolve({ data: chain._rows, error: null });
      return chain;
    },
  };
}

describe('TASK-B-274 (DEF-B-046): AGENCY 자가화주 오더 창고 노출 + 액션 허용', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-274-01: getWarehousedOrders — 하위 화주 목록 + 대리점 본인 org_id가 shipper_id 필터에 포함', async () => {
    const captured: any[] = [];
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: makeInCaptureDb({
        agencyShippers: [{ shipper_org_id: 'shipper-A' }],
        orders: [],
        capturedIn: captured,
      }),
    });

    const result = await getWarehousedOrders();
    expect(result.success).toBe(true);

    // shipper_id 필터에 하위 화주 + 대리점 본인 org_id가 모두 포함되어야 함
    const filterCall = captured.find(([col]) => col === 'shipper_id');
    expect(filterCall).toBeTruthy();
    expect(filterCall[1]).toContain('shipper-A');
    expect(filterCall[1]).toContain('agency-org');
  });

  it('TC-274-02: getWarehousedOrders — zen_agency_shippers 0건이어도 본인 org_id 필터로 조회 진행 (빈 목록 조기반환 없음)', async () => {
    const captured: any[] = [];
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: makeInCaptureDb({
        agencyShippers: [],
        orders: [{ id: 'order-self', shipper_id: 'agency-org' }],
        capturedIn: captured,
      }),
    });

    const result = await getWarehousedOrders();
    expect(result.success).toBe(true);
    const filterCall = captured.find(([col]) => col === 'shipper_id');
    expect(filterCall[1]).toEqual(['agency-org']);
    // 빈 목록 조기반환 없이 본인 오더가 결과에 포함
    expect(result.orders.length).toBe(1);
    expect(result.orders[0].id).toBe('order-self');
  });

  it('TC-274-03: confirmOutbound — 자가화주(shipper_id = 본인 org_id) 오더 → 성공', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: makeInCaptureDb({
        agencyShippers: [],
        pkgs: [{ id: 'p1', intl_ref_no: '1Z999', packing_count: 1 }],
      }),
    });
    mockRepo.findById.mockResolvedValue({
      data: {
        id: 'order-self',
        status: OrderStatus.WAREHOUSED,
        order_no: 'Z-SELF',
        shipper_id: 'agency-org',
        packages: [{ packing_count: 1 }],
      },
      error: null,
    });
    mockUpdateStatus.mockResolvedValue({ success: true });

    const result = await confirmOutbound('order-self');
    expect(result.success).toBe(true);
    expect(mockUpdateStatus).toHaveBeenCalledWith('order-self', OrderStatus.RELEASED, '[출고확정]');
  });

  it('TC-274-04: confirmOutbound — 관계 없는 타 조직 shipper_id는 여전히 차단 (보안 회귀)', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: makeInCaptureDb({ agencyShippers: [{ shipper_org_id: 'shipper-A' }] }),
    });
    mockRepo.findById.mockResolvedValue({
      data: {
        id: 'order-other',
        status: OrderStatus.WAREHOUSED,
        order_no: 'Z-OTHER',
        shipper_id: 'unrelated-org',
        packages: [],
      },
      error: null,
    });

    await expect(confirmOutbound('order-other')).rejects.toThrow('본인 소속 화주의 오더만 출고 처리할 수 있습니다.');
  });

  it('TC-274-05: getTodayUpsHistory — 자가화주 오더 이력이 결과에 포함', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: makeInCaptureDb({
        agencyShippers: [],
        history: [
          { id: 'h-self', created_at: '2026-08-11T10:00:00Z', order: { id: 'o-self', shipper_id: 'agency-org', order_no: 'Z-SELF' } },
        ],
      }),
    });

    const result = await getTodayUpsHistory();
    expect(result.success).toBe(true);
    // 자가화주(shipper_id = 본인 org_id) 오더가 메모리 filter를 통과해 결과에 포함
    expect(result.items.length).toBe(1);
    expect((result.items[0] as any).order.shipper_id).toBe('agency-org');
  });

  it('TC-274-06: confirmUpsRegistration — 자가화주(shipper_id = 본인 org_id) 오더 → 성공', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: makeInCaptureDb({ agencyShippers: [] }),
    });
    mockRepo.findById.mockResolvedValue({
      data: {
        id: 'order-self',
        status: OrderStatus.WAREHOUSED,
        order_no: 'Z-SELF',
        shipper_id: 'agency-org',
        packages: [],
      },
      error: null,
    });
    mockUpdateStatus.mockResolvedValue({ success: true });

    const result = await confirmUpsRegistration('order-self');
    expect(result.success).toBe(true);
  });

  it('TC-274-07: getTodayReleasedOrders — 하위 화주와 자가화주 모두 결과 포함', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: makeInCaptureDb({
        agencyShippers: [{ shipper_org_id: 'shipper-A' }],
        history: [
          { id: 'h-a', created_at: '2026-08-11T10:00:00Z', order: { id: 'o-a', shipper_id: 'shipper-A', order_no: 'Z-A' } },
          { id: 'h-self', created_at: '2026-08-11T11:00:00Z', order: { id: 'o-self', shipper_id: 'agency-org', order_no: 'Z-SELF' } },
        ],
      }),
    });

    const result = await getTodayReleasedOrders();
    expect(result.success).toBe(true);
    expect(result.items.length).toBe(2);
    const shipperIds = result.items.map((it: any) => it.order?.shipper_id);
    expect(shipperIds).toContain('shipper-A');
    expect(shipperIds).toContain('agency-org');
  });
});
