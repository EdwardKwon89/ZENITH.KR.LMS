import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrderServices } from '@/app/actions/operations/order-services';
import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

// Create a stable mock factory
const createMockSupabase = () => {
  const mock: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    selectPromiseResult: null,
  };
  mock.from.mockReturnValue(mock);
  mock.insert.mockReturnValue(mock);
  mock.update.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);

  mock.select.mockImplementation((columns?: string) => {
    if (columns) {
      return mock;
    }
    return {
      then: (resolve: any) => resolve(mock.selectPromiseResult || { data: [], error: null })
    };
  });

  return mock;
};

let activeMockSupabase = createMockSupabase();

describe('TC-P6-ORDERUI: createOrderServices 요율 검증 및 등록 통합 테스트', () => {
  const mockUser = { id: 'user-1', org_id: 'shipper-1', role: USER_ROLES.CORPORATE };
  const mockOrderId = 'order-uuid-001';

  beforeEach(() => {
    vi.clearAllMocks();
    activeMockSupabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({
      supabase: activeMockSupabase,
      profile: mockUser,
    });
  });

  it('[TC-P6-ORDERUI-01] 활성 상태이며 유효기간 내에 있는 요율로 제출 시 정상적으로 등록된다', async () => {
    // 1. Order 조회 Mock
    activeMockSupabase.single.mockResolvedValueOnce({
      data: { shipper_id: 'shipper-1' },
      error: null,
    });

    // 2. Transport 요율 조회 Mock
    activeMockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'rate-1',
        is_active: true,
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
      },
      error: null,
    });

    // 3. zen_order_services Insert Mock
    activeMockSupabase.selectPromiseResult = {
      data: [{ id: 'order-service-1' }],
      error: null,
    };

    const services = [
      {
        service_type: 'TRANSPORT',
        provider_id: 'carrier-1',
        rate_card_id: 'rate-1',
        quoted_cost: 1500,
        currency: 'USD',
      },
    ];

    const result = await createOrderServices(mockOrderId, services);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
  });

  it('[TC-P6-ORDERUI-02] 비활성(is_active = false) 요율 카드가 포함된 경우 차단(Error)된다', async () => {
    // 1. Order 조회 Mock
    activeMockSupabase.single.mockResolvedValueOnce({
      data: { shipper_id: 'shipper-1' },
      error: null,
    });

    // 2. Transport 요율 조회 Mock (is_active: false)
    activeMockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'rate-inactive',
        is_active: false,
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
      },
      error: null,
    });

    const services = [
      {
        service_type: 'TRANSPORT',
        provider_id: 'carrier-1',
        rate_card_id: 'rate-inactive',
        quoted_cost: 1500,
        currency: 'USD',
      },
    ];

    const result = await createOrderServices(mockOrderId, services);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Transportation rate card is inactive');
  });

  it('[TC-P6-ORDERUI-03] 유효기간(valid_until)이 만료된 요율 카드가 포함된 경우 차단(Error)된다', async () => {
    // 1. Order 조회 Mock
    activeMockSupabase.single.mockResolvedValueOnce({
      data: { shipper_id: 'shipper-1' },
      error: null,
    });

    // 2. Transport 요율 조회 Mock (expired)
    activeMockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'rate-expired',
        is_active: true,
        valid_from: '2025-01-01',
        valid_until: '2025-12-31',
      },
      error: null,
    });

    const services = [
      {
        service_type: 'TRANSPORT',
        provider_id: 'carrier-1',
        rate_card_id: 'rate-expired',
        quoted_cost: 1500,
        currency: 'USD',
      },
    ];

    const result = await createOrderServices(mockOrderId, services);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Transportation rate card has expired or is not yet valid');
  });
});
