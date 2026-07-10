'use server';

import { createClient } from '@/utils/supabase/server';
import { validateUserAction, checkPermission } from '@/lib/auth/guards';
import { computeShipperFreight } from '@/lib/ups/shipper-pricing';
import type { UpsZone, UpsProduct } from '@/types/ups';

export interface ShipperRateRow {
  zone: { zone_code: string; zone_name: string };
  product: { product_code: string; product_name: string; cargo_type: string };
  weight_kg: number;
  platform_selling_price: number;
  final_freight: number;
  currency: string;
}

export interface ShipperUpsRatesData {
  zones: Pick<UpsZone, 'id' | 'zone_code' | 'zone_name'>[];
  products: Pick<UpsProduct, 'id' | 'product_code' | 'product_name' | 'cargo_type'>[];
  rates: ShipperRateRow[];
  shipperDiscountRate: number;
}

export async function getShipperUpsRatesData(): Promise<ShipperUpsRatesData> {
  const { supabase, profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/ups-rates')) {
    throw new Error('Unauthorized access');
  }

  const refDate = new Date().toISOString().split('T')[0];

  const [zones, products, baseRates, { data: shipper }] = await Promise.all([
    supabase.from('zen_ups_zones').select('id, zone_code, zone_name').eq('is_active', true).order('sort_order').then(r => r.data ?? []),
    supabase.from('zen_ups_products').select('id, product_code, product_name, cargo_type').eq('is_active', true).order('sort_order').then(r => r.data ?? []),
    supabase.from('zen_ups_base_rates')
      .select('*, product:product_id(product_code, product_name, cargo_type), zone:zone_id(zone_code, zone_name)')
      .eq('is_active', true)
      .lte('valid_from', refDate)
      .or(`valid_until.is.null,valid_until.gte.${refDate}`)
      .order('weight_kg').then(r => r.data ?? []),
    supabase.from('zen_agency_shippers').select('discount_rate').eq('org_id', profile.org_id).maybeSingle(),
  ]);

  const shipperDiscountRate = shipper?.discount_rate ?? 0;

  const rates: ShipperRateRow[] = (baseRates as any[]).map((r: any) => {
    const finalFreight = computeShipperFreight(r.selling_price, shipperDiscountRate).finalFreight;
    return {
      zone: { zone_code: r.zone?.zone_code ?? '', zone_name: r.zone?.zone_name ?? '' },
      product: { product_code: r.product?.product_code ?? '', product_name: r.product?.product_name ?? '', cargo_type: r.product?.cargo_type ?? '' },
      weight_kg: r.weight_kg,
      platform_selling_price: r.selling_price,
      final_freight: finalFreight,
      currency: r.currency ?? 'USD',
    };
  });

  return {
    zones: zones as Pick<UpsZone, 'id' | 'zone_code' | 'zone_name'>[],
    products: products as Pick<UpsProduct, 'id' | 'product_code' | 'product_name' | 'cargo_type'>[],
    rates,
    shipperDiscountRate,
  };
}
