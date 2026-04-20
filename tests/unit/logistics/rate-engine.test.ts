import { describe, it, expect } from 'vitest';
import { calculateSlabRate, validateRateOverlap } from '@/lib/logistics/rate-engine';

describe('ZENITH Rate Engine: Slab Calculation', () => {
  const mockTiers = [
    { weight_min: 0, unit_price: 10.00 },
    { weight_min: 45, unit_price: 8.50 },
    { weight_min: 100, unit_price: 7.00 },
  ];

  it('TC-R.1: 중량 등급별 슬랩 요율 매칭 무결성 확인 (0~45kg)', () => {
    // 10kg 입력 시 0kg 티어($10.00) 적용 확인
    expect(calculateSlabRate(10, mockTiers)).toBe(10.00);
  });

  it('TC-R.1: 중량 등급별 슬랩 요율 매칭 무결성 확인 (45~100kg)', () => {
    // 55kg 입력 시 45kg 티어($8.50) 적용 확인 (UAT 시나리오 TC-O.1 연계)
    expect(calculateSlabRate(55, mockTiers)).toBe(8.50);
    // 경계값 45kg 확인
    expect(calculateSlabRate(45, mockTiers)).toBe(8.50);
  });

  it('TC-R.1: 중량 등급별 슬랩 요율 매칭 무결성 확인 (100kg+)', () => {
    // 150kg 입력 시 100kg 티어($7.00) 적용 확인
    expect(calculateSlabRate(150, mockTiers)).toBe(7.00);
    // 경계값 100kg 확인
    expect(calculateSlabRate(100, mockTiers)).toBe(7.00);
  });
});

describe('ZENITH Rate Engine: Version Governance', () => {
  it('TC-R.2: 요율 유효기간 중첩 감지 로직 확인', () => {
    const existing = [
      { start: new Date('2026-01-01'), end: new Date('2026-12-31') }
    ];
    
    // 중첩되는 케이스
    const overlapping = { start: new Date('2026-06-01'), end: new Date('2027-01-01') };
    expect(validateRateOverlap(existing, overlapping)).toBe(true);

    // 중첩되지 않는 케이스
    const safe = { start: new Date('2027-01-01'), end: new Date('2027-12-31') };
    expect(validateRateOverlap(existing, safe)).toBe(false);
  });
});
