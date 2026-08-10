// DEF-B-040 / Issue #1027: Agency/Shipper UPS 요율조회 화면 cargo_type 축 반영 회귀 테스트
import { describe, it, expect } from 'vitest';
import { candidateCargoTypes, resolveDiscountRate } from '@/lib/ups/cargo-type-utils';

describe('TC-DEF-B040-01: DOC/NONDOC별 할인율 조회', () => {
  it('Express DOC 상품은 DOC 할인율을 사용한다', () => {
    const zoneRates = { 'DOC': 0.55, 'NON_DOC': 0.75, 'ALL': 0.1 };
    const rate = resolveDiscountRate(zoneRates, 'DOC');
    expect(rate).toBe(0.55);
  });

  it('Express NONDOC 상품은 NON_DOC 할인율을 사용한다', () => {
    const zoneRates = { 'DOC': 0.55, 'NON_DOC': 0.75, 'ALL': 0.1 };
    const rate = resolveDiscountRate(zoneRates, 'NON_DOC');
    expect(rate).toBe(0.75);
  });

  it('Expedited/Flight(BOTH) 상품은 NON_DOC 우선, 없으면 ALL 폴백', () => {
    // NON_DOC 등록된 경우
    const zoneRatesWithNonDoc = { 'NON_DOC': 0.75, 'ALL': 0.1 };
    const rateWithNonDoc = resolveDiscountRate(zoneRatesWithNonDoc, 'BOTH');
    expect(rateWithNonDoc).toBe(0.75);

    // NON_DOC 미등록, ALL만 등록된 경우
    const zoneRatesAllOnly = { 'ALL': 0.1 };
    const rateAllOnly = resolveDiscountRate(zoneRatesAllOnly, 'BOTH');
    expect(rateAllOnly).toBe(0.1);
  });
});

describe('TC-DEF-B040-02: Expedited/Flight가 DOC/NONDOC 전용 정책 영향을 안 받는 핵심 안전장치', () => {
  it('Expedited/Flight는 DOC 정책을 사용하지 않는다', () => {
    const zoneRates = { 'DOC': 0.55, 'ALL': 0.1 };
    const rate = resolveDiscountRate(zoneRates, 'BOTH');
    // DOC는 후보에 없으므로 ALL 폴백
    expect(rate).toBe(0.1);
  });

  it('Expedited/Flight는 NON_DOC 정책을 우선 사용한다', () => {
    const zoneRates = { 'NON_DOC': 0.75, 'ALL': 0.1 };
    const rate = resolveDiscountRate(zoneRates, 'BOTH');
    expect(rate).toBe(0.75);
  });
});

describe('TC-DEF-B040-03: 기존 ALL 정책 하위호환', () => {
  it('ALL만 등록된 기존 대리점은 모든 상품에 ALL 할인율 적용', () => {
    const zoneRates = { 'ALL': 0.1 };
    
    expect(resolveDiscountRate(zoneRates, 'DOC')).toBe(0.1);
    expect(resolveDiscountRate(zoneRates, 'NON_DOC')).toBe(0.1);
    expect(resolveDiscountRate(zoneRates, 'BOTH')).toBe(0.1);
  });

  it('할인율이 없으면 0을 반환한다', () => {
    const zoneRates = {};
    expect(resolveDiscountRate(zoneRates, 'DOC')).toBe(0);
    expect(resolveDiscountRate(zoneRates, 'NON_DOC')).toBe(0);
    expect(resolveDiscountRate(zoneRates, 'BOTH')).toBe(0);
  });

  it('zoneRates가 undefined이면 0을 반환한다', () => {
    expect(resolveDiscountRate(undefined, 'DOC')).toBe(0);
  });
});

describe('TC-DEF-B040-04: candidateCargoTypes 함수 검증', () => {
  it('freight.ts와 동일한 우선순위 보장', () => {
    // freight.ts candidateCargoTypes:
    //   DOC → ['DOC', 'ALL']
    //   NON_DOC → ['NON_DOC', 'ALL']
    //   BOTH → ['NON_DOC', 'ALL']
    
    const testCases = [
      { cargoType: 'DOC', expected: ['DOC', 'ALL'] },
      { cargoType: 'NON_DOC', expected: ['NON_DOC', 'ALL'] },
      { cargoType: 'BOTH', expected: ['NON_DOC', 'ALL'] },
      { cargoType: undefined, expected: ['NON_DOC', 'ALL'] },
    ];
    
    for (const tc of testCases) {
      expect(candidateCargoTypes(tc.cargoType)).toEqual(tc.expected);
    }
  });
});

describe('TC-DEF-B040-05: 되돌리기 검증', () => {
  it('candidateCargoTypes 없이 단순 zoneRates[zoneId] 사용 시 버그 재현', () => {
    // 기존 버그 패턴: const rate = zoneRates[zoneId] ?? 0;
    // NON_DOC 90% + ALL 10% 동시 등록 시 Expedited/Flight 원가 오류
    
    const zoneRates = { 'NON_DOC': 0.9, 'ALL': 0.1 };
    
    // 버그 패턴: zoneRates['BOTH']는 undefined → ALL 폴백
    const buggyRate = zoneRates['BOTH'] ?? 0;
    expect(buggyRate).toBe(0); // WRONG! NON_DOC 90%가 적용되어야 함
    
    // 올바른 패턴: resolveDiscountRate 사용
    const correctRate = resolveDiscountRate(zoneRates, 'BOTH');
    expect(correctRate).toBe(0.9); // NON_DOC 90% 적용
  });
});
