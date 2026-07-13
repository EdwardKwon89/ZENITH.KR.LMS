import type { SupabaseClient } from '@supabase/supabase-js';

export async function getMaxAllowedZoneDiscount(
  supabase: SupabaseClient,
  zoneId: string,
): Promise<number | null> {
  const [baseRates, tierRates, freightMinimums] = await Promise.all([
    supabase
      .from('zen_ups_base_rates')
      .select('cost_price, selling_price')
      .eq('zone_id', zoneId),
    supabase
      .from('zen_ups_weight_tier_rates')
      .select('price_per_kg_cost, price_per_kg_selling')
      .eq('zone_id', zoneId),
    supabase
      .from('zen_ups_freight_minimums')
      .select('min_charge_cost, min_charge_selling')
      .eq('zone_id', zoneId),
  ]);

  const ratios: number[] = [];

  if (baseRates.data) {
    for (const r of baseRates.data) {
      const selling = Number(r.selling_price);
      const cost = Number(r.cost_price);
      if (selling > 0) ratios.push(1 - cost / selling);
    }
  }
  if (tierRates.data) {
    for (const r of tierRates.data) {
      const selling = Number(r.price_per_kg_selling);
      const cost = Number(r.price_per_kg_cost);
      if (selling > 0) ratios.push(1 - cost / selling);
    }
  }
  if (freightMinimums.data) {
    for (const r of freightMinimums.data) {
      const selling = Number(r.min_charge_selling);
      const cost = Number(r.min_charge_cost);
      if (selling > 0) ratios.push(1 - cost / selling);
    }
  }

  if (ratios.length === 0) return null;

  const minRatio = Math.min(...ratios);
  return Math.max(0, minRatio);
}
