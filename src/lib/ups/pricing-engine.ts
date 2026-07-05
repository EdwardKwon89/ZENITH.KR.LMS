// UPS 요금 계산 엔진 — 순수 함수 (DB 호출 없음)
// Phase 7.1 TASK-172(이식)·173(보강) IMP-145 · An-14 §4
// 원출처: feature/ups-spr03-bkai-rates-admin (TASK-141 IMP-112, 미병합) — 이식하며 아래 2건 보강:
//   1) 원가 +7% 반영 (An-14 §0-1 A1, §3-6 — SNTL 원자료: "원가표 대입 후 +7%가 실질 납부운임")
//   2) 대형포장물(OVERSIZE) 특수 판정 (An-14 §0-1 C — 길이+둘레 300~400cm → 최소청구중량 40kg + 고정요금)

import type {
  UpsFreightInput,
  UpsFreightResult,
  UpsPricingData,
  UpsBreakdown,
  UpsOtherChargeItem,
  UpsZoneWithCountries,
  UpsZone,
  UpsVolumeDivisor,
  UpsOtherCharge,
} from '@/types/ups';

// An-14 §0-1 A1: UPS 원가표 원본값 대비 실 납부운임 할증율. UPS와의 계약 조건 변경 시 이 상수만 수정한다.
export const UPS_COST_SURCHARGE_RATE = 0.07;

// An-14 §0-1 C: 대형포장물 판정 기준 (길이 + 둘레(폭×2+높이×2) cm)
const OVERSIZE_MIN_GIRTH_LENGTH_CM = 300;
const OVERSIZE_MAX_GIRTH_LENGTH_CM = 400;
const OVERSIZE_MIN_BILLING_KG = 40;

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

// An-14 §0-1 C: 대형포장물 여부 판정. 길이 + 둘레(폭×2+높이×2) > 300cm이고 UPS 최대(400cm) 이하인 경우 적용.
export function isOversizePackage(dims?: { l: number; w: number; h: number }): boolean {
  if (!dims) return false;
  const girthPlusLength = dims.l + 2 * (dims.w + dims.h);
  return girthPlusLength > OVERSIZE_MIN_GIRTH_LENGTH_CM && girthPlusLength <= OVERSIZE_MAX_GIRTH_LENGTH_CM;
}

// 대형포장물 규칙 적용: 최소청구중량 40kg 강제 + OVERSIZE 부가요금 강제 포함
export function applyOversizeRule(
  billingKg: number,
  dims?: { l: number; w: number; h: number }
): { billingKg: number; applied: boolean } {
  if (!isOversizePackage(dims)) return { billingKg, applied: false };
  return { billingKg: Math.max(billingKg, OVERSIZE_MIN_BILLING_KG), applied: true };
}

// 기타 부가요금 합산 (유류할증료 연동 포함)
function applyOtherCharges(
  charges: UpsOtherCharge[],
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
  oc: ReturnType<typeof applyOtherCharges>,
  oversizeApplied: boolean
): UpsBreakdown {
  const base_s = Number(data.baseRate.selling_price);
  const base_c = Number(data.baseRate.cost_price) * (1 + UPS_COST_SURCHARGE_RATE);
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
    costSurchargeRate: UPS_COST_SURCHARGE_RATE,
    fuelSurchargeId: data.fuelSurcharge?.id ?? null, fuelSurchargeRate: fuelRate,
    fuelSurchargeSellingAmount: base_s * fuelRate,
    fuelSurchargeCostAmount: base_c * fuelCostRate,
    otherChargeItems: oc.items,
    otherChargesSellingTotal: oc.sellingTotal,
    otherChargesCostTotal: oc.costTotal,
    oversizeApplied,
  };
}

// 메인: 사전 조회된 데이터로 UPS 운임 계산 (순수 함수)
// data.otherCharges: 이번 계산에 실제 적용할 부가요금 목록(호출자가 incoterms·옵션에 따라 미리 선별해서 전달).
// data.oversizeCharge: OVERSIZE 공통코드 원본(선택). 치수 조건 충족 시 자동으로 강제 포함된다.
export function computeUpsFreight(
  input: UpsFreightInput,
  data: UpsPricingData & { oversizeCharge?: UpsOtherCharge }
): UpsFreightResult {
  const dims = (input.dimL && input.dimW && input.dimH)
    ? { l: input.dimL, w: input.dimW, h: input.dimH } : undefined;
  const { chargeableKg, volumetricKg } = calcChargeableWeight(
    input.actualWeightKg, dims, input.volumetricDivisor
  );
  const { billingKg: chargeableAfterOversize, applied: oversizeApplied } = applyOversizeRule(
    ceilToHalfKg(chargeableKg), dims
  );
  const billingKg = chargeableAfterOversize;

  const fuelRate = Number(data.fuelSurcharge?.selling_rate ?? 0);
  const fuelCostRate = Number(data.fuelSurcharge?.cost_rate ?? 0);
  const base_s = Number(data.baseRate.selling_price);
  // An-14 §0-1 A1: 원가표 원본값에 +7% 적용 — 실 납부운임
  const base_c = Number(data.baseRate.cost_price) * (1 + UPS_COST_SURCHARGE_RATE);
  const fuelSellAmt = base_s * fuelRate;
  const fuelCostAmt = base_c * fuelCostRate;

  const effectiveOtherCharges = [...data.otherCharges];
  if (oversizeApplied && data.oversizeCharge && !effectiveOtherCharges.some((c) => c.id === data.oversizeCharge!.id)) {
    effectiveOtherCharges.push(data.oversizeCharge);
  }
  const oc = applyOtherCharges(effectiveOtherCharges, fuelRate);

  return {
    chargeableWeightKg: chargeableKg, billingWeightKg: billingKg,
    baseSellingPrice: base_s, baseCostPrice: base_c,
    fuelSurchargeSellingAmount: fuelSellAmt, fuelSurchargeCostAmount: fuelCostAmt,
    otherChargesSellingTotal: oc.sellingTotal, otherChargesCostTotal: oc.costTotal,
    totalSellingPrice: base_s + fuelSellAmt + oc.sellingTotal,
    totalCostPrice: base_c + fuelCostAmt + oc.costTotal,
    currency: data.baseRate.currency,
    breakdown: buildBreakdown(input, data, chargeableKg, volumetricKg, billingKg, oc, oversizeApplied),
  };
}
