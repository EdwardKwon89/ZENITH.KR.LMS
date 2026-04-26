import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getInventoryList, adjustInventory, getInventoryHistory } from '@/app/actions/inventory';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('ZENITH Logistics: Inventory Management Logic', () => {
  const mockUser = { id: 'user-123' };
  const mockProfile = { id: 'user-123', org_id: 'org-456', role: 'ADMIN' };
  
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    (validateUserAction as any).mockResolvedValue({ 
      user: mockUser, 
      profile: mockProfile, 
      supabase: mockSupabase 
    });

    (validateAdminAction as any).mockResolvedValue({ 
      user: mockUser, 
      profile: mockProfile, 
      supabase: mockSupabase 
    });
  });

  it('TC-I.1: [Success] 일반 사용자의 재고 조회는 조직 ID로 필터링되어야 함', async () => {
    // Given — non-admin user with org_id
    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: { ...mockProfile, role: 'MEMBER' },
      supabase: mockSupabase
    });
    mockSupabase.range.mockResolvedValue({
      data: [{ id: 'inv-1', sku_code: 'SKU-001' }],
      count: 1,
      error: null
    });

    // When
    const result = await getInventoryList({ page: 1, pageSize: 10, lowStockOnly: false });

    // Then — non-admin must filter by org_id
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_inventory');
    expect(mockSupabase.eq).toHaveBeenCalledWith('org_id', mockProfile.org_id);
    expect(result.items).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });

  it('TC-I.4: [Success] Admin/ZENITH_SUPER_ADMIN은 org_id 필터 없이 전체 재고를 조회해야 함', async () => {
    // Given — admin user (org_id=null in real scenario)
    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: { ...mockProfile, role: 'ZENITH_SUPER_ADMIN', org_id: null },
      supabase: mockSupabase
    });
    mockSupabase.range.mockResolvedValue({
      data: [{ id: 'inv-1' }, { id: 'inv-2' }],
      count: 2,
      error: null
    });

    // When
    const result = await getInventoryList({ page: 1, pageSize: 10, lowStockOnly: false });

    // Then — admin must NOT apply org_id filter
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_inventory');
    expect(mockSupabase.eq).not.toHaveBeenCalledWith('org_id', expect.anything());
    expect(result.items).toHaveLength(2);
  });

  it('TC-I.2: [Success] 관리자가 재고 조정 시 이력이 기록되어야 함', async () => {
    // Given
    const inventoryId = '550e8400-e29b-41d4-a716-446655440000';
    mockSupabase.single.mockResolvedValue({ 
      data: { on_hand_qty: 100 }, 
      error: null 
    });
    mockSupabase.update.mockReturnThis();
    // First eq() is for the select().single() chain -> return this
    // Second eq() is for the update() chain -> return promise
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase) // for select
      .mockResolvedValueOnce({ error: null }); // for update
    mockSupabase.insert.mockResolvedValue({ error: null });

    const payload = {
      inventoryId,
      adjustmentQty: 50,
      reason: 'Regular audit'
    };

    // When
    const result = await adjustInventory(payload);

    // Then
    expect(result.success).toBe(true);
    expect(result.finalQty).toBe(150);
    
    // Check if history was recorded
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_inventory_history');
    const historyCall = mockSupabase.insert.mock.calls[0][0];
    expect(historyCall.change_qty).toBe(50);
    expect(historyCall.result_qty).toBe(150);
    expect(historyCall.remarks).toBe('Regular audit');
    
    expect(revalidatePath).toHaveBeenCalled();
  });

  it('TC-I.3: [Failure] 재고 수량이 0 미만이 되는 조정은 실패해야 함', async () => {
    // Given
    const inventoryId = '550e8400-e29b-41d4-a716-446655440000';
    mockSupabase.single.mockResolvedValue({ 
      data: { on_hand_qty: 30 }, 
      error: null 
    });

    const payload = {
      inventoryId,
      adjustmentQty: -50,
      reason: 'Typo correction'
    };

    // When & Then
    const result = await adjustInventory(payload);
    expect(result).toEqual({ success: false, error: '재고 수량은 0 미만이 될 수 없습니다.' });
  });
});
