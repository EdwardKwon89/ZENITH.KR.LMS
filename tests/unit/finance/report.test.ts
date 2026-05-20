import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRevenueReport, getCostReport, upsertTransportCost, getOrderDocumentData } from '@/app/actions/finance';
import { getVesselSchedules } from '@/app/actions/schedules';
import { createClient } from '@/utils/supabase/server';
import { validateAdminAction } from '@/lib/auth/guards';

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: any) => fn),
}));

describe('Finance & Schedules Report Actions', () => {
  let mockSupabase: any;
  const mockUser = { id: 'admin-123' };
  const mockProfile = { id: 'admin-123', role: 'ADMIN', org_id: 'org-admin' };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      mockResolvedValue: vi.fn().mockReturnThis(),
    };

    // Helper to mock different final responses
    const createMockResponse = (data: any, error: any = null) => ({ data, error });

    (createClient as any).mockImplementation(() => Promise.resolve(mockSupabase));
    (validateAdminAction as any).mockResolvedValue({ 
      supabase: mockSupabase, 
      user: mockUser, 
      profile: mockProfile 
    });
  });

  it('TC-FIN7-01: getRevenueReport — startDate 필터 시 해당 기간 데이터만 반환', async () => {
    const filters = {
      startDate: '2026-04-01T00:00:00Z',
      endDate: '2026-04-30T23:59:59Z'
    };

    const mockData = [
      { id: '1', total_amount: 1000, created_at: '2026-04-10T10:00:00Z', shipper: { name: 'Org A' }, order: { trans_mode: 'AIR' } }
    ];

    mockSupabase.order.mockResolvedValueOnce({ data: mockData, error: null })
      .mockResolvedValueOnce({ data: mockData, error: null });

    const result = await getRevenueReport(filters);

    expect(mockSupabase.from).toHaveBeenCalledWith('zen_invoices');
    expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', filters.startDate);
    expect(mockSupabase.lte).toHaveBeenCalledWith('created_at', filters.endDate);
    expect(result.summary.totalRevenue).toBe(1000);
    expect(result.items.length).toBe(1);
  });

  it('TC-FIN7-02: getCostReport — serviceType 필터 시 해당 모드 데이터만 반환', async () => {
    const filters = {
      startDate: '2026-04-01T00:00:00Z',
      endDate: '2026-04-30T23:59:59Z',
      serviceType: 'OCEAN_FREIGHT'
    };

    const mockData = [
      { id: 'c1', total_amount: 500, cost_type: 'OCEAN_FREIGHT', created_at: '2026-04-10T10:00:00Z' }
    ];

    mockSupabase.order.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await getCostReport(filters);

    expect(mockSupabase.from).toHaveBeenCalledWith('zen_order_costs');
    expect(mockSupabase.eq).toHaveBeenCalledWith('cost_type', 'OCEAN_FREIGHT');
    expect(result.summary.totalCost).toBe(500);
  });

  it('TC-FIN7-03: upsertTransportCost — 신규 등록 시 { success: true, data } 반환', async () => {
    const payload = { order_id: '550e8400-e29b-41d4-a716-446655440001', cost_type: 'OCEAN_FREIGHT', amount: 200 };
    const mockSaved = { id: 'tc-123', ...payload };

    mockSupabase.single.mockResolvedValueOnce({ data: mockSaved, error: null });

    const result = await upsertTransportCost(payload);

    expect(mockSupabase.from).toHaveBeenCalledWith('zen_transport_costs');
    expect(mockSupabase.upsert).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.data.id).toBe('tc-123');
  });

  it('TC-FIN7-04: getVesselSchedules — originPortId 필터 동작 검증', async () => {
    const filters = { originPortId: 'port-789' };
    const mockSchedules = [{ id: 's1', origin_port_id: 'port-789', etd: '2026-05-01T10:00:00Z' }];

    mockSupabase.order.mockResolvedValueOnce({ data: mockSchedules, error: null });

    const result = await getVesselSchedules(filters);

    expect(mockSupabase.from).toHaveBeenCalledWith('zen_vessel_schedules');
    expect(mockSupabase.eq).toHaveBeenCalledWith('origin_port_id', 'port-789');
    expect(result.length).toBe(1);
  });
});
