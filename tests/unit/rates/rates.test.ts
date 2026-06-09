import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRateCard, deleteRateCard, getRateCards, updateRateCard } from '@/app/actions/rates';
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
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
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

  it('TC-RATES-01: should allow MANAGER to create rate cards', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: { id: 'manager-1', role: USER_ROLES.MANAGER, org_id: 'sntl-org' },
      supabase: mockSupabase,
    });

    // 1. Check existing active rate cards — none
    mockSupabase.then.mockImplementationOnce((cb: any) => cb({ data: [], error: null }));
    // 2. Insert new card
    mockSupabase.then.mockImplementationOnce((cb: any) => cb({ data: { id: 'new-card' }, error: null }));

    const payload = {
      card: {
        carrier_id: 'c-1', transport_mode: 'AIR',
        tiers: { weight_slabs: [{ weight_min: 0, unit_price: 10, min_charge: 0 }], cbm_slabs: [{ cbm_min: 0, cbm_price: 0, min_charge: 0 }] },
        valid_from: '2026-06-01',
      },
      surcharges: [],
    };

    const result = await createRateCard(payload);
    expect(result.data.id).toBe('new-card');
    expect(result.error).toBeNull();
  });

  it('TC-P6-CARRIER-01: should allow CARRIER to create rate card for own carrier', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: mockCarrierProfile,
      supabase: mockSupabase,
    });

    // 1. zen_carriers lookup (own carrier match)
    mockSupabase.then.mockImplementationOnce((cb: any) => cb({ data: { id: 'my-carrier-uuid' }, error: null }));
    // 2. Check existing active rate cards — none
    mockSupabase.then.mockImplementationOnce((cb: any) => cb({ data: [], error: null }));
    // 3. Insert new card
    mockSupabase.then.mockImplementationOnce((cb: any) => cb({ data: { id: 'carrier-card' }, error: null }));

    const payload = {
      card: {
        carrier_id: 'my-carrier-uuid', transport_mode: 'SEA',
        tiers: { weight_slabs: [{ weight_min: 0, unit_price: 10, min_charge: 0 }], cbm_slabs: [{ cbm_min: 0, cbm_price: 0, min_charge: 0 }] },
        valid_from: '2026-06-01',
      },
      surcharges: [],
    };

    const result = await createRateCard(payload);
    expect(result.data.id).toBe('carrier-card');
    expect(result.error).toBeNull();
  });

  it('TC-P6-CARRIER-02: should reject CARRIER creating rate card for other carrier', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: mockCarrierProfile,
      supabase: mockSupabase,
    });

    // 1. zen_carriers lookup (own carrier)
    mockSupabase.then.mockImplementationOnce((cb: any) => cb({ data: { id: 'my-carrier-uuid' }, error: null }));

    const payload = {
      card: {
        carrier_id: 'other-carrier-uuid', transport_mode: 'SEA',
        tiers: { weight_slabs: [{ weight_min: 0, unit_price: 10, min_charge: 0 }], cbm_slabs: [{ cbm_min: 0, cbm_price: 0, min_charge: 0 }] },
        valid_from: '2026-06-01',
      },
      surcharges: [],
    };

    const result = await createRateCard(payload);
    expect(result.data).toBeNull();
    expect(result.error).toBe("본인 운송사 요율만 등록 가능합니다.");
  });

  it('TC-P6-CARRIER-03: should filter getRateCards to own carrier for CARRIER role', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: mockCarrierProfile,
      supabase: mockSupabase,
    });

    // 1. zen_carriers lookup
    mockSupabase.then.mockImplementationOnce((cb: any) => cb({ data: { id: 'my-carrier-uuid' }, error: null }));
    // 2. FindRateCards result
    mockSupabase.range.mockResolvedValueOnce({ data: [], error: null, count: 0 });

    await getRateCards({ transport_mode: 'AIR' });

    // Verify carrier_id filter was applied
    expect(mockSupabase.eq).toHaveBeenCalledWith('carrier_id', 'my-carrier-uuid');
  });

  it('TC-P6-CARRIER-04: should allow CARRIER to update own rate card', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: mockCarrierProfile,
      supabase: mockSupabase,
    });

    // 1. zen_rate_cards lookup (own card)
    mockSupabase.then.mockImplementationOnce((cb: any) => cb({ data: { carrier_id: 'my-carrier-uuid' }, error: null }));
    // 2. zen_carriers lookup
    mockSupabase.then.mockImplementationOnce((cb: any) => cb({ data: { id: 'my-carrier-uuid' }, error: null }));
    // 3. update succeeds
    mockSupabase.then.mockImplementationOnce((cb: any) => cb({ data: null, error: null }));

    const result = await updateRateCard('rate-card-1', { margin_rate: 20.0 });
    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
    expect(mockSupabase.update).toHaveBeenCalledWith({ margin_rate: 20.0 });
  });

  it('TC-P6-CARRIER-04b: should reject CARRIER updating other carrier rate card', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: mockCarrierProfile,
      supabase: mockSupabase,
    });

    // 1. zen_rate_cards lookup (other carrier's card)
    mockSupabase.then.mockImplementationOnce((cb: any) => cb({ data: { carrier_id: 'other-carrier-uuid' }, error: null }));
    // 2. zen_carriers lookup (own carrier)
    mockSupabase.then.mockImplementationOnce((cb: any) => cb({ data: { id: 'my-carrier-uuid' }, error: null }));

    const result = await updateRateCard('rate-card-other', { margin_rate: 20.0 });
    expect(result.data).toBeNull();
    expect(result.error).toBe("본인 운송사 요율만 수정 가능합니다.");
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
        tiers: { weight_slabs: [{ weight_min: 0, unit_price: 2.50, min_charge: 0 }], cbm_slabs: [{ cbm_min: 0, cbm_price: 0, min_charge: 0 }] },
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

  it('TC-RATES-07: should auto-create route network when origin_port_id and dest_port_id are provided', async () => {
    (validateUserAction as any).mockResolvedValue({ 
      profile: mockAdminProfile, 
      supabase: mockSupabase 
    });

    // 1. Check existing active rate cards — none
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: [], 
      error: null 
    }));
    
    // 2. Insert new card
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: { id: 'new-card-1' }, 
      error: null 
    }));

    // 3. zen_ports lookup (for autoCreateRouteNetwork)
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: [
        { id: 'port-icn-uuid', code: 'ICN' },
        { id: 'port-jfk-uuid', code: 'JFK' },
      ], 
      error: null 
    }));

    // 4. zen_route_network upsert
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: null, 
      error: null 
    }));

    const payload = {
      card: {
        carrier_id: 'carrier-uuid-1',
        transport_mode: 'AIR',
        origin_port_id: 'port-icn-uuid',
        dest_port_id: 'port-jfk-uuid',
        tiers: { weight_slabs: [{ weight_min: 0, unit_price: 3.00, min_charge: 0 }], cbm_slabs: [{ cbm_min: 0, cbm_price: 0, min_charge: 0 }] },
        valid_from: '2026-06-01',
        carrier_cost: 2.00,
        margin_rate: 15.0,
        platform_fee_rate: 5.0,
      },
      surcharges: []
    };

    const result = await createRateCard(payload);
    expect(result.data.id).toBe('new-card-1');
    
    // Verify zen_ports were queried for UUID->CODE mapping
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ports');
    // Verify zen_route_network upsert was called
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_route_network');
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        carrier_id: 'carrier-uuid-1',
        from_port_id: 'ICN',
        to_port_id: 'JFK',
        transport_mode: 'AIR',
        is_active: true,
      }),
      expect.objectContaining({ onConflict: 'carrier_id,from_port_id,to_port_id,transport_mode' })
    );
  });

  it('TC-RATES-07b: should skip route network creation when ports are not provided (non-fatal)', async () => {
    (validateUserAction as any).mockResolvedValue({ 
      profile: mockAdminProfile, 
      supabase: mockSupabase 
    });

    // 1. Check existing active rate cards — none
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: [], 
      error: null 
    }));
    
    // 2. Insert new card
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: { id: 'new-card-2' }, 
      error: null 
    }));

    const payload = {
      card: {
        carrier_id: 'carrier-uuid-2',
        transport_mode: 'SEA',
        // no origin_port_id, no dest_port_id
        tiers: { weight_slabs: [{ weight_min: 0, unit_price: 1.50, min_charge: 0 }], cbm_slabs: [{ cbm_min: 0, cbm_price: 0, min_charge: 0 }] },
        valid_from: '2026-06-01',
        carrier_cost: 1.20,
        margin_rate: 15.0,
        platform_fee_rate: 5.0,
      },
      surcharges: []
    };

    const result = await createRateCard(payload);
    expect(result.data.id).toBe('new-card-2');
    // Should NOT query zen_ports or zen_route_network
    expect(mockSupabase.from).not.toHaveBeenCalledWith('zen_ports');
    expect(mockSupabase.from).not.toHaveBeenCalledWith('zen_route_network');
  });

  it('TC-RATES-07c: should preserve rate card creation even when route network upsert fails (non-fatal)', async () => {
    (validateUserAction as any).mockResolvedValue({ 
      profile: mockAdminProfile, 
      supabase: mockSupabase 
    });

    // 1. Check existing active rate cards — none
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: [], 
      error: null 
    }));
    
    // 2. Insert new card
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: { id: 'new-card-3' }, 
      error: null 
    }));

    // 3. zen_ports lookup succeeds
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: [
        { id: 'port-icn-uuid', code: 'ICN' },
        { id: 'port-lax-uuid', code: 'LAX' },
      ], 
      error: null 
    }));

    // 4. zen_route_network upsert FAILS (non-fatal)
    mockSupabase.then.mockImplementationOnce((cb) => cb({ 
      data: null, 
      error: { message: 'duplicate key violation', code: '23505' } 
    }));

    const payload = {
      card: {
        carrier_id: 'carrier-uuid-3',
        transport_mode: 'AIR',
        origin_port_id: 'port-icn-uuid',
        dest_port_id: 'port-lax-uuid',
        tiers: { weight_slabs: [{ weight_min: 0, unit_price: 2.00, min_charge: 0 }], cbm_slabs: [{ cbm_min: 0, cbm_price: 0, min_charge: 0 }] },
        valid_from: '2026-06-01',
        carrier_cost: 1.50,
        margin_rate: 10.0,
        platform_fee_rate: 5.0,
      },
      surcharges: []
    };

    // Rate card creation should still succeed despite route network failure
    const result = await createRateCard(payload);
    expect(result.data.id).toBe('new-card-3');
    expect(result.error).toBeNull();
  });
});
