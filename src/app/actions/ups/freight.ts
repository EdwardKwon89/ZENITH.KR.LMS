'use server';

// UPS 요금 견적 조회 API — Phase 7.1 TASK-174 IMP-145 · An-14 §4·§11
//
// Team A가 노출하는 "요금 계산" API 계약. 오더 등록 화면 연동·agency_org_id 저장·
// zen_order_rate_snapshots 기록은 Team B 인계 범위(GH #181, An-14 §11) — 이 파일은
// 계산 결과를 반환하는 조회 전용 Action이며 오더 생성 로직을 포함하지 않는다.

import { createClient } from '@/utils/supabase/server';
import { validateUserAction } from '@/lib/auth/guards';
import {
  resolveBillingWeight,
  calcChargeableWeight,
  applyOversizeRule,
  computeUpsFreight,
  resolveZoneByCountry,
  productFamilyFromCode,
} from '@/lib/ups/pricing-engine';
import { computeAgencyFreight } from '@/lib/ups/agency-pricing';
import { computeShipperFreight } from '@/lib/ups/shipper-pricing';
import type {
  UpsFreightResult,
  UpsAgencyFreightResult,
  UpsShipperFreightResult,
  UpsZoneWithCountries,
  UpsOtherCharge,
} from '@/types/ups';

export interface EstimateUpsFreightInput {
  productId: string;
  destCountryCode: string;
  actualWeightKg: number;
  dimL?: number;
  dimW?: number;
  dimH?: number;
  incoterms?: 'DDU' | 'DDP';
  volumetricDivisor?: 5000 | 5500 | 6000;
  otherChargeIds?: string[];
  /** 화주가 대리점 소속인 경우 대리점 org id. 미전달 시 Agency/Shipper 단계는 계산하지 않는다. */
  agencyOrgId?: string | null;
  /** 화주 본인 org id. discount_rate 조회용(zen_agency_shippers). */
  shipperOrgId?: string | null;
  referenceDate?: string;
  /** Zone 조회 방향 (EXPORT | IMPORT). 기본값 EXPORT. */
  direction?: string;
}

export interface UpsFreightEstimate {
  platform: UpsFreightResult;
  agency: UpsAgencyFreightResult | null;
  shipper: UpsShipperFreightResult | null;
}

