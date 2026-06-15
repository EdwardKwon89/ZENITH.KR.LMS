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
