import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCostProfitStats } from '@/app/actions/statistics';
import { createClient } from '@/utils/supabase/server';
import { validateAdminAction } from '@/lib/auth/guards';

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
}));

describe('Statistics Server Actions', () => {
  let mockSupabase: any;
  const mockUser = { id: 'admin-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
    };

    (validateAdminAction as any).mockResolvedValue({ 
      supabase: mockSupabase, 
      user: mockUser 
    });
  });

  it('TC-STAT-01: getCostProfitStats(\'MONTH\') — statsByMode 배열 AIR/SEA/CIR 3종 반환', async () => {
    // Mock revenue data
    mockSupabase.gte.mockResolvedValueOnce({ 
      data: [
        { total_amount: 1000, order: { trans_mode: 'AIR' } },
        { total_amount: 2000, order: { trans_mode: 'SEA' } }
      ], 
      error: null 
    });
    
    // Mock cost data
    mockSupabase.gte.mockResolvedValueOnce({ 
      data: [
        { total_amount: 800, order: { trans_mode: 'AIR' } }
      ], 
      error: null 
    });

    const result = await getCostProfitStats('MONTH');

    expect(result.statsByMode.length).toBe(3);
    const airStats = result.statsByMode.find(s => s.mode === 'AIR');
    expect(airStats?.revenue).toBe(1000);
    expect(airStats?.cost).toBe(800);
    expect(airStats?.profit).toBe(200);
  });

  it('TC-STAT-02: getCostProfitStats 마진율 — revenue > 0 시 margin = (rev-cost)/rev*100', async () => {
    // 1000 revenue, 600 cost => 400 profit (40% margin)
    mockSupabase.gte.mockResolvedValueOnce({ 
      data: [{ total_amount: 1000, order: { trans_mode: 'AIR' } }], 
      error: null 
    });
    mockSupabase.gte.mockResolvedValueOnce({ 
      data: [{ total_amount: 600, order: { trans_mode: 'AIR' } }], 
      error: null 
    });

    const result = await getCostProfitStats('MONTH');
    const airStats = result.statsByMode.find(s => s.mode === 'AIR');
    
    expect(airStats?.margin).toBe(40);
  });
});
