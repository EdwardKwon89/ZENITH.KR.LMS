import { SupabaseClient } from '@supabase/supabase-js';
import { IVirtualMapAdapter, RouteOption, RouteSegment } from '../routing';

interface RouteNetworkRow {
  id: string;
  carrier_id: string;
  from_port_id: string;
  to_port_id: string;
  transport_mode: string;
  transit_days: number;
  is_active: boolean;
  carrier?: { code: string; name: string; transport_mode: string } | null;
}

interface RateCardTier {
  weight_min: number;
  unit_price: number;
}

interface RateCardRow {
  id: string;
  carrier_id: string;
  transport_mode: string;
  currency: string;
  tiers: RateCardTier[];
  is_active: boolean;
}

export class DatabaseRouteAdapter implements IVirtualMapAdapter {
  constructor(private supabase: SupabaseClient) {}

  async getPotentialRoutes(origin: string, dest: string): Promise<Omit<RouteOption, 'option_type' | 'score'>[]> {
    const { data: routes, error } = await this.supabase
      .from('zen_route_network')
      .select(`
        *,
        carrier:zen_carriers!carrier_id(code, name, transport_mode)
      `)
      .eq('is_active', true)
      .eq('from_port_id', origin)
      .eq('to_port_id', dest);

    if (error || !routes || routes.length === 0) return [];

    const results: Omit<RouteOption, 'option_type' | 'score'>[] = [];

    for (const r of routes as unknown as RouteNetworkRow[]) {
      const carrier = r.carrier;
      const carrierName = carrier?.name || 'Unknown Carrier';

      const cost = await this.lookupRate(r.carrier_id, r.transport_mode);

      results.push({
        segments: [{
          transport_mode: r.transport_mode as RouteSegment['transport_mode'],
          from_port_id: r.from_port_id,
          to_port_id: r.to_port_id,
          carrier: carrierName,
          transit_days: r.transit_days,
          cost,
          currency: 'USD',
        }],
        total_cost: cost,
        total_transit_days: r.transit_days,
      });
    }

    return results;
  }

  private async lookupRate(carrierId: string, transportMode: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('zen_rate_cards')
      .select('tiers')
      .eq('carrier_id', carrierId)
      .eq('transport_mode', transportMode)
      .eq('is_active', true)
      .lte('valid_from', new Date().toISOString())
      .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return 0;

    const raw = data as { tiers: RateCardTier[] };
    const tiers = raw.tiers;
    if (!tiers || tiers.length === 0) return 0;

    return tiers[0].unit_price;
  }
}
