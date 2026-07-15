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
  UpsSurgeFee,
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

// GH#202: UPS product_code → productFamily 매핑 (Zone 조회용)
const PRODUCT_FAMILY_MAP: Record<string, string> = {
  WW_EXPRESS: 'EXPRESS',
  WW_EXPRESS_NONDOC: 'EXPRESS',
  WW_EXPEDITED: 'EXPEDITED',
  WW_SAVER: 'SAVER',
  WW_SAVER_NONDOC: 'SAVER',
  WW_FLIGHT: 'FREIGHT',
  WW_FLIGHT_NONDOC: 'FREIGHT',
};
export function productFamilyFromCode(productCode: string): string {
  for (const [prefix, family] of Object.entries(PRODUCT_FAMILY_MAP)) {
    if (productCode.startsWith(prefix)) return family;
  }
  return 'EXPRESS';
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

// Issue #476: 다중 패키지 정산중량 합산
// 각 패키지별 개별 계산 후 합산 (옵션1 확정)
export function calcMultiPackageChargeableWeight(
  packages: Array<{ gross_weight_kg: number; dims?: { l: number; w: number; h: number }; divisor?: UpsVolumeDivisor }>
): { totalChargeableKg: number; totalVolumetricKg: number; oversizeApplied: boolean } {
  let totalChargeableKg = 0;
  let totalVolumetricKg = 0;
  let oversizeApplied = false;

  for (const pkg of packages) {
    const { chargeableKg, volumetricKg } = calcChargeableWeight(
      pkg.gross_weight_kg,
      pkg.dims,
      pkg.divisor
    );
    totalVolumetricKg += volumetricKg;

    // 패키지 단위 oversize 적용
    let pkgChargeable = chargeableKg;
    if (isOversizePackage(pkg.dims)) {
      pkgChargeable = Math.max(pkgChargeable, OVERSIZE_MIN_BILLING_KG);
      oversizeApplied = true;
    }
    totalChargeableKg += pkgChargeable;
  }

  return { totalChargeableKg, totalVolumetricKg, oversizeApplied };
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
  surge: ReturnType<typeof applySurgeFee>,
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
    surgeFeeId: surge.id,
    surgeFeeSellingRatePerKg: surge.sellingRatePerKg,
    surgeFeeSellingAmount: surge.sellingAmount,
    surgeFeeCostAmount: surge.costAmount,
    oversizeApplied,
    fallbackApplied: data.fallbackApplied ?? false,
  };
}

