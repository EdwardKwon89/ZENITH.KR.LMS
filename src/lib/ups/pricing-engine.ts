// UPS 요금 계산 엔진 — 순수 함수 (DB 호출 없음)
// TASK-141 IMP-112

import type {
  UpsFreightInput,
  UpsFreightResult,
  UpsPricingData,
  UpsBreakdown,
  UpsOtherChargeItem,
  UpsZoneWithCountries,
  UpsZone,
  UpsVolumeDivisor,
} from '@/types/ups';

// 요율표 조회용 중량 올림 (0.5kg 단위)
export function ceilToHalfKg(weightKg: number): number {
  return Math.ceil(weightKg * 2) / 2;
}

// 목적지 국가코드로 Zone 탐색
export function resolveZoneByCountry(
  destCountryCode: string,
  zones: UpsZoneWithCountries[]
): UpsZone | null {
  const code = destCountryCode.toUpperCase();
  for (const zone of zones) {
    if (zone.countries.some((c) => c.country_code.toUpperCase() === code)) {
      return zone;
    }
  }
  return null;
}

// 부피중량 + 청구중량 계산
export function calcChargeableWeight(
  actualKg: number,
  dims?: { l: number; w: number; h: number },
  divisor: UpsVolumeDivisor = 5000
): { chargeableKg: number; volumetricKg: number } {
  if (!dims) return { chargeableKg: actualKg, volumetricKg: 0 };
  const volumetricKg = (dims.l * dims.w * dims.h) / divisor;
  return { chargeableKg: Math.max(actualKg, volumetricKg), volumetricKg };
}

// 기타 부가요금 합산 (유류할증료 연동 포함)
function applyOtherCharges(
  charges: UpsPricingData['otherCharges'],
  fuelRate: number
): { sellingTotal: number; costTotal: number; items: UpsOtherChargeItem[] } {
  let sellingTotal = 0;
  let costTotal = 0;
  const items: UpsOtherChargeItem[] = [];
  for (const c of charges) {
    const base_s = Number(c.selling_price ?? 0);
    const base_c = Number(c.cost_price ?? 0);
    const fuel_s = c.fuel_surcharge_applicable ? base_s * fuelRate : 0;
    const fuel_c = c.fuel_surcharge_applicable ? base_c * fuelRate : 0;
    sellingTotal += base_s + fuel_s;
    costTotal += base_c + fuel_c;
    items.push({
      chargeId: c.id, chargeCode: c.charge_code, chargeName: c.charge_name,
      unit: c.unit, sellingBase: base_s, costBase: base_c,
      fuelSurchargeSelling: fuel_s, fuelSurchargeCost: fuel_c,
    });
  }
  return { sellingTotal, costTotal, items };
}

// 계산 근거 상세 객체 조립
function buildBreakdown(
  input: UpsFreightInput,
  data: UpsPricingData,
  chargeableKg: number,
  volumetricKg: number,
  billingKg: number,
  oc: ReturnType<typeof applyOtherCharges>
): UpsBreakdown {
  const base_s = Number(data.baseRate.selling_price);
  const base_c = Number(data.baseRate.cost_price);
  const fuelRate = Number(data.fuelSurcharge?.selling_rate ?? 0);
  const fuelCostRate = Number(data.fuelSurcharge?.cost_rate ?? 0);
  return {
    zone: { zone_code: data.zone.zone_code, zone_name: data.zone.zone_name },
    product: {
      product_code: data.product.product_code,
      product_name: data.product.product_name,
      cargo_type: data.product.cargo_type,
    },
    actualWeightKg: input.actualWeightKg, volumetricWeightKg: volumetricKg,
    chargeableWeightKg: chargeableKg, volumetricDivisor: input.volumetricDivisor ?? 5000,
    billingWeightKg: billingKg,
    baseRateId: data.baseRate.id, baseSellingPrice: base_s, baseCostPrice: base_c,
    fuelSurchargeId: data.fuelSurcharge?.id ?? null, fuelSurchargeRate: fuelRate,
    fuelSurchargeSellingAmount: base_s * fuelRate,
    fuelSurchargeCostAmount: base_c * fuelCostRate,
    otherChargeItems: oc.items,
    otherChargesSellingTotal: oc.sellingTotal,
    otherChargesCostTotal: oc.costTotal,
  };
}

// 메인: 사전 조회된 데이터로 UPS 운임 계산 (순수 함수)
export function computeUpsFreight(
  input: UpsFreightInput,
  data: UpsPricingData
): UpsFreightResult {
  const dims = (input.dimL && input.dimW && input.dimH)
    ? { l: input.dimL, w: input.dimW, h: input.dimH } : undefined;
  const { chargeableKg, volumetricKg } = calcChargeableWeight(
    input.actualWeightKg, dims, input.volumetricDivisor
  );
  const billingKg = ceilToHalfKg(chargeableKg);
  const fuelRate = Number(data.fuelSurcharge?.selling_rate ?? 0);
  const fuelCostRate = Number(data.fuelSurcharge?.cost_rate ?? 0);
  const base_s = Number(data.baseRate.selling_price);
  const base_c = Number(data.baseRate.cost_price);
  const fuelSellAmt = base_s * fuelRate;
  const fuelCostAmt = base_c * fuelCostRate;
  const oc = applyOtherCharges(data.otherCharges, fuelRate);
  return {
    chargeableWeightKg: chargeableKg, billingWeightKg: billingKg,
    baseSellingPrice: base_s, baseCostPrice: base_c,
    fuelSurchargeSellingAmount: fuelSellAmt, fuelSurchargeCostAmount: fuelCostAmt,
    otherChargesSellingTotal: oc.sellingTotal, otherChargesCostTotal: oc.costTotal,
    totalSellingPrice: base_s + fuelSellAmt + oc.sellingTotal,
    totalCostPrice: base_c + fuelCostAmt + oc.costTotal,
    currency: data.baseRate.currency,
    breakdown: buildBreakdown(input, data, chargeableKg, volumetricKg, billingKg, oc),
  };
}
