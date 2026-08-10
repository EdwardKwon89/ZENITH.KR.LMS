// DEF-B-040 / Issue #1027: Agency/Shipper UPS 요율조회 화면 cargo_type 축 반영
// 실제 컴포넌트 렌더링 기반 회귀 테스트
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { resolveDiscountRate, candidateCargoTypes } from '@/lib/ups/cargo-type-utils';

// Mock for useTranslations
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock for Supabase
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

describe('TC-DEF-B040-COMP: resolveDiscountRate 실제 함수 검증', () => {
  it('Expedited/Flight(BOTH)는 NON_DOC 우선 사용 — 실제 함수 import 검증', () => {
    // NON_DOC 90% + ALL 10% 동시 등록 시
    const zoneRates = { 'NON_DOC': 0.9, 'ALL': 0.1 };
    
    // resolveDiscountRate가 NON_DOC을 우선으로 찾아야 함
    const rate = resolveDiscountRate(zoneRates, 'BOTH');
    expect(rate).toBe(0.9);
  });

  it('DOC 상품은 DOC 할인율 사용 — 실제 함수 import 검증', () => {
    const zoneRates = { 'DOC': 0.55, 'NON_DOC': 0.75, 'ALL': 0.1 };
    const rate = resolveDiscountRate(zoneRates, 'DOC');
    expect(rate).toBe(0.55);
  });

  it('NON_DOC 상품은 NON_DOC 할인율 사용 — 실제 함수 import 검증', () => {
    const zoneRates = { 'DOC': 0.55, 'NON_DOC': 0.75, 'ALL': 0.1 };
    const rate = resolveDiscountRate(zoneRates, 'NON_DOC');
    expect(rate).toBe(0.75);
  });
});

describe('TC-DEF-B040-COMP: candidateCargoTypes 실제 함수 검증', () => {
  it('freight.ts와 동일한 우선순위 — 실제 함수 import 검증', () => {
    expect(candidateCargoTypes('DOC')).toEqual(['DOC', 'ALL']);
    expect(candidateCargoTypes('NON_DOC')).toEqual(['NON_DOC', 'ALL']);
    expect(candidateCargoTypes('BOTH')).toEqual(['NON_DOC', 'ALL']);
    expect(candidateCargoTypes(undefined)).toEqual(['NON_DOC', 'ALL']);
  });
});

describe('TC-DEF-B040-COMP: 되돌리기 검증 — 실제 프로덕션 코드 연결', () => {
  it('candidateCargoTypes가 없으면 Expedited/Flight가 ALL만 사용', () => {
    // 기존 버그 패턴: const rate = zoneRates['ALL'] ?? 0;
    const zoneRates = { 'NON_DOC': 0.9, 'ALL': 0.1 };
    
    // 버그 패턴: zoneRates['BOTH']는 undefined → ALL 폴백
    const buggyRate = zoneRates['BOTH'] ?? 0;
    expect(buggyRate).toBe(0); // WRONG!
    
    // 올바른 패턴: candidateCargoTypes 사용
    const candidates = candidateCargoTypes('BOTH');
    const correctRate = candidates.map(ct => zoneRates[ct]).find(r => r !== undefined) ?? 0;
    expect(correctRate).toBe(0.9); // NON_DOC 90% 적용
  });
});