// 급증 긴급 수수료(Surge Emergency Fee) 계산 — kg당 단가 × 청구중량, 유류할증료 부과 대상 (Issue #491)
// 도착국·기준일(effectiveDate, 미지정 시 오늘) 기준으로 유효한 단가 1건을 호출자가 미리 조회해 data.surgeFee로 전달한다.
function applySurgeFee(
  surgeFee: UpsSurgeFee | null | undefined,
  chargeableKg: number,
  fuelRate: number,
  fuelCostRate: number,
): { id: string | null; sellingRatePerKg: number; sellingAmount: number; costAmount: number } {
  if (!surgeFee) {
    return { id: null, sellingRatePerKg: 0, sellingAmount: 0, costAmount: 0 };
  }
  const baseSelling = Number(surgeFee.selling_rate_per_kg) * chargeableKg;
  const baseCost = Number(surgeFee.cost_rate_per_kg) * chargeableKg;
  return {
    id: surgeFee.id,
    sellingRatePerKg: Number(surgeFee.selling_rate_per_kg),
    sellingAmount: baseSelling + baseSelling * fuelRate,
    costAmount: baseCost + baseCost * fuelCostRate,
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

  // 2. 제품군 판별
  const productFamily = productFamilyFromCode(data.product.product_code);

  // 3. 기본 요율 계산 (제품군별 임계값 기반 + 초과분 per-kg)
  const actualWeight = billingAfterOversize;
  let baseSellingPrice = 0;
  let baseCostPrice = 0;
  let baseRateId = '';

  if (productFamily === 'FREIGHT') {
    if (!data.freightMinimum) {
      throw new Error(`Freight(${data.product.product_code}) 최소운임이 등록되어 있지 않습니다.`);
    }
    if (actualWeight <= 70.0) {
      baseSellingPrice = Number(data.freightMinimum.min_charge_selling);
      baseCostPrice = Number(data.freightMinimum.min_charge_cost);
      baseRateId = data.freightMinimum.id;
    } else {
      if (!data.weightTierRates || data.weightTierRates.length === 0) {
        throw new Error(`Freight 70kg 초과 중량(${actualWeight}kg)에 적용할 per-kg 요율 테이블이 비어 있습니다.`);
      }
      const tier = data.weightTierRates.find(
        (t) => Number(t.tier_min_kg) <= actualWeight && (t.tier_max_kg === null || actualWeight <= Number(t.tier_max_kg))
      );
      if (!tier) {
        throw new Error(`Freight 해당 중량(${actualWeight}kg)에 매핑되는 70kg 초과 요율 구간을 찾을 수 없습니다.`);
      }
      const minSelling = Number(data.freightMinimum.min_charge_selling);
      const minCost = Number(data.freightMinimum.min_charge_cost);
      baseSellingPrice = minSelling + (actualWeight - 70) * Number(tier.price_per_kg_selling);
      baseCostPrice = (minCost + (actualWeight - 70) * Number(tier.price_per_kg_cost)) * (1 + UPS_COST_SURCHARGE_RATE);
      baseRateId = tier.id;
    }
  } else {
    // Express / Saver / Expedited
    if (actualWeight <= 20.0) {
      if (!data.baseRate) {
        throw new Error(`해당 조건(제품·Zone·중량 ${actualWeight}kg)의 기준요금이 등록되어 있지 않습니다.`);
      }
      baseSellingPrice = Number(data.baseRate.selling_price);
      baseCostPrice = Number(data.baseRate.cost_price) * (1 + UPS_COST_SURCHARGE_RATE);
      baseRateId = data.baseRate.id;
    } else {
      if (!data.baseRate) {
        throw new Error(`해당 조건에 20kg 기준요금이 등록되어 있지 않습니다.`);
      }
      if (!data.weightTierRates || data.weightTierRates.length === 0) {
        throw new Error(`20kg 초과 중량(${actualWeight}kg)에 적용할 per-kg 요율 테이블이 비어 있습니다.`);
      }
      const tier = data.weightTierRates.find(
        (t) => Number(t.tier_min_kg) <= actualWeight && (t.tier_max_kg === null || actualWeight <= Number(t.tier_max_kg))
      );
      if (!tier) {
        throw new Error(`해당 중량(${actualWeight}kg)에 매핑되는 20kg 초과 요율 구간을 찾을 수 없습니다.`);
      }
      const baseSelling = Number(data.baseRate.selling_price);
      const baseCost = Number(data.baseRate.cost_price);
      baseSellingPrice = baseSelling + (actualWeight - 20) * Number(tier.price_per_kg_selling);
      baseCostPrice = (baseCost + (actualWeight - 20) * Number(tier.price_per_kg_cost)) * (1 + UPS_COST_SURCHARGE_RATE);
      baseRateId = tier.id;
    }
  }

  // 4. 부가요금 및 유류할증료 계산 (DWB·공용 최소운임 스텝 제거 — Issue #303)
  const fuelRate = Number(data.fuelSurcharge?.selling_rate ?? 0);
  const fuelCostRate = Number(data.fuelSurcharge?.cost_rate ?? 0);

  const fuelSellAmt = baseSellingPrice * fuelRate;
  const fuelCostAmt = baseCostPrice * fuelCostRate;

  const effectiveOtherCharges = [...data.otherCharges];
  if (oversizeApplied && data.oversizeCharge && !effectiveOtherCharges.some((c) => c.id === data.oversizeCharge!.id)) {
    effectiveOtherCharges.push(data.oversizeCharge);
  }
  const oc = applyOtherCharges(effectiveOtherCharges, fuelRate);
  const surge = applySurgeFee(data.surgeFee, chargeableKg, fuelRate, fuelCostRate);

  return {
    chargeableWeightKg: chargeableKg,
    billingWeightKg: actualWeight,
    baseSellingPrice,
    baseCostPrice,
    fuelSurchargeSellingAmount: fuelSellAmt,
    fuelSurchargeCostAmount: fuelCostAmt,
    otherChargesSellingTotal: oc.sellingTotal,
    otherChargesCostTotal: oc.costTotal,
    surgeFeeSellingAmount: surge.sellingAmount,
    surgeFeeCostAmount: surge.costAmount,
    totalSellingPrice: baseSellingPrice + fuelSellAmt + oc.sellingTotal + surge.sellingAmount,
    totalCostPrice: baseCostPrice + fuelCostAmt + oc.costTotal + surge.costAmount,
    currency: data.baseRate?.currency || data.weightTierRates?.[0]?.currency || data.freightMinimum?.currency || 'KRW',
    breakdown: buildBreakdown(
      input, data, chargeableKg, volumetricKg, actualWeight, oc, oversizeApplied, baseRateId, baseSellingPrice, baseCostPrice, surge
    ),
  };
}
