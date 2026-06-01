import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRateCard, deleteRateCard, getRateCards } from '@/app/actions/rates';
import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Rates Actions Unit Tests', () => {
  const mockAdminProfile = { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'sntl-org' };
  const mockCarrierProfile = { id: 'carrier-1', role: USER_ROLES.CARRIER, org_id: 'carrier-org-123' };
  
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.then.mockReset();
  });

  it('TC-RATES-01: should restrict createRateCard to ADMIN or MANAGER', async () => {
    (validateUserAction as any).mockResolvedValue({ 
      profile: { id: 'user-1', role: USER_ROLES.CARRIER }, 
      supabase: mockSupabase 
    });

    const result = await createRateCard({ card: { carrier_id: 'c-1', transport_mode: 'AIR' } as any, surcharges: [] });
    expect(result.data).toBeNull();
    expect(result.error).toBe("요율 등록 권한이 없습니다.");
  });

  it('TC-RATES-02: should return all rate cards for ADMIN role', async () => {
    (validateUserAction as any).mockResolvedValue({ 
      profile: mockAdminProfile, 
      supabase: mockSupabase 
    });

    mockSupabase.range.mockResolvedValueOnce({ data: [], error: null, count: 0 });

    await getRateCards();

    expect(mockSupabase.order).toHaveBeenCalled();
  });

  it('TC-RATES-03: should restrict deleteRateCard to ADMIN only', async () => {
    (validateUserAction as any).mockResolvedValue({ 
      profile: { id: 'manager-1', role: USER_ROLES.MANAGER }, 
      supabase: mockSupabase 
    });

    const result = await deleteRateCard('card-123');
    expect(result.data).toBeNull();
    expect(result.error).toBe("요율 삭제 권한은 관리자(ADMIN)만 가능합니다.");
  });

  it('TC-RATES-04: should handle TISA deactivation of existing active cards on createRateCard', async () => {
    (validateUserAction as any).mockResolvedValue({ 
      profile: mockAdminProfile, 
      supabase: mockSupabase 
    });

    // 1. Check existing active rate cards (carrier_id + transport_mode + is_active)
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: [{ id: 'old-1', tiers: [] }], 
      error: null 
    }));
    
    // 2. Update existing to is_active = false
    mockSupabase.then.mockImplementationOnce((cb) => cb({ data: null, error: null }));
    
    // 3. Insert new card
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: { id: 'new-1' }, 
      error: null 
    }));

    const payload = {
      card: {
        carrier_id: 'carrier-uuid-1',
        transport_mode: 'SEA',
        tiers: [{ weight_min: 0, unit_price: 2.50 }],
        valid_from: '2026-06-01',
        carrier_cost: 1.80,
        margin_rate: 15.0,
        platform_fee_rate: 5.0,
      },
      surcharges: []
    };

    const result = await createRateCard(payload);

    expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: false });
    expect(mockSupabase.in).toHaveBeenCalledWith("id", ['old-1']);
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      carrier_id: 'carrier-uuid-1',
      transport_mode: 'SEA',
      is_active: true,
      carrier_cost: 1.80,
      margin_rate: 15.0,
      platform_fee_rate: 5.0,
    }));
    expect(result.data.id).toBe('new-1');
  });
});
