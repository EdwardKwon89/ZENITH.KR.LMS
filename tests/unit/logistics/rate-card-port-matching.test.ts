import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TISARateMatcher } from '@/lib/logistics/composite-pricing';

describe('TC-R-09: Rate Card Port-Based Matching', () => {
  let mockSupabase: any;
  let queryChain: any;

  beforeEach(() => {
    vi.clearAllMocks();

    queryChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockSupabase = {
      from: vi.fn().mockReturnValue(queryChain),
    };
  });

  it('TC-R-09-01: should add origin_port_id OR condition when originPortId is provided', async () => {
    const matcher = new TISARateMatcher(mockSupabase as any);
    await matcher.matchRateCard('carrier-1', 'AIR' as any, 'port-icn');

    expect(mockSupabase.from).toHaveBeenCalledWith('zen_rate_cards');
    expect(queryChain.eq).toHaveBeenCalledWith('carrier_id', 'carrier-1');
    expect(queryChain.eq).toHaveBeenCalledWith('transport_mode', 'AIR');
    expect(queryChain.eq).toHaveBeenCalledWith('is_active', true);
    expect(queryChain.or).toHaveBeenCalledWith(expect.stringMatching(/origin_port_id\.is\.null,origin_port_id\.eq\.port-icn/));
  });

  it('TC-R-09-02: should add both origin and dest port OR conditions when both provided', async () => {
    const matcher = new TISARateMatcher(mockSupabase as any);
    await matcher.matchRateCard('carrier-1', 'SEA' as any, 'port-icn', 'port-lax');

    expect(queryChain.or).toHaveBeenCalledWith(expect.stringMatching(/origin_port_id\.is\.null,origin_port_id\.eq\.port-icn/));
    expect(queryChain.or).toHaveBeenCalledWith(expect.stringMatching(/dest_port_id\.is\.null,dest_port_id\.eq\.port-lax/));
  });

  it('TC-R-09-03: should not add port OR conditions when ports are omitted', async () => {
    const matcher = new TISARateMatcher(mockSupabase as any);
    await matcher.matchRateCard('carrier-1', 'AIR' as any);

    const orCalls = queryChain.or.mock.calls.filter(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('port_id')
    );
    expect(orCalls.length).toBe(0);
  });

  it('TC-R-09-04: should order by valid_from DESC for port priority', async () => {
    const matcher = new TISARateMatcher(mockSupabase as any);
    await matcher.matchRateCard('carrier-1', 'AIR' as any, 'port-icn');

    expect(queryChain.order).toHaveBeenCalledWith('valid_from', { ascending: false });
    expect(queryChain.limit).toHaveBeenCalledWith(1);
  });

  it('TC-R-09-05: should return matching rate card when port-specific card exists', async () => {
    queryChain.maybeSingle.mockResolvedValueOnce({
      data: { id: 'rate-1', tiers: [{ weight_min: 0, unit_price: 10 }], currency: 'USD' },
      error: null,
    });

    const matcher = new TISARateMatcher(mockSupabase as any);
    const result = await matcher.matchRateCard('carrier-1', 'AIR' as any, 'port-icn');

    expect(result).not.toBeNull();
    expect((result as any)!.id).toBe('rate-1');
  });

  it('TC-R-09-06: should return null when no rate card matches', async () => {
    queryChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const matcher = new TISARateMatcher(mockSupabase as any);
    const result = await matcher.matchRateCard('carrier-1', 'AIR' as any, 'port-nonexistent');

    expect(result).toBeNull();
  });

  it('TC-R-09-07: should return null on supabase error', async () => {
    queryChain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const matcher = new TISARateMatcher(mockSupabase as any);
    const result = await matcher.matchRateCard('carrier-1', 'AIR' as any);

    expect(result).toBeNull();
  });
});
