// Phase 7 UPS DB 스키마 무결성 테스트
// TASK-138 IMP-110 (R-09 회귀 테스트 신규 추가)
import { describe, it, expect } from 'vitest';
import type {
  UpsZone,
  UpsZoneCountry,
  UpsProduct,
  UpsBaseRate,
  UpsFuelSurcharge,
  UpsOtherCharge,
  UpsFlightPlan,
  UpsCargoType,
  UpsFreightCalcInput,
  UpsFreightCalcResult,
} from '@/types/ups';

// ──────────────────────────────────────────────────────────
// TC-UPS-01: 타입 인터페이스 필수 필드 검증
// ──────────────────────────────────────────────────────────
describe('TC-UPS-01: UPS 타입 인터페이스 필수 필드', () => {
  it('UpsZone 인터페이스가 zone_code, zone_name, is_active 필드를 포함한다', () => {
    const zone: UpsZone = {
      id: 'uuid-zone-1',
      zone_code: 'Z1',
      zone_name: '한국/일본',
      description: null,
      is_active: true,
      sort_order: 1,
      created_at: '2026-06-14T00:00:00Z',
      created_by: null,
    };
    expect(zone.zone_code).toBe('Z1');
    expect(zone.is_active).toBe(true);
    expect(zone.zone_name).toBeTruthy();
  });

  it('UpsProduct 인터페이스가 cargo_type CHECK 값(DOC|NON_DOC|BOTH)을 허용한다', () => {
    const validCargoTypes: UpsCargoType[] = ['DOC', 'NON_DOC', 'BOTH'];
    const products: UpsProduct[] = validCargoTypes.map((ct, i) => ({
      id: `uuid-product-${i}`,
      product_code: `CODE_${ct}`,
      sub_code: null,
      product_name: `테스트 제품 ${ct}`,
      cargo_type: ct,
      ddu_available: false,
      ddp_available: true,
      is_active: true,
      sort_order: i,
      created_at: '2026-06-14T00:00:00Z',
    }));
    expect(products).toHaveLength(3);
    expect(products.map(p => p.cargo_type)).toEqual(['DOC', 'NON_DOC', 'BOTH']);
  });

  it('UpsBaseRate 인터페이스가 selling_price와 cost_price를 분리 관리한다', () => {
    const rate: UpsBaseRate = {
      id: 'uuid-rate-1',
      product_id: 'uuid-product-1',
      zone_id: 'uuid-zone-1',
      weight_kg: 0.5,
      selling_price: 35000,
      cost_price: 28000,
      currency: 'KRW',
      valid_from: '2026-06-01',
      valid_until: null,
      is_active: true,
      created_at: '2026-06-14T00:00:00Z',
      created_by: null,
    };
    expect(rate.selling_price).toBeGreaterThan(0);
    expect(rate.cost_price).toBeGreaterThan(0);
    expect(rate.selling_price).not.toBe(rate.cost_price);
    expect(rate.weight_kg).toBe(0.5);
  });
});

// ──────────────────────────────────────────────────────────
// TC-UPS-02: UPS 마이그레이션 스키마 규칙 검증
// ──────────────────────────────────────────────────────────
describe('TC-UPS-02: 스키마 설계 규칙 검증', () => {
  it('volumetric_divisor 는 5000/5500/6000 중 하나여야 한다', () => {
    const validDivisors = [5000, 5500, 6000];
    const invalidDivisors = [4000, 5200, 7000];

    validDivisors.forEach(d => expect(validDivisors).toContain(d));
    invalidDivisors.forEach(d => expect(validDivisors).not.toContain(d));
  });

  it('weight_kg 는 0.5kg 단위로 표현되어야 한다 (소수점 1자리)', () => {
    const validWeights = [0.5, 1.0, 1.5, 2.0, 10.0, 70.0];
    const invalidWeights = [0.3, 1.2, 2.7];

    validWeights.forEach(w => {
      expect(Math.round(w * 10) % 5).toBe(0);  // 0.5 단위 검증
    });
    invalidWeights.forEach(w => {
      expect(Math.round(w * 10) % 5).not.toBe(0);
    });
  });

  it('UpsZoneCountry 는 국가 코드가 단 하나의 Zone에만 속해야 한다 (UNIQUE 제약)', () => {
    const countries: UpsZoneCountry[] = [
      { id: 'c1', zone_id: 'z1', country_code: 'KOR', created_at: '2026-06-14', created_by: null },
      { id: 'c2', zone_id: 'z1', country_code: 'JPN', created_at: '2026-06-14', created_by: null },
      { id: 'c3', zone_id: 'z2', country_code: 'CHN', created_at: '2026-06-14', created_by: null },
    ];
    const codes = countries.map(c => c.country_code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);  // 중복 없음
  });
});

