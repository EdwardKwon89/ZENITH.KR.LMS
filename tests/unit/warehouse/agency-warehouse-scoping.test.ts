import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';
import { OrderStatus } from '@/types/orders';

const mockValidate = vi.hoisted(() => vi.fn());
const mockUpdateStatus = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidate }));
vi.mock('@/app/actions/operations/orders', () => ({ updateOrderStatus: mockUpdateStatus }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

const mockRepo = vi.hoisted(() => ({ findById: vi.fn() }));
vi.mock('@/lib/repositories', () => ({
  BaseRepository: class {},
  OrderRepository: class { constructor() { this.findById = mockRepo.findById; } },
  FinanceRepository: class {},
  AdminRepository: class {},
}));

import { getWarehousedOrders, getTodayReleasedOrders, confirmOutbound } from '@/app/actions/operations/warehouse';

function makeChainable(rows: any[]) {
  const chain: any = {};
  chain._rows = rows;
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.in = () => chain;
  chain.gte = () => chain;
  chain.order = () => Promise.resolve({ data: chain._rows, error: null });
  chain.insert = () => chain;
  chain.then = (resolve: any) => resolve({ data: chain._rows, error: null });
  return chain;
}

function makeDbMock(opts: {
  agencyShippers?: any[];
  orders?: any[];
  history?: any[];
  pkgs?: any[];
}) {
  return {
    from(table: string) {
      if (table === 'zen_agency_shippers') {
        return makeChainable(opts.agencyShippers || []);
      }
      if (table === 'zen_orders') {
        return makeChainable(opts.orders || []);
      }
      if (table === 'order_status_history') {
        return makeChainable(opts.history || []);
      }
      if (table === 'zen_order_packages') {
        return makeChainable(opts.pkgs || []);
      }
      if (table === 'zen_inventory_history') {
        return makeChainable([]);
      }
      return makeChainable([]);
    },
  };
}

describe('TC-WH-AGENCY: AGENCY 창고 권한 + 조직 스코핑', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-WH-AGENCY-01: OPERATOR角色 → 403 (getWarehousedOrders)', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'u1' },
      profile: { id: 'u1', role: USER_ROLES.OPERATOR, org_id: 'org-1' },
    });
    await expect(getWarehousedOrders()).rejects.toThrow('권한이 없습니다.');
  });

  it('TC-WH-AGENCY-02: SHIPPER角色 → 403 (getTodayReleasedOrders)', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'u1' },
      profile: { id: 'u1', role: USER_ROLES.SHIPPER, org_id: 'org-1' },
    });
    await expect(getTodayReleasedOrders()).rejects.toThrow('권한이 없습니다.');
  });

  it('TC-WH-AGENCY-03: INDIVIDUAL角色 → 403 (confirmOutbound)', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'u1' },
      profile: { id: 'u1', role: USER_ROLES.INDIVIDUAL, org_id: 'org-1' },
    });
    await expect(confirmOutbound('order-1')).rejects.toThrow('권한이 없습니다.');
  });

  it('TC-WH-AGENCY-04: AGENCY 정상 접근 + 소속 화주 오더만 조회', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
    });
    const db = makeDbMock({
      agencyShippers: [
        { shipper_org_id: 'shipper-A' },
        { shipper_org_id: 'shipper-B' },
      ],
      orders: [
        { id: 'order-1', shipper_id: 'shipper-A' },
        { id: 'order-2', shipper_id: 'shipper-B' },
      ],
    });
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: db,
    });

    const result = await getWarehousedOrders();
    expect(result.success).toBe(true);
    expect(result.orders.length).toBe(2);
  });

  it('TC-WH-AGENCY-05: AGENCY 소속 화주 없음 → 빈 목록', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: makeDbMock({ agencyShippers: [] }),
    });
    const result = await getWarehousedOrders();
    expect(result.success).toBe(true);
    expect(result.orders).toEqual([]);
  });

  it('TC-WH-AGENCY-06: ADMIN → 전체 오더 조회 (스코핑 없음)', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'admin-user' },
      profile: { id: 'admin-user', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      supabase: makeDbMock({
        orders: [
          { id: 'order-1', shipper_id: 'any-shipper' },
          { id: 'order-2', shipper_id: 'other-shipper' },
        ],
      }),
    });
    const result = await getWarehousedOrders();
    expect(result.success).toBe(true);
    expect(result.orders.length).toBe(2);
  });

  it('TC-WH-AGENCY-07: AGENCY confirmOutbound — 소속 화주 오더 → 성공', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: makeDbMock({
        agencyShippers: [{ shipper_org_id: 'shipper-A' }],
        pkgs: [{ id: 'p1', intl_ref_no: '1Z999', packing_count: 1 }],
      }),
    });
    mockRepo.findById.mockResolvedValue({
      data: {
        id: 'order-1',
        status: OrderStatus.WAREHOUSED,
        order_no: 'Z-1',
        shipper_id: 'shipper-A',
        packages: [],
      },
      error: null,
    });

    const result = await confirmOutbound('order-1');
    expect(result.success).toBe(true);
  });

  it('TC-WH-AGENCY-08: AGENCY confirmOutbound — 비소속 화주 오더 → 차단', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: makeDbMock({
        agencyShippers: [{ shipper_org_id: 'shipper-A' }],
      }),
    });
    mockRepo.findById.mockResolvedValue({
      data: {
        id: 'order-2',
        status: OrderStatus.WAREHOUSED,
        order_no: 'Z-2',
        shipper_id: 'shipper-X',
        packages: [],
      },
      error: null,
    });

    await expect(confirmOutbound('order-2')).rejects.toThrow('본인 소속 화주의 오더만 출고 처리할 수 있습니다.');
  });

  it('TC-WH-AGENCY-09: AGENCY getTodayReleasedOrders — 소속 화주 필터링', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: makeDbMock({
        agencyShippers: [{ shipper_org_id: 'shipper-A' }],
        history: [
          { id: 'h1', created_at: '2026-07-15T10:00:00Z', order: { id: 'o1', shipper_id: 'shipper-A', order_no: 'Z-1' } },
          { id: 'h2', created_at: '2026-07-15T11:00:00Z', order: { id: 'o2', shipper_id: 'shipper-X', order_no: 'Z-2' } },
        ],
      }),
    });
    const result = await getTodayReleasedOrders();
    expect(result.success).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].order.shipper_id).toBe('shipper-A');
  });

  it('TC-WH-AGENCY-10: AGENCY_SHIPPER角色 → 403 (창고 접근 불가)', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'u1' },
      profile: { id: 'u1', role: USER_ROLES.AGENCY_SHIPPER, org_id: 'org-1' },
    });
    await expect(getWarehousedOrders()).rejects.toThrow('권한이 없습니다.');
  });

  it('TC-WH-AGENCY-11: MANAGER角色 → 정상 접근 (스코핑 없음)', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'mgr' },
      profile: { id: 'mgr', role: USER_ROLES.MANAGER, org_id: 'org-1' },
      supabase: makeDbMock({ orders: [{ id: 'order-1' }] }),
    });
    const result = await getWarehousedOrders();
    expect(result.success).toBe(true);
  });

  it('TC-WH-AGENCY-12: AGENCY getWarehousedOrders — zen_agency_shippers 조회 실패 → 빈 목록', async () => {
    const errorDb = {
      from(table: string) {
        if (table === 'zen_agency_shippers') {
          return {
            select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'DB error' } }) }) }),
          };
        }
        return makeChainable([]);
      },
    };
    mockValidate.mockResolvedValue({
      user: { id: 'agency-user' },
      profile: { id: 'agency-user', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      supabase: errorDb,
    });
    const result = await getWarehousedOrders();
    expect(result.success).toBe(true);
    expect(result.orders).toEqual([]);
  });
});
