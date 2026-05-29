import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMasterOrderStatus, dissolveMasterOrder, updateOrderStatus } from '@/app/actions/orders';
import { validateUserAction } from '@/lib/auth/guards';
import { OrderStatus } from '@/types/orders';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

describe('ZENITH Master Order: Policy & Integrity Audit', () => {
  const createMockSupabase = () => {
    const mock: any = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
    };
    return mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-MP.1: [Auto-Dissolve] 마스터 취소 시 하위 오더가 REGISTERED로 자동 해체되어야 함', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase, user: { id: 'test-user-123' } });

    // 0. findMasterById chain (new IMP-051 audit): eq() returns chain, single() returns data
    supabase.eq.mockReturnValueOnce(supabase);
    supabase.single.mockResolvedValueOnce({ data: { status: 'CREATED' }, error: null });

    // 1. Master status update: CREATED -> CANCELED
    supabase.update.mockReturnValueOnce(supabase); 
    supabase.eq.mockReturnValueOnce({ error: null });

    // 2. Child orders auto-dissolve update
    supabase.update.mockReturnValueOnce(supabase);
    supabase.eq.mockReturnValueOnce({ error: null });

    // 3. Audit history insert (best-effort)
    supabase.insert.mockReturnValueOnce({ error: null });

    const result = await updateMasterOrderStatus('m-123', 'CANCELED', 'CEO Direct Order');

    expect(result.success).toBe(true);
    // 두 번의 update 호출 확인 (1: 마스터 상태, 2: 하위 오더 해체)
    expect(supabase.update).toHaveBeenCalledTimes(2);
    expect(supabase.update).toHaveBeenLastCalledWith({
      master_order_id: null,
      status: OrderStatus.REGISTERED
    });
  });

  it('TC-MP.2: [Manual-Dissolve] 수동 해체 시 하위 오더가 REGISTERED 상태로 복구되어야 함', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase, user: { id: 'test-user-456' } });

    // Mock RPC call
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await dissolveMasterOrder('m-456');

    expect(result.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('dissolve_master_order_atomic', {
      p_master_order_id: 'm-456',
      p_user_id: 'test-user-456'
    });
  });

  it('TC-MP.3: [Immutable-Guard] 마스터 결합 오더는 개별 상태 변경이 차단되어야 함', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ 
      supabase,
      profile: { role: 'OPERATOR' } 
    });

    // 1. master_order_id 존재 확인 (Guard check)
    supabase.maybeSingle.mockResolvedValueOnce({ 
      data: { master_order_id: 'm-789' }, 
      error: null 
    });

    await expect(updateOrderStatus('h-101', OrderStatus.SCHEDULED))
      .rejects.toThrow(/마스터 오더에 결합된 상태입니다/);
  });

  it('TC-ORDER-RLS-01: [Role-Guard] 관리자/운영자 이외의 역할은 오더 정보를 업데이트할 수 없어야 함', async () => {
    const supabase = createMockSupabase();
    // Simulate CUSTOMER role
    (validateUserAction as any).mockResolvedValue({ 
      supabase,
      profile: { role: 'CUSTOMER' } 
    });

    // 1. master_order_id 존재 확인 (Guard check)
    supabase.maybeSingle.mockResolvedValueOnce({ 
      data: { master_order_id: null }, 
      error: null 
    });

    // 2. 현재 상태 조회 (Status machine check)
    supabase.single.mockResolvedValueOnce({
      data: { status: OrderStatus.REGISTERED, transport_mode: 'AIR' },
      error: null
    });

    // 3. SCHEDULED 가드: route_option_id 확인
    supabase.maybeSingle.mockResolvedValueOnce({
      data: { route_option_id: 'route-id' },
      error: null
    });

    // We expect the guard or the action to block this before it even hits the DB update
    // because of the role-based check in the server action.
    await expect(updateOrderStatus('h-101', OrderStatus.SCHEDULED))
      .rejects.toThrow(/권한이 없습니다/);
  });
});
