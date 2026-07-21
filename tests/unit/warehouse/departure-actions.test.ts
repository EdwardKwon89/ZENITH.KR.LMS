import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockReturnValue(vi.fn((key: string) => key)),
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/shxk/client', () => ({ callShxk: vi.fn() }));
vi.mock('@/lib/shxk/order', () => ({
  createorder: vi.fn(),
  getnewlabel: vi.fn(),
  removeorder: vi.fn(),
}));

const mockUpdateOrderStatus = vi.fn().mockResolvedValue({ success: true });

const mockFindById = vi.fn().mockResolvedValue({
  data: { id: 'order-1', status: 'RELEASED', shipper_id: 'org-1', order_no: 'ORD-001' },
});

class MockOrderRepository {
  findById = mockFindById;
  getStatus = vi.fn().mockResolvedValue({ data: { status: 'RELEASED' } });
}

vi.mock('@/lib/repositories', () => ({
  OrderRepository: MockOrderRepository,
}));

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn().mockResolvedValue({
    supabase: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: any, reject: any) => Promise.resolve({ data: null, error: null }).then(resolve, reject),
      })),
    },
    profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
  }),
}));

vi.mock('@/app/actions/operations/orders', () => ({
  updateOrderStatus: (...args: any[]) => mockUpdateOrderStatus(...args),
}));

vi.mock('@/app/actions/operations/ups-labels', () => ({
  registerUpsOrder: vi.fn(),
  cancelUpsRegistration: vi.fn(),
  fetchAndIssueUpsLabel: vi.fn(),
  voidUpsLabel: vi.fn(),
}));

beforeEach(() => {
  mockUpdateOrderStatus.mockClear();
  mockFindById.mockResolvedValue({
    data: { id: 'order-1', status: 'RELEASED', shipper_id: 'org-1', order_no: 'ORD-001' },
  });
});

describe('TASK-B-171: confirmDeparture guard (RELEASED→IN_TRANSIT)', () => {
  it('RELEASED 아닌 오더를 출고확정 시도하면 updateOrderStatus를 호출하지 않는다', async () => {
    mockFindById.mockResolvedValue({
      data: { id: 'order-x', status: 'PACKED', shipper_id: 'org-1' },
    });

    const { confirmDeparture } = await import('@/app/actions/operations/warehouse');
    await expect(confirmDeparture('order-x')).rejects.toThrow('RELEASED');
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
  });

  it('정상적으로 IN_TRANSIT로 전이하고 updateOrderStatus를 호출한다', async () => {
    const { confirmDeparture } = await import('@/app/actions/operations/warehouse');
    const result = await confirmDeparture('order-1');

    expect(result.success).toBe(true);
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-1', 'IN_TRANSIT', '[출고확정처리]');
  });
});

describe('TASK-B-171: getReleasedOrders', () => {
  it('RELEASED 상태의 UPS 오더를 조회한다', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: 'order-1', status: 'RELEASED' }], error: null });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      }),
    };

    vi.mocked(await import('@/lib/auth/guards')).validateUserAction = vi.fn().mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    });

    const { getReleasedOrders } = await import('@/app/actions/operations/warehouse');
    const result = await getReleasedOrders();

    expect(result.success).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_orders');
  });
});
