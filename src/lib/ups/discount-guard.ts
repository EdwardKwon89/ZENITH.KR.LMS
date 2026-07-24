import type { SupabaseClient } from '@supabase/supabase-js';

export async function validateAgencyReverseMargin(
  supabase: SupabaseClient,
  agencyOrgId: string,
  zoneId: string,
  shipperDiscountRate: number,
): Promise<string | null> {
  const { data } = await supabase
    .from('zen_agency_pricing_policies')
    .select('discount_rate')
    .eq('agency_org_id', agencyOrgId)
    .eq('zone_id', zoneId)
    .eq('is_active', true)
    .single();

  if (!data) return null;

  const agencyRate = Number(data.discount_rate);
  if (shipperDiscountRate > agencyRate) {
    return `등록하려는 화주 할인율(${(shipperDiscountRate * 100).toFixed(1)}%)이(가) 귀사의 대리점 할인율(${(agencyRate * 100).toFixed(1)}%)을 초과합니다.`;
  }

  return null;
}

export async function getMaxAllowedZoneDiscount(
  supabase: SupabaseClient,
  zoneId: string,
  productIds?: string[],
): Promise<number | null> {
  const baseQuery = supabase
    .from('zen_ups_base_rates')
    .select('cost_price, selling_price')
    .eq('zone_id', zoneId);
  const tierQuery = supabase
    .from('zen_ups_weight_tier_rates')
    .select('price_per_kg_cost, price_per_kg_selling')
    .eq('zone_id', zoneId);
  const freightQuery = supabase
    .from('zen_ups_freight_minimums')
    .select('min_charge_cost, min_charge_selling')
    .eq('zone_id', zoneId);

  if (productIds && productIds.length > 0) {
    baseQuery.in('product_id', productIds);
    tierQuery.in('product_id', productIds);
    freightQuery.in('product_id', productIds);
  }

  const [baseRates, tierRates, freightMinimums] = await Promise.all([
    baseQuery,
    tierQuery,
    freightQuery,
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
