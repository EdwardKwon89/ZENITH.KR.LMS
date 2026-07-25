import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockUpdateOrderStatus = vi.fn().mockResolvedValue({ success: true });

const mockFindById = vi.fn().mockResolvedValue({
  data: { id: 'order-1', status: 'IN_TRANSIT', shipper_id: 'org-1', order_no: 'ORD-001' },
});

class MockOrderRepository {
  findById = mockFindById;
  getStatus = vi.fn().mockResolvedValue({ data: { status: 'IN_TRANSIT' } });
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
  vi.clearAllMocks();
  mockFindById.mockResolvedValue({
    data: { id: 'order-1', status: 'IN_TRANSIT', shipper_id: 'org-1', order_no: 'ORD-001' },
  });
});

describe('undoDeparture: IN_TRANSIT → RELEASED', () => {
  it('IN_TRANSIT 오더를 RELEASED로 되돌린다', async () => {
    const { undoDeparture } = await import('@/app/actions/operations/warehouse');
    const result = await undoDeparture('order-1');

    expect(result.success).toBe(true);
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-1', 'RELEASED', '[출고확정취소]');
  });

  it('IN_TRANSIT 아닌 오더는 에러를 반환한다', async () => {
    mockFindById.mockResolvedValue({
      data: { id: 'order-x', status: 'RELEASED', shipper_id: 'org-1' },
    });

    const { undoDeparture } = await import('@/app/actions/operations/warehouse');
    const result = await undoDeparture('order-x');

    expect(result.success).toBe(false);
    expect(result.error).toContain('IN_TRANSIT');
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
  });

  it('AGENCY 역할은 본인 소속 화주만 처리 가능', async () => {
    vi.mocked(await import('@/lib/auth/guards')).validateUserAction = vi.fn().mockResolvedValue({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      },
      profile: { id: 'agency-user', role: 'AGENCY', org_id: 'agency-org' },
    });

    const { undoDeparture } = await import('@/app/actions/operations/warehouse');
    const result = await undoDeparture('order-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('본인 소속');
  });
});
