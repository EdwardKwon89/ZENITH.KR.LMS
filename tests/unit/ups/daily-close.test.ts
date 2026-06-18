import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DailyCloseDateSchema,
  DailyCloseRangeSchema,
  getDailyOutboundSummary,
  getDailyRevenueSummary,
  getDailyCloseHistory,
} from '@/lib/actions/ups-daily-close';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

describe('TC-P7-CLOSE: UPS Daily Close Server Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      in: vi.fn(),
      order: vi.fn().mockReturnThis(),
    };

    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-001' },
      profile: { id: 'user-001', role: 'ADMIN' },
      supabase: mockSupabase,
    });
  });

  it('TC-P7-CLOSE-01: getDailyOutboundSummary — 정상 출고 데이터 집계', async () => {
    mockSupabase.lt.mockResolvedValueOnce({
      data: [{ order_id: 'ord-1' }, { order_id: 'ord-2' }],
      error: null,
    });
    mockSupabase.in
      .mockResolvedValueOnce({
        data: [
          { id: 'pkg-1', gross_weight: 10.5, order_id: 'ord-1' },
          { id: 'pkg-2', gross_weight: 5.2, order_id: 'ord-2' },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { id: 'ord-1', dest_port_id: 'port-1' },
          { id: 'ord-2', dest_port_id: 'port-2' },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { id: 'port-1', code: 'ICN', name: 'Incheon', nation_code: 'KR' },
          { id: 'port-2', code: 'LAX', name: 'Los Angeles', nation_code: 'US' },
        ],
        error: null,
      });

    const result = await getDailyOutboundSummary('2026-06-17');

    expect(result.totalPkgs).toBe(2);
    expect(result.totalWeight).toBe(15.7);
    expect(result.zoneDistribution).toHaveLength(2);
    expect(result.zoneDistribution).toContainEqual({ zone: 'ICN', count: 1 });
    expect(result.zoneDistribution).toContainEqual({ zone: 'LAX', count: 1 });
  });

  it('TC-P7-CLOSE-02: getDailyOutboundSummary — 출고 데이터 없음', async () => {
    mockSupabase.lt.mockResolvedValueOnce({ data: [], error: null });

    const result = await getDailyOutboundSummary('2026-06-17');

    expect(result.totalPkgs).toBe(0);
    expect(result.totalWeight).toBe(0);
    expect(result.zoneDistribution).toEqual([]);
  });

  it('TC-P7-CLOSE-03: getDailyRevenueSummary — 매출/매입 집계 정확도', async () => {
    mockSupabase.lt.mockResolvedValueOnce({
      data: [{ order_id: 'ord-1' }, { order_id: 'ord-2' }],
      error: null,
    });
    mockSupabase.in
      .mockResolvedValueOnce({
        data: [
          { order_id: 'ord-1', applied_unit_price: 150, carrier_cost_amount: 80, platform_fee_amount: 10 },
          { order_id: 'ord-2', applied_unit_price: 200, carrier_cost_amount: 100, platform_fee_amount: 15 },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { order_id: 'ord-1' },
          { order_id: 'ord-1' },
          { order_id: 'ord-2' },
        ],
        error: null,
      });

    const result = await getDailyRevenueSummary('2026-06-17');

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].revenue).toBe(350);
    expect(result.rows[0].cost).toBe(205);
    expect(result.rows[0].margin).toBe(145);
    expect(result.rows[0].marginRate).toBe(41.43);
    expect(result.rows[0].pkgCount).toBe(3);
  });

  it('TC-P7-CLOSE-04: getDailyCloseHistory — 기간 조회 및 일자별 그룹핑', async () => {
    mockSupabase.order.mockResolvedValueOnce({
      data: [
        { order_id: 'ord-1', created_at: '2026-06-15T10:00:00' },
        { order_id: 'ord-2', created_at: '2026-06-15T14:00:00' },
        { order_id: 'ord-3', created_at: '2026-06-16T09:00:00' },
      ],
      error: null,
    });
    mockSupabase.in
      .mockResolvedValueOnce({
        data: [
          { applied_unit_price: 100, carrier_cost_amount: 50, platform_fee_amount: 5 },
          { applied_unit_price: 120, carrier_cost_amount: 60, platform_fee_amount: 8 },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { applied_unit_price: 200, carrier_cost_amount: 100, platform_fee_amount: 10 },
        ],
        error: null,
      });

    const result = await getDailyCloseHistory('2026-06-15', '2026-06-16');

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].date).toBe('2026-06-15');
    expect(result.rows[0].revenue).toBe(220);
    expect(result.rows[0].cost).toBe(123);
    expect(result.rows[1].date).toBe('2026-06-16');
    expect(result.rows[1].revenue).toBe(200);
    expect(result.rows[1].cost).toBe(110);
  });
});
