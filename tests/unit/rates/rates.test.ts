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

    await expect(createRateCard({ card: {}, tiers: [], surcharges: [] }))
      .rejects.toThrow("요율 등록 권한이 없습니다.");
  });

  it('TC-RATES-02: should filter getRateCards by org_id for CARRIER role', async () => {
    (validateUserAction as any).mockResolvedValue({ 
      profile: mockCarrierProfile, 
      supabase: mockSupabase 
    });

    mockSupabase.then.mockImplementation((cb) => cb({ data: [], error: null }));

    await getRateCards();

    expect(mockSupabase.eq).toHaveBeenCalledWith("org_id", mockCarrierProfile.org_id);
  });

  it('TC-RATES-03: should restrict deleteRateCard to ADMIN only', async () => {
    (validateUserAction as any).mockResolvedValue({ 
      profile: { id: 'manager-1', role: USER_ROLES.MANAGER }, 
      supabase: mockSupabase 
    });

    await expect(deleteRateCard('card-123'))
      .rejects.toThrow("요율 삭제 권한은 관리자(ADMIN)만 가능합니다.");
  });

  it('TC-RATES-04: should handle TISA versioning (ACTIVE to SUPERSEDED) in createRateCard', async () => {
    (validateUserAction as any).mockResolvedValue({ 
      profile: mockAdminProfile, 
      supabase: mockSupabase 
    });

    // 1. Check existing rates
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: [{ id: 'old-1', version_no: 1 }], 
      error: null 
    }));
    
    // 2. Update existing to SUPERSEDED
    mockSupabase.then.mockImplementationOnce((cb) => cb({ data: null, error: null }));
    
    // 3. Insert new card
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: { id: 'new-1', version_no: 2 }, 
      error: null 
    }));

    const payload = {
      card: { carrier_id: 'carrier-org-123', origin_code: 'KRPUS', dest_code: 'USLAX', mode: 'SEA' },
      tiers: [],
      surcharges: []
    };

    const result = await createRateCard(payload);

    expect(mockSupabase.update).toHaveBeenCalledWith({ status: "SUPERSEDED" });
    expect(mockSupabase.in).toHaveBeenCalledWith("id", ['old-1']);
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      version_no: 2,
      status: "ACTIVE",
      org_id: 'carrier-org-123'
    }));
    expect(result.id).toBe('new-1');
  });
});
