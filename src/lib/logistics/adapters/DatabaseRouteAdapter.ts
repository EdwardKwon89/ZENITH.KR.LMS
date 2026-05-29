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

  async getPotentialRoutes(origin: string, dest: string, transportMode?: string): Promise<Omit<RouteOption, 'option_type' | 'score'>[]> {
    const results: Omit<RouteOption, 'option_type' | 'score'>[] = [];

    await this.appendDirectRoutes(origin, dest, results, transportMode);

    await this.appendHubRoutes(origin, dest, results, transportMode);

    return results;
  }

  private async appendDirectRoutes(
    origin: string, dest: string,
    results: Omit<RouteOption, 'option_type' | 'score'>[],
    transportMode?: string
  ): Promise<void> {
    let query = this.supabase
      .from('zen_route_network')
      .select(`
        *,
        carrier:zen_carriers!carrier_id(code, name, transport_mode)
      `)
      .eq('is_active', true)
      .eq('from_port_id', origin)
      .eq('to_port_id', dest);

    if (transportMode) query = query.eq('transport_mode', transportMode);

    const { data: routes, error } = await query;

    if (error || !routes || !Array.isArray(routes)) return;

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
          carrier_id: r.carrier_id,
          transit_days: r.transit_days,
          cost,
          currency: 'USD',
        }],
        total_cost: cost,
        total_transit_days: r.transit_days,
      });
    }
  }

  private async appendHubRoutes(
    origin: string, dest: string,
    results: Omit<RouteOption, 'option_type' | 'score'>[],
    transportMode?: string
  ): Promise<void> {
    let leg1Query = this.supabase
      .from('zen_route_network')
      .select(`
        *,
        carrier:zen_carriers!carrier_id(code, name, transport_mode)
      `)
      .eq('is_active', true)
      .eq('from_port_id', origin);

    if (transportMode) leg1Query = leg1Query.eq('transport_mode', transportMode);

    const { data: leg1Routes, error: leg1Err } = await leg1Query;

    if (leg1Err || !leg1Routes || !Array.isArray(leg1Routes) || leg1Routes.length === 0) return;

    const leg1Rows = leg1Routes as unknown as RouteNetworkRow[];
    const hubs = [...new Set(leg1Rows.map(r => r.to_port_id))];

    for (const hub of hubs) {
      if (hub === dest) continue;

      let leg2Query = this.supabase
        .from('zen_route_network')
        .select(`
          *,
          carrier:zen_carriers!carrier_id(code, name, transport_mode)
        `)
        .eq('is_active', true)
        .eq('from_port_id', hub)
        .eq('to_port_id', dest);

      if (transportMode) leg2Query = leg2Query.eq('transport_mode', transportMode);

      const { data: leg2Routes, error: leg2Err } = await leg2Query;

      if (leg2Err || !leg2Routes || !Array.isArray(leg2Routes) || leg2Routes.length === 0) continue;

      // leg1과 leg2의 모든 조합을 RouteOption으로 조합
      for (const l1 of leg1Rows.filter(r => r.to_port_id === hub)) {
        for (const l2 of leg2Routes as unknown as RouteNetworkRow[]) {
          const carrier1 = l1.carrier;
          const carrier2 = l2.carrier;
          const carrierName1 = carrier1?.name || 'Unknown Carrier';
          const carrierName2 = carrier2?.name || 'Unknown Carrier';

          const cost1 = await this.lookupRate(l1.carrier_id, l1.transport_mode);
          const cost2 = await this.lookupRate(l2.carrier_id, l2.transport_mode);
          const combinedCost = cost1 + cost2;
          const combinedDays = l1.transit_days + l2.transit_days;

          // 직항 결과와 동일한 (hub, dest) 조합은 중복 제거
          const isDuplicate = results.some(existing =>
            existing.segments.length === 2 &&
            existing.segments[0].from_port_id === origin &&
            existing.segments[0].to_port_id === hub &&
            existing.segments[1].from_port_id === hub &&
            existing.segments[1].to_port_id === dest
          );
          if (isDuplicate) continue;

          results.push({
            segments: [
              {
                transport_mode: l1.transport_mode as RouteSegment['transport_mode'],
                from_port_id: l1.from_port_id,
                to_port_id: l1.to_port_id,
                carrier: carrierName1,
                carrier_id: l1.carrier_id,
                transit_days: l1.transit_days,
                cost: cost1,
                currency: 'USD',
              },
              {
                transport_mode: l2.transport_mode as RouteSegment['transport_mode'],
                from_port_id: l2.from_port_id,
                to_port_id: l2.to_port_id,
                carrier: carrierName2,
                carrier_id: l2.carrier_id,
                transit_days: l2.transit_days,
                cost: cost2,
                currency: 'USD',
              },
            ],
            total_cost: combinedCost,
            total_transit_days: combinedDays,
          });
        }
      }
    }
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
