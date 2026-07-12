import type { SupabaseClient } from '@supabase/supabase-js';

export async function getMaxAllowedZoneDiscount(
  supabase: SupabaseClient,
  zoneId: string,
): Promise<number | null> {
  const [baseRates, tierRates, freightMinimums] = await Promise.all([
    supabase
      .from('zen_ups_base_rates')
      .select('cost_price, selling_price')
      .eq('zone_id', zoneId)
      .gt('selling_price', 0),
    supabase
      .from('zen_ups_weight_tier_rates')
      .select('price_per_kg_cost, price_per_kg_selling')
      .eq('zone_id', zoneId)
      .gt('price_per_kg_selling', 0),
    supabase
      .from('zen_ups_freight_minimums')
      .select('min_charge_cost, min_charge_selling')
      .eq('zone_id', zoneId)
      .gt('min_charge_selling', 0),
  ]);

  const ratios: number[] = [];

  if (baseRates.data) {
    for (const r of baseRates.data) {
      ratios.push(1 - Number(r.cost_price) / Number(r.selling_price));
    }
  }
  if (tierRates.data) {
    for (const r of tierRates.data) {
      ratios.push(1 - Number(r.price_per_kg_cost) / Number(r.price_per_kg_selling));
    }
  }
  if (freightMinimums.data) {
    for (const r of freightMinimums.data) {
      ratios.push(1 - Number(r.min_charge_cost) / Number(r.min_charge_selling));
    }
  }

  if (ratios.length === 0) return null;

  const minRatio = Math.min(...ratios);
  return Math.max(0, minRatio);
}