export async function estimateUpsFreight(input: EstimateUpsFreightInput): Promise<UpsFreightEstimate> {
  const { supabase } = await validateUserAction();
  const refDate = input.referenceDate ?? new Date().toISOString().split('T')[0];

  const { data: product, error: productError } = await supabase
    .from('zen_ups_products')
    .select('*')
    .eq('id', input.productId)
    .single();
  if (productError || !product) throw new Error(`UPS 제품을 찾을 수 없습니다: ${productError?.message}`);

  const { data: zonesRaw, error: zonesError } = await supabase
    .from('zen_ups_zones')
    .select('*, countries:zen_ups_zone_countries(*)')
    .eq('is_active', true);
  if (zonesError) throw new Error(`Zone 조회 실패: ${zonesError.message}`);
  const productFamily = productFamilyFromCode(product.product_code);
  const direction = input.direction ?? 'EXPORT';
  const { zone, fallbackApplied } = resolveZoneByCountry(
    input.destCountryCode,
    zonesRaw as UpsZoneWithCountries[],
    productFamily,
    direction
  );
  if (!zone) throw new Error(`목적지 국가(${input.destCountryCode})에 매핑된 Zone이 없습니다.`);

  // Issue #312: Agency org의 volumetric_divisor 조회
  let effectiveDivisor = input.volumetricDivisor;
  if (input.agencyOrgId && !input.volumetricDivisor) {
    const { data: org } = await supabase
      .from('zen_organizations')
      .select('volumetric_divisor')
      .eq('id', input.agencyOrgId)
      .maybeSingle();
    if (org?.volumetric_divisor) {
      effectiveDivisor = org.volumetric_divisor as 5000 | 5500 | 6000;
    }
  }

  const dims = (input.dimL && input.dimW && input.dimH)
    ? { l: input.dimL, w: input.dimW, h: input.dimH }
    : undefined;
  const { chargeableKg } = calcChargeableWeight(input.actualWeightKg, dims, effectiveDivisor);
  const { billingKg } = applyOversizeRule(resolveBillingWeight(chargeableKg, product.product_code), dims);

  // 2. 기준 요금 조회 (Express/Saver/Expedited) — ≤20kg 정확매치, >20kg는 20kg 기준요금
  let baseRate = null;
  if (productFamily !== 'FREIGHT') {
    const queryWeight = billingKg <= 20.0 ? billingKg : 20;
    const { data: rRow, error: baseRateError } = await supabase
      .from('zen_ups_base_rates')
      .select('*')
      .eq('product_id', input.productId)
      .eq('zone_id', zone.id)
      .eq('weight_kg', queryWeight)
      .eq('is_active', true)
      .lte('valid_from', refDate)
      .or(`valid_until.is.null,valid_until.gte.${refDate}`)
      .maybeSingle();
    if (baseRateError) throw new Error(`기준요금 조회 실패: ${baseRateError.message}`);
    if (!rRow) throw new Error(`해당 조건(제품·Zone·중량 ${queryWeight}kg)의 기준요금이 등록되어 있지 않습니다.`);
    baseRate = rRow;
  }

  // 3. per-kg 요율 구간 조회 (Express/Saver/Expedited >20kg, Freight >70kg)
  const { data: weightTierRates, error: tierError } = await supabase
    .from('zen_ups_weight_tier_rates')
    .select('*')
    .eq('product_id', input.productId)
    .eq('zone_id', zone.id)
    .eq('is_active', true)
    .lte('valid_from', refDate)
    .or(`valid_until.is.null,valid_until.gte.${refDate}`);
  if (tierError) throw new Error(`20kg 초과 구간요금 조회 실패: ${tierError.message}`);

  // 4. Freight 최소운임 조회
  const { data: freightMinimum, error: minError } = await supabase
    .from('zen_ups_freight_minimums')
    .select('*')
    .eq('product_id', input.productId)
    .eq('zone_id', zone.id)
    .eq('is_active', true)
    .maybeSingle();
  if (minError) throw new Error(`최소운임 조회 실패: ${minError.message}`);

  const { data: fuelRows } = await supabase
    .from('zen_ups_fuel_surcharges')
    .select('*')
    .or(`product_id.eq.${input.productId},product_id.is.null`)
    .lte('effective_week', refDate)
    .order('effective_week', { ascending: false })
    .limit(1);
  const fuelSurcharge = fuelRows?.[0] ?? null;

  const requestedCodes = new Set<string>();
  if (input.incoterms) requestedCodes.add(input.incoterms);
  const { data: allOtherCharges } = await supabase
    .from('zen_ups_other_charges')
    .select('*')
    .eq('is_active', true);
  const oversizeCharge = (allOtherCharges ?? []).find((c) => c.charge_code === 'OVERSIZE') as UpsOtherCharge | undefined;
  const selectedOtherCharges = (allOtherCharges ?? []).filter(
    (c) => requestedCodes.has(c.charge_code) || (input.otherChargeIds ?? []).includes(c.id)
  ) as UpsOtherCharge[];

  const platform = computeUpsFreight(
    {
      productId: input.productId,
      destCountryCode: input.destCountryCode,
      actualWeightKg: input.actualWeightKg,
      dimL: input.dimL,
      dimW: input.dimW,
      dimH: input.dimH,
      volumetricDivisor: effectiveDivisor,
      incoterms: input.incoterms,
    },
    {
      zone: zone as unknown as UpsZoneWithCountries,
      product,
      baseRate: baseRate as any,
      weightTierRates: weightTierRates as any,
      freightMinimum: freightMinimum as any,
      fuelSurcharge,
      otherCharges: selectedOtherCharges,
      oversizeCharge,
      fallbackApplied,
    }
  );

  if (!input.agencyOrgId) {
    return { platform, agency: null, shipper: null };
  }

  const { data: policy } = await supabase
    .from('zen_agency_pricing_policies')
    .select('discount_rate')
    .eq('agency_org_id', input.agencyOrgId)
    .eq('zone_id', zone.id)
    .eq('is_active', true)
    .maybeSingle();
  const discountRate = Number(policy?.discount_rate ?? 0);

  const { data: agencyCharges } = await supabase
    .from('zen_agency_other_charges')
    .select('selling_price, cost_price')
    .eq('agency_org_id', input.agencyOrgId)
    .in('other_charge_id', selectedOtherCharges.map((c) => c.id))
    .eq('is_active', true);

  const agency = computeAgencyFreight({
    platformSellingTotal: platform.totalSellingPrice,
    discountRate,
    agencyOtherCharges: (agencyCharges ?? []).map((c) => ({
      sellingPrice: Number(c.selling_price),
      costPrice: Number(c.cost_price),
    })),
  });

  if (!input.shipperOrgId) {
    return { platform, agency, shipper: null };
  }

  const { data: shipperZoneDiscount } = await supabase
    .from('zen_agency_shipper_zone_discounts')
    .select('discount_rate')
    .eq('agency_org_id', input.agencyOrgId)
    .eq('shipper_org_id', input.shipperOrgId)
    .eq('zone_id', zone.id)
    .eq('is_active', true)
    .maybeSingle();
  const shipperDiscountRate = Number(shipperZoneDiscount?.discount_rate ?? 0);
  const shipper = computeShipperFreight(platform.totalSellingPrice, shipperDiscountRate);

  return { platform, agency, shipper };
}
