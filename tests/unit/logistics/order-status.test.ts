import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateOrderStatus } from '@/app/actions/orders';
import { validateUserAction } from '@/lib/auth/guards';
import { OrderStatus } from '@/types/orders';
import { USER_ROLES } from '@/lib/auth/rbac';

// Mock 의존성 설정
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

describe('ZENITH Logistics: Order Status Machine Action', () => {
  const mockUser = { id: 'user-123' };
  
  // 체이닝을 지원하는 Mock Supabase 생성 함수
  const createMockSupabase = () => {
    const mock: any = {
      from: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
      rpc: vi.fn(),
    };

    mock.from.mockReturnValue(mock);
    mock.select.mockReturnValue(mock);
    mock.eq.mockReturnValue(mock);
    mock.single.mockReturnValue(mock);
    mock.maybeSingle.mockReturnValue(mock);
    mock.update.mockReturnValue(mock);
    mock.insert.mockReturnValue(mock);
    mock.rpc.mockReturnValue(mock);
    
    return mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-S.1: [Success] OPERATOR는 REGISTERED에서 SCHEDULED로 상태를 변경할 수 있어야 함', async () => {
    const supabase = createMockSupabase();
    
    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: { role: USER_ROLES.OPERATOR },
      supabase
    });

    // 1. 마스터 결합 여부 확인 (ZEN_ORDERS maybeSingle)
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // 2. 현재 상태 조회용 (ZEN_ORDERS single)
    supabase.single.mockResolvedValueOnce({ data: { status: OrderStatus.REGISTERED } });
    // 3. SCHEDULED 가드: route_option_id 확인
    supabase.maybeSingle.mockResolvedValueOnce({ data: { route_option_id: 'route-id' }, error: null });
    // 4. RPC 호출용 (rpc)
    supabase.rpc.mockResolvedValueOnce({ error: null });

    const result = await updateOrderStatus('order-1', OrderStatus.SCHEDULED, '차량 배차 완료');

    expect(result.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('update_order_status_atomic', expect.anything());
  });

  it('TC-S.2: [Failure] SHIPPER(CORPORATE)는 WAREHOUSED 이후 상태를 변경할 수 없어야 함 (Immutable Guard)', async () => {
    const supabase = createMockSupabase();
    
    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: { role: USER_ROLES.CORPORATE },
      supabase
    });

    // [WBS 2.2] Immutable Guard check first
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // Current status check
    supabase.single.mockResolvedValueOnce({ data: { status: OrderStatus.WAREHOUSED } });

    await expect(updateOrderStatus('order-1', OrderStatus.CANCELED))
      .rejects.toThrow(/상태에서 CANCELED으로 변경할 수 없습니다/);
  });

  it('TC-S.3: [Failure] 유효하지 않은 상태 전이 시도 시 에러를 발생시켜야 함 (예: REGISTERED -> DELIVERED)', async () => {
    const supabase = createMockSupabase();
    
    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: { role: USER_ROLES.OPERATOR },
      supabase
    });

    // [WBS 2.2] Immutable Guard check first
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // Current status check
    supabase.single.mockResolvedValueOnce({ data: { status: OrderStatus.REGISTERED } });

    await expect(updateOrderStatus('order-1', OrderStatus.DELIVERED))
      .rejects.toThrow(/상태에서 DELIVERED으로 변경할 수 없습니다/);
  });
});