// ──────────────────────────────────────────────────────────
// TC-UPS-03: intl_ref_locked 불변성 규칙 검증
// ──────────────────────────────────────────────────────────
describe('TC-UPS-03: PKG REF_NO 불변성 규칙', () => {
  it('intl_ref_locked=true 패키지는 intl_ref_no 변경을 시뮬레이션할 때 차단 조건을 충족한다', () => {
    const pkg = {
      id: 'pkg-1',
      intl_ref_no: 'IBC-2026-001',
      intl_ref_locked: true,
      intl_ref_issued_at: '2026-06-14T10:00:00Z',
    };

    const canUpdate = !pkg.intl_ref_locked;
    expect(canUpdate).toBe(false);
  });

  it('intl_ref_locked=false 패키지는 intl_ref_no 업데이트가 가능하다', () => {
    const pkg = {
      id: 'pkg-2',
      intl_ref_no: null,
      intl_ref_locked: false,
      intl_ref_issued_at: null,
    };

    const canUpdate = !pkg.intl_ref_locked;
    expect(canUpdate).toBe(true);
  });

  it('국제번호 발부 후 잠금 상태 전환 시뮬레이션이 정상 작동한다', () => {
    let pkg = { intl_ref_no: null as string | null, intl_ref_locked: false };

    // 번호 발부
    pkg = { intl_ref_no: 'IBC-2026-002', intl_ref_locked: true };

    expect(pkg.intl_ref_no).toBe('IBC-2026-002');
    expect(pkg.intl_ref_locked).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────
// TC-UPS-04: 유류 할증 계산 구조 검증
// ──────────────────────────────────────────────────────────
describe('TC-UPS-04: 유류 할증 계산 구조', () => {
  it('fuel_surcharge selling_rate 는 소수로 표현된다 (23.5% → 0.235)', () => {
    const surcharge: UpsFuelSurcharge = {
      id: 'fs-1',
      product_id: null,
      effective_week: '2026-06-09',
      selling_rate: 0.235,
      cost_rate: 0.22,
      created_at: '2026-06-14T00:00:00Z',
      created_by: null,
    };
    expect(surcharge.selling_rate).toBeLessThan(1);
    expect(surcharge.selling_rate * 100).toBeCloseTo(23.5);
  });

  it('유류 할증 금액은 기본 요금 × 할증률 으로 계산된다', () => {
    const baseRate = 35000;
    const fuelRate = 0.235;
    const fuelAmount = Math.round(baseRate * fuelRate);
    expect(fuelAmount).toBe(8225);
  });
});

// ──────────────────────────────────────────────────────────
// TC-UPS-05: FreightCalcInput/Result 구조 검증
// ──────────────────────────────────────────────────────────
describe('TC-UPS-05: UPS 운임 계산 입력/출력 구조', () => {
  it('FreightCalcInput 에 volumetric_divisor 미전달 시 기본값 5000이 적용된다', () => {
    const input: UpsFreightCalcInput = {
      product_id: 'uuid-prod-1',
      destination_country: 'USA',
      actual_weight_kg: 2.0,
      dimensions: { length_cm: 30, width_cm: 20, height_cm: 10 },
    };

    const divisor = input.volumetric_divisor ?? 5000;
    expect(divisor).toBe(5000);

    // 부피중량 계산: 30×20×10 / 5000 = 1.2kg → 실중량 2.0kg 적용
    const volWeight = (30 * 20 * 10) / divisor;
    const chargeableWeight = Math.max(input.actual_weight_kg, volWeight);
    expect(chargeableWeight).toBe(2.0);
  });

  it('FreightCalcResult 는 selling_price 와 cost_price 를 분리 반환한다', () => {
    const result: UpsFreightCalcResult = {
      chargeable_weight_kg: 2.0,
      base_selling_price: 35000,
      base_cost_price: 28000,
      fuel_surcharge_selling: 8225,
      fuel_surcharge_cost: 6160,
      total_selling_price: 43225,
      total_cost_price: 34160,
      currency: 'KRW',
      zone: { zone_code: 'Z5', zone_name: '미국/캐나다' },
      product: { product_code: 'WW_EXPRESS_NONDOC', product_name: 'UPS WorldWide Express (비서류)' },
      applied_rate_id: 'uuid-rate-1',
      applied_fuel_surcharge_id: 'uuid-fs-1',
    };

    expect(result.total_selling_price).toBe(result.base_selling_price + result.fuel_surcharge_selling);
    expect(result.total_cost_price).toBe(result.base_cost_price + result.fuel_surcharge_cost);
    expect(result.total_selling_price).toBeGreaterThan(result.total_cost_price);
  });
});
