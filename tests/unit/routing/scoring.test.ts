import { describe, it, expect } from 'vitest';

/**
 * ROU-01 스코어링 알고리즘 단위 검증
 * 명세 근거: Ds-11 Section 13 — Architecture & Algorithms
 *
 * TC-R.1: Cost-Optimal 선택 (최저비용 ASC)
 * TC-R.2: Time-Optimal 선택 (최단시간 ASC)
 * TC-R.3: Balanced 스코어 산출 (α=0.6, β=0.4, min-max 정규화)
 *
 * 이 테스트는 순수 알고리즘 검증이며 외부 의존성이 없습니다.
 * Riley: routing.ts 구현 시 아래 알고리즘을 @/lib/routing/scoring 으로 추출하여
 *        동일한 로직을 사용하십시오.
 */

// ─── 알고리즘 정의 (Ds-11 스코어링 명세 기준) ────────────────────────────────

interface Candidate {
  carrier: string;
  total_cost: number;
  total_transit_days: number;
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

function selectCostOptimal(candidates: Candidate[]): Candidate {
  return [...candidates].sort((a, b) => a.total_cost - b.total_cost)[0];
}

function selectTimeOptimal(candidates: Candidate[]): Candidate {
  return [...candidates].sort((a, b) => a.total_transit_days - b.total_transit_days)[0];
}

function selectBalanced(candidates: Candidate[]): { candidate: Candidate; score: number } {
  const α = 0.6;
  const β = 0.4;
  const costs = candidates.map((c) => c.total_cost);
  const days = candidates.map((c) => c.total_transit_days);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const minDays = Math.min(...days);
  const maxDays = Math.max(...days);

  const scored = candidates.map((c) => ({
    candidate: c,
    score: α * normalize(c.total_cost, minCost, maxCost) + β * normalize(c.total_transit_days, minDays, maxDays),
  }));

  return scored.sort((a, b) => a.score - b.score)[0];
}

// ─── 테스트 데이터 ────────────────────────────────────────────────────────────
// 인천(ICN) → 싱가포르(SIN) 3개 후보 시나리오
// KE: 저렴하나 느림 / SQ: 빠르나 비쌈 / OZ: 중간
const CANDIDATES: Candidate[] = [
  { carrier: 'KE', total_cost: 1000, total_transit_days: 8 },
  { carrier: 'SQ', total_cost: 1400, total_transit_days: 5 },
  { carrier: 'OZ', total_cost: 1100, total_transit_days: 6 },
];

// ─── TC-R.1: Cost-Optimal ────────────────────────────────────────────────────

describe('TC-R.1: Cost-Optimal 선택 (최저비용 ASC)', () => {
  it('후보 중 total_cost 가 가장 낮은 캐리어를 선택한다', () => {
    const result = selectCostOptimal(CANDIDATES);
    expect(result.carrier).toBe('KE');
    expect(result.total_cost).toBe(1000);
  });

  it('원본 배열을 변경하지 않는다 (불변성)', () => {
    const original = [...CANDIDATES];
    selectCostOptimal(CANDIDATES);
    expect(CANDIDATES[0].carrier).toBe(original[0].carrier);
  });
});

// ─── TC-R.2: Time-Optimal ────────────────────────────────────────────────────

describe('TC-R.2: Time-Optimal 선택 (최단시간 ASC)', () => {
  it('후보 중 total_transit_days 가 가장 낮은 캐리어를 선택한다', () => {
    const result = selectTimeOptimal(CANDIDATES);
    expect(result.carrier).toBe('SQ');
    expect(result.total_transit_days).toBe(5);
  });

  it('원본 배열을 변경하지 않는다 (불변성)', () => {
    const original = [...CANDIDATES];
    selectTimeOptimal(CANDIDATES);
    expect(CANDIDATES[0].carrier).toBe(original[0].carrier);
  });
});

// ─── TC-R.3: Balanced 스코어 산출 ────────────────────────────────────────────

describe('TC-R.3: Balanced 스코어 산출 (α=0.6, β=0.4)', () => {
  /**
   * 정규화 계산 (costs=[1000,1400,1100], days=[5,6,8]):
   *   KE: norm_cost=0/400=0.000, norm_time=3/3=1.000 → score=0×0.6 + 1.0×0.4 = 0.400
   *   SQ: norm_cost=400/400=1.000, norm_time=0/3=0.000 → score=1.0×0.6 + 0×0.4 = 0.600
   *   OZ: norm_cost=100/400=0.250, norm_time=1/3=0.333 → score=0.25×0.6 + 0.333×0.4 ≈ 0.283
   * → BALANCED 우승: OZ (0.283 최소)
   */
  it('α=0.6, β=0.4 가중치 합이 1.0 이다', () => {
    const α = 0.6;
    const β = 0.4;
    expect(α + β).toBe(1.0);
  });

  it('KE 스코어 ≈ 0.400 (norm_cost=0, norm_time=1)', () => {
    const α = 0.6, β = 0.4;
    const costs = CANDIDATES.map((c) => c.total_cost);
    const days = CANDIDATES.map((c) => c.total_transit_days);
    const keScore = α * normalize(1000, Math.min(...costs), Math.max(...costs))
                  + β * normalize(8,    Math.min(...days),  Math.max(...days));
    expect(keScore).toBeCloseTo(0.4, 5);
  });

  it('SQ 스코어 ≈ 0.600 (norm_cost=1, norm_time=0)', () => {
    const α = 0.6, β = 0.4;
    const costs = CANDIDATES.map((c) => c.total_cost);
    const days = CANDIDATES.map((c) => c.total_transit_days);
    const sqScore = α * normalize(1400, Math.min(...costs), Math.max(...costs))
                  + β * normalize(5,    Math.min(...days),  Math.max(...days));
    expect(sqScore).toBeCloseTo(0.6, 5);
  });

  it('OZ 스코어 ≈ 0.283 (norm_cost=0.25, norm_time=0.333)', () => {
    const α = 0.6, β = 0.4;
    const costs = CANDIDATES.map((c) => c.total_cost);
    const days = CANDIDATES.map((c) => c.total_transit_days);
    const ozScore = α * normalize(1100, Math.min(...costs), Math.max(...costs))
                  + β * normalize(6,    Math.min(...days),  Math.max(...days));
    expect(ozScore).toBeCloseTo(0.283, 2);
  });

  it('Balanced 최소 스코어 캐리어는 OZ 이다', () => {
    const { candidate, score } = selectBalanced(CANDIDATES);
    expect(candidate.carrier).toBe('OZ');
    expect(score).toBeCloseTo(0.283, 2);
  });

  it('단일 후보일 때 스코어는 0 이다 (max===min 경계)', () => {
    const single: Candidate[] = [{ carrier: 'KE', total_cost: 1000, total_transit_days: 8 }];
    const { score } = selectBalanced(single);
    expect(score).toBe(0);
  });
});
