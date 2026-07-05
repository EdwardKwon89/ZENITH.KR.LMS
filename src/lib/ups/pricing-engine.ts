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
  ZoneResolveResult,
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

// DEF-095: 상품별 중량 반올림 단위. UPS 공식 Rate Guide(p.2) 원문 —
// WW_EXPEDITED는 중량과 무관하게 항상 1kg 단위, 그 외 상품은 20kg 이하 0.5kg / 초과 1kg 단위로 올림.
export function resolveBillingWeight(chargeableKg: number, productCode: string): number {
  if (productCode === 'WW_EXPEDITED') return Math.ceil(chargeableKg);
  return chargeableKg <= 20 ? ceilToHalfKg(chargeableKg) : Math.ceil(chargeableKg);
}

// 목적지 국가코드로 Zone 탐색 (TASK-179: productFamily + direction 파라미터 추가, 2단계 Fallback)
// 정확매치 → 실패 시 EXPRESS/EXPORT fallback → 실패 시 null
// fallbackApplied === true이면 fallback으로 찾은 결과 (호출자가 fallback 여부 인지 가능)
export function resolveZoneByCountry(
  destCountryCode: string,
  zones: UpsZoneWithCountries[],
  productFamily: string = 'EXPRESS',
  direction: string = 'EXPORT'
): ZoneResolveResult {
  const code = destCountryCode.toUpperCase();
  const pf = productFamily.toUpperCase();
  const dir = direction.toUpperCase();

  // 1단계: 정확매치 (country_code, product_family, direction)
  for (const zone of zones) {
    if (zone.countries.some(
      (c) => c.country_code.toUpperCase() === code
        && (c.product_family?.toUpperCase() ?? 'EXPRESS') === pf
        && (c.direction?.toUpperCase() ?? 'EXPORT') === dir
    )) {
      return { zone, fallbackApplied: false };
    }
  }

  // 2단계: Fallback — EXPRESS/EXPORT (모든 국가에 존재하는 유일한 보장 조합)
  for (const zone of zones) {
    if (zone.countries.some(
      (c) => c.country_code.toUpperCase() === code
        && (c.product_family?.toUpperCase() ?? 'EXPRESS') === 'EXPRESS'
        && (c.direction?.toUpperCase() ?? 'EXPORT') === 'EXPORT'
    )) {
      return { zone, fallbackApplied: true };
    }
  }

  return { zone: null, fallbackApplied: false };
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
  oversizeApplied: boolean,
  baseRateId: string,
  baseSellingPrice: number,
  baseCostPrice: number,
  dwbDetails?: {
    dwbApplied: boolean;
    dwbOriginalWeightKg?: number;
    dwbOriginalSellingPrice?: number;
    dwbOriginalCostPrice?: number;
  },
  freightMinDetails?: {
    freightMinApplied: boolean;
    freightMinOriginalSelling?: number;
    freightMinOriginalCost?: number;
  }
): UpsBreakdown {
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
    baseRateId, baseSellingPrice, baseCostPrice,
    costSurchargeRate: UPS_COST_SURCHARGE_RATE,
    fuelSurchargeId: data.fuelSurcharge?.id ?? null, fuelSurchargeRate: fuelRate,
    fuelSurchargeSellingAmount: baseSellingPrice * fuelRate,
    fuelSurchargeCostAmount: baseCostPrice * fuelCostRate,
    otherChargeItems: oc.items,
    otherChargesSellingTotal: oc.sellingTotal,
    otherChargesCostTotal: oc.costTotal,
    oversizeApplied,
    dwbApplied: dwbDetails?.dwbApplied ?? false,
    dwbOriginalWeightKg: dwbDetails?.dwbOriginalWeightKg,
    dwbOriginalSellingPrice: dwbDetails?.dwbOriginalSellingPrice,
    dwbOriginalCostPrice: dwbDetails?.dwbOriginalCostPrice,
    freightMinApplied: freightMinDetails?.freightMinApplied ?? false,
    freightMinOriginalSelling: freightMinDetails?.freightMinOriginalSelling,
    freightMinOriginalCost: freightMinDetails?.freightMinOriginalCost,
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
  
  // 1. 중량 반올림 및 대형포장물 룰 적용
  const initialBillingWeight = resolveBillingWeight(chargeableKg, data.product.product_code);
  const { billingKg: billingAfterOversize, applied: oversizeApplied } = applyOversizeRule(
    initialBillingWeight, dims
  );
  
  // 2. 기본 요율 계산 (Flat vs. Per-kg Tier)
  let actualWeight = billingAfterOversize;
  let baseSellingPrice = 0;
  let baseCostPrice = 0;
  let baseRateId = '';
  
  let currentTier: any = null;
  
  if (actualWeight <= 20.0) {
    if (!data.baseRate) {
      throw new Error(`해당 조건(제품·Zone·중량 ${actualWeight}kg)의 기준요금이 등록되어 있지 않습니다.`);
    }
    baseSellingPrice = Number(data.baseRate.selling_price);
    baseCostPrice = Number(data.baseRate.cost_price) * (1 + UPS_COST_SURCHARGE_RATE);
    baseRateId = data.baseRate.id;
  } else {
    // 20kg 초과 per-kg 티어 요금 적용
    if (!data.weightTierRates || data.weightTierRates.length === 0) {
      throw new Error(`20kg 초과 중량(${actualWeight}kg)에 적용할 per-kg 요율 테이블이 비어 있습니다.`);
    }
    // W가 속한 티어 탐색
    currentTier = data.weightTierRates.find(
      (t) => Number(t.tier_min_kg) <= actualWeight && (t.tier_max_kg === null || actualWeight <= Number(t.tier_max_kg))
    );
    if (!currentTier) {
      throw new Error(`해당 중량(${actualWeight}kg)에 매핑되는 20kg 초과 요율 구간을 찾을 수 없습니다.`);
    }
    baseSellingPrice = actualWeight * Number(currentTier.price_per_kg_selling);
    baseCostPrice = actualWeight * Number(currentTier.price_per_kg_cost) * (1 + UPS_COST_SURCHARGE_RATE);
    baseRateId = currentTier.id;
  }
  
  // 3. DWB (Deficit Weight Billing) 적용
  let finalBillingWeight = actualWeight;
  let dwbApplied = false;
  let dwbOriginalWeightKg: number | undefined;
  let dwbOriginalSellingPrice: number | undefined;
  let dwbOriginalCostPrice: number | undefined;
  
  // 다음 상위 구간(nextTier) 탐색
  let nextTier: any = null;
  if (data.weightTierRates && data.weightTierRates.length > 0) {
    if (actualWeight <= 20.0) {
      // 20kg 이하인 경우 다음 상위 구간은 첫 번째 per-kg 티어 (최소 min_kg를 가짐)
      nextTier = data.weightTierRates.reduce((minTier: any, t: any) => {
        if (!minTier) return t;
        return Number(t.tier_min_kg) < Number(minTier.tier_min_kg) ? t : minTier;
      }, null);
    } else if (currentTier) {
      // 20kg 초과인 경우, 현재 티어보다 tier_min_kg가 큰 티어 중 가장 작은 것
      nextTier = data.weightTierRates.reduce((minTier: any, t: any) => {
        if (Number(t.tier_min_kg) <= Number(currentTier.tier_min_kg)) return minTier;
        if (!minTier) return t;
        return Number(t.tier_min_kg) < Number(minTier.tier_min_kg) ? t : minTier;
      }, null);
    }
  }
  
  if (nextTier) {
    const nextWeight = Number(nextTier.tier_min_kg);
    const nextSelling = nextWeight * Number(nextTier.price_per_kg_selling);
    const nextCost = nextWeight * Number(nextTier.price_per_kg_cost) * (1 + UPS_COST_SURCHARGE_RATE);
    
    if (nextSelling < baseSellingPrice) {
      // DWB 적용
      dwbApplied = true;
      dwbOriginalWeightKg = actualWeight;
      dwbOriginalSellingPrice = baseSellingPrice;
      dwbOriginalCostPrice = baseCostPrice;
      
      finalBillingWeight = nextWeight;
      baseSellingPrice = nextSelling;
      baseCostPrice = nextCost;
      baseRateId = nextTier.id;
    }
  }
  
  // 4. Freight 최소 운임 한도 적용
  let freightMinApplied = false;
  let freightMinOriginalSelling: number | undefined;
  let freightMinOriginalCost: number | undefined;
  
  if (data.freightMinimum) {
    const minSelling = Number(data.freightMinimum.min_charge_selling);
    const minCost = Number(data.freightMinimum.min_charge_cost);
    
    if (baseSellingPrice < minSelling) {
      freightMinApplied = true;
      freightMinOriginalSelling = baseSellingPrice;
      baseSellingPrice = minSelling;
    }
    if (baseCostPrice < minCost) {
      freightMinApplied = true;
      freightMinOriginalCost = baseCostPrice;
      baseCostPrice = minCost;
    }
  }
  
  // 5. 부가요금 및 유류할증료 계산
  const fuelRate = Number(data.fuelSurcharge?.selling_rate ?? 0);
  const fuelCostRate = Number(data.fuelSurcharge?.cost_rate ?? 0);
  
  const fuelSellAmt = baseSellingPrice * fuelRate;
  const fuelCostAmt = baseCostPrice * fuelCostRate;
  
  const effectiveOtherCharges = [...data.otherCharges];
  if (oversizeApplied && data.oversizeCharge && !effectiveOtherCharges.some((c) => c.id === data.oversizeCharge!.id)) {
    effectiveOtherCharges.push(data.oversizeCharge);
  }
  const oc = applyOtherCharges(effectiveOtherCharges, fuelRate);
  
  const dwbDetails = {
    dwbApplied,
    dwbOriginalWeightKg,
    dwbOriginalSellingPrice,
    dwbOriginalCostPrice,
  };
  
  const freightMinDetails = {
    freightMinApplied,
    freightMinOriginalSelling,
    freightMinOriginalCost,
  };
  
  return {
    chargeableWeightKg: chargeableKg,
    billingWeightKg: finalBillingWeight,
    baseSellingPrice,
    baseCostPrice,
    fuelSurchargeSellingAmount: fuelSellAmt,
    fuelSurchargeCostAmount: fuelCostAmt,
    otherChargesSellingTotal: oc.sellingTotal,
    otherChargesCostTotal: oc.costTotal,
    totalSellingPrice: baseSellingPrice + fuelSellAmt + oc.sellingTotal,
    totalCostPrice: baseCostPrice + fuelCostAmt + oc.costTotal,
    currency: data.baseRate?.currency || data.weightTierRates?.[0]?.currency || 'KRW',
    dwbApplied,
    freightMinApplied,
    breakdown: buildBreakdown(
      input,
      data,
      chargeableKg,
      volumetricKg,
      finalBillingWeight,
      oc,
      oversizeApplied,
      baseRateId,
      baseSellingPrice,
      baseCostPrice,
      dwbDetails,
      freightMinDetails
    ),
  };
}
