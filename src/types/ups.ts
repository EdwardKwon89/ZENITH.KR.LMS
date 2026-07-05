// Phase 7: UPS 국제 특송 타입 정의
// TASK-138 IMP-110

export type UpsCargoType = 'DOC' | 'NON_DOC' | 'BOTH';
export type UpsDeliveryMethod = 'DIRECT' | 'PICKUP';
export type UpsVolumeDivisor = 5000 | 5500 | 6000;

export interface UpsZone {
  id: string;
  zone_code: string;       // 'Z1'~'Z10'
  zone_name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

export interface UpsZoneCountry {
  id: string;
  zone_id: string;
  country_code: string;    // ISO 3166-1 alpha-3
  product_family: string;  // 'EXPRESS' | 'SAVER' | 'EXPEDITED' | 'FREIGHT'
  direction: string;       // 'EXPORT' | 'IMPORT'
  created_at: string;
  created_by: string | null;
}

export interface UpsZoneWithCountries extends UpsZone {
  countries: UpsZoneCountry[];
}

export interface UpsProduct {
  id: string;
  product_code: string;
  sub_code: string | null;
  product_name: string;
  cargo_type: UpsCargoType;
  ddu_available: boolean;
  ddp_available: boolean;
  is_active: boolean;
  sort_order: number;
  max_weight_kg: number | null;
  created_at: string;
}

export interface UpsBaseRate {
  id: string;
  product_id: string;
  zone_id: string;
  weight_kg: number;       // 0.5kg 단위
  selling_price: number;
  cost_price: number;
  currency: string;
  valid_from: string;      // ISO date
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface UpsBaseRateWithRefs extends UpsBaseRate {
  product: Pick<UpsProduct, 'product_code' | 'product_name' | 'cargo_type'>;
  zone: Pick<UpsZone, 'zone_code' | 'zone_name'>;
}

export interface UpsFuelSurcharge {
  id: string;
  product_id: string | null;   // null = 전체 제품 적용
  effective_week: string;      // ISO date (월요일 기준)
  selling_rate: number;        // 예: 0.235 = 23.5%
  cost_rate: number;
  created_at: string;
  created_by: string | null;
}

export interface UpsOtherCharge {
  id: string;
  charge_code: string;
  charge_name: string;
  unit: string;                // 'PKG' | 'KG' | 'LOT' 등
  fuel_surcharge_applicable: boolean;
  selling_price: number | null;
  cost_price: number | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface UpsFlightPlan {
  id: string;
  product_id: string | null;
  flight_no: string;
  origin_airport: string;      // IATA 코드
  dest_airport: string;
  etd: string | null;          // ISO datetime
  eta: string | null;
  frequency: string | null;    // '매일', '주 3회' 등
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

// ─── 요금 계산 엔진 타입 (Phase 7.1 TASK-172·173, An-14 §4) ────────────────

export interface UpsPricingData {
  zone: UpsZone;
  product: UpsProduct;
  baseRate: UpsBaseRate | null;
  weightTierRates?: UpsWeightTierRate[] | null;
  freightMinimum?: UpsFreightMinimum | null;
  fuelSurcharge: UpsFuelSurcharge | null;
  otherCharges: UpsOtherCharge[];
  fallbackApplied?: boolean;
}

export interface UpsOtherChargeItem {
  chargeId: string;
  chargeCode: string;
  chargeName: string;
  unit: string;
  sellingBase: number;
  costBase: number;
  fuelSurchargeSelling: number;
  fuelSurchargeCost: number;
}

export interface UpsBreakdown {
  zone: Pick<UpsZone, 'zone_code' | 'zone_name'>;
  product: Pick<UpsProduct, 'product_code' | 'product_name' | 'cargo_type'>;
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  volumetricDivisor: UpsVolumeDivisor;
  billingWeightKg: number;
  baseRateId: string;
  baseSellingPrice: number;
  baseCostPrice: number;
  costSurchargeRate: number;
  fuelSurchargeId: string | null;
  fuelSurchargeRate: number;
  fuelSurchargeSellingAmount: number;
  fuelSurchargeCostAmount: number;
  otherChargeItems: UpsOtherChargeItem[];
  otherChargesSellingTotal: number;
  otherChargesCostTotal: number;
  oversizeApplied: boolean;
  fallbackApplied?: boolean;
  dwbApplied?: boolean;
  dwbOriginalWeightKg?: number;
  dwbOriginalSellingPrice?: number;
  dwbOriginalCostPrice?: number;
  freightMinApplied?: boolean;
  freightMinOriginalSelling?: number;
  freightMinOriginalCost?: number;
}

export interface UpsFreightInput {
  productId: string;
  destCountryCode: string;
  actualWeightKg: number;
  dimL?: number;
  dimW?: number;
  dimH?: number;
  volumetricDivisor?: UpsVolumeDivisor;
  incoterms?: 'DDU' | 'DDP';
  otherChargeIds?: string[];
  effectiveDate?: string;
}

export interface UpsFreightResult {
  chargeableWeightKg: number;
  billingWeightKg: number;
  baseSellingPrice: number;
  baseCostPrice: number;
  fuelSurchargeSellingAmount: number;
  fuelSurchargeCostAmount: number;
  otherChargesSellingTotal: number;
  otherChargesCostTotal: number;
  totalSellingPrice: number;
  totalCostPrice: number;
  currency: string;
  dwbApplied?: boolean;
  freightMinApplied?: boolean;
  breakdown: UpsBreakdown;
}

// Zone 해석 결과 (TASK-179: fallback 여부 추적)
export interface ZoneResolveResult {
  zone: UpsZone | null;
  fallbackApplied: boolean;
}

// Agency 단계 (An-14 R3~R5)
export interface UpsAgencyFreightResult {
  platformSellingTotal: number;
  agencyCostPrice: number;
  agencySellingPrice: number;
  discountRate: number;
  agencyOtherChargesTotal: number;
  source: 'override' | 'platform_fallback';
}

// Shipper 단계 (An-14 R6)
export interface UpsShipperFreightResult {
  agencySellingPrice: number;
  shipperDiscountRate: number;
  finalFreight: number;
}

// ─── 구 타입 (TASK-138 호환 유지 — 참조처 없음, 삭제는 별도 정리 시점에) ──────

// 요금 계산 입력
export interface UpsFreightCalcInput {
  product_id: string;
  destination_country: string;  // ISO alpha-3
  actual_weight_kg: number;
  dimensions?: {
    length_cm: number;
    width_cm: number;
    height_cm: number;
  };
  volumetric_divisor?: UpsVolumeDivisor;  // 미전달 시 기본 5000
  reference_date?: string;               // 미전달 시 today
}

// 요금 계산 결과
export interface UpsFreightCalcResult {
  chargeable_weight_kg: number;
  base_selling_price: number;
  base_cost_price: number;
  fuel_surcharge_selling: number;
  fuel_surcharge_cost: number;
  total_selling_price: number;
  total_cost_price: number;
  currency: string;
  zone: Pick<UpsZone, 'zone_code' | 'zone_name'>;
  product: Pick<UpsProduct, 'product_code' | 'product_name'>;
  applied_rate_id: string;
  applied_fuel_surcharge_id: string | null;
}

export interface UpsShxkCountryMap {
  product_code: string;
  country_code: string;
  incoterms: 'DDU' | 'DDP';
  shxk_code: string;
}

export interface UpsWeightTierRate {
  id: string;
  product_id: string;
  zone_id: string;
  tier_min_kg: number;
  tier_max_kg: number | null;
  price_per_kg_selling: number;
  price_per_kg_cost: number;
  currency: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface UpsFreightMinimum {
  id: string;
  zone_id: string;
  product_id: string;
  min_charge_selling: number;
  min_charge_cost: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}
