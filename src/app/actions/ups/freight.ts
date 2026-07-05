'use server';

// UPS 요금 견적 조회 API — Phase 7.1 TASK-174 IMP-145 · An-14 §4·§11
//
// Team A가 노출하는 "요금 계산" API 계약. 오더 등록 화면 연동·agency_org_id 저장·
// zen_order_rate_snapshots 기록은 Team B 인계 범위(GH #181, An-14 §11) — 이 파일은
// 계산 결과를 반환하는 조회 전용 Action이며 오더 생성 로직을 포함하지 않는다.

import { createClient } from '@/utils/supabase/server';
import { validateUserAction } from '@/lib/auth/guards';
import {
  ceilToHalfKg,
  calcChargeableWeight,
  applyOversizeRule,
  computeUpsFreight,
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
  const zone = (zonesRaw ?? []).find((z) =>
    (z as unknown as UpsZoneWithCountries).countries.some(
      (c) => c.country_code.toUpperCase() === input.destCountryCode.toUpperCase()
    )
  );
  if (!zone) throw new Error(`목적지 국가(${input.destCountryCode})에 매핑된 Zone이 없습니다.`);

  const dims = (input.dimL && input.dimW && input.dimH)
    ? { l: input.dimL, w: input.dimW, h: input.dimH }
    : undefined;
  const { chargeableKg } = calcChargeableWeight(input.actualWeightKg, dims, input.volumetricDivisor);
  const { billingKg } = applyOversizeRule(ceilToHalfKg(chargeableKg), dims);

  const { data: baseRate, error: baseRateError } = await supabase
    .from('zen_ups_base_rates')
    .select('*')
    .eq('product_id', input.productId)
    .eq('zone_id', zone.id)
    .eq('weight_kg', billingKg)
    .eq('is_active', true)
    .lte('valid_from', refDate)
    .or(`valid_until.is.null,valid_until.gte.${refDate}`)
    .maybeSingle();
  if (baseRateError) throw new Error(`기준요금 조회 실패: ${baseRateError.message}`);
  if (!baseRate) throw new Error(`해당 조건(제품·Zone·중량 ${billingKg}kg)의 기준요금이 등록되어 있지 않습니다.`);

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
      volumetricDivisor: input.volumetricDivisor,
      incoterms: input.incoterms,
    },
    {
      zone: zone as unknown as UpsZoneWithCountries,
      product,
      baseRate,
      fuelSurcharge,
      otherCharges: selectedOtherCharges,
      oversizeCharge,
    }
  );

  if (!input.agencyOrgId) {
    return { platform, agency: null, shipper: null };
  }

  const { data: policy } = await supabase
    .from('zen_agency_pricing_policies')
    .select('discount_rate')
    .eq('agency_org_id', input.agencyOrgId)
    .eq('is_active', true)
    .maybeSingle();
  const discountRate = Number(policy?.discount_rate ?? 0);

  const { data: override } = await supabase
    .from('zen_agency_rate_overrides')
    .select('selling_price, cost_price')
    .eq('agency_org_id', input.agencyOrgId)
    .eq('base_rate_id', baseRate.id)
    .eq('is_active', true)
    .lte('valid_from', refDate)
    .or(`valid_until.is.null,valid_until.gte.${refDate}`)
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: agencyCharges } = await supabase
    .from('zen_agency_other_charges')
    .select('selling_price, cost_price')
    .eq('agency_org_id', input.agencyOrgId)
    .in('other_charge_id', selectedOtherCharges.map((c) => c.id))
    .eq('is_active', true);

  const agency = computeAgencyFreight({
    platformSellingTotal: platform.totalSellingPrice,
    discountRate,
    overrideSellingPrice: override ? Number(override.selling_price) : null,
    overrideCostPrice: override ? Number(override.cost_price) : null,
    agencyOtherCharges: (agencyCharges ?? []).map((c) => ({
      sellingPrice: Number(c.selling_price),
      costPrice: Number(c.cost_price),
    })),
  });

  if (!input.shipperOrgId) {
    return { platform, agency, shipper: null };
  }

  const { data: shipperLink } = await supabase
    .from('zen_agency_shippers')
    .select('discount_rate')
    .eq('agency_org_id', input.agencyOrgId)
    .eq('shipper_org_id', input.shipperOrgId)
    .eq('is_active', true)
    .maybeSingle();
  const shipperDiscountRate = Number(shipperLink?.discount_rate ?? 0);
  const shipper = computeShipperFreight(agency.agencySellingPrice, shipperDiscountRate);

  return { platform, agency, shipper };
}
