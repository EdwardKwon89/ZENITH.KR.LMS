/**
 * ROU-01 Logistics Scoring Module
 * 명세 근거: Ds-11 Section 13 — Architecture & Algorithms
 */
import { getNumericParam } from '../params/service';

export interface Candidate {
  carrier?: string;
  total_cost: number;
  total_transit_days: number;
}

/**
 * Min-Max 정규화 (0~1 범위 산출)
 */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

/**
 * 1. Cost-Optimal (최저비용 ASC)
 */
export function selectCostOptimal<T extends Candidate>(candidates: T[]): T {
  if (candidates.length === 0) throw new Error("No candidates for scoring");
  return [...candidates].sort((a, b) => a.total_cost - b.total_cost || a.total_transit_days - b.total_transit_days)[0];
}

/**
 * 2. Time-Optimal (최단시간 ASC)
 */
export function selectTimeOptimal<T extends Candidate>(candidates: T[]): T {
  if (candidates.length === 0) throw new Error("No candidates for scoring");
  return [...candidates].sort((a, b) => a.total_transit_days - b.total_transit_days || a.total_cost - b.total_cost)[0];
}

/**
 * 3. Balanced (최적, 기본 추천)
 * 스코어: α × norm_cost + β × norm_time (α=0.6, β=0.4)
 */
export async function selectBalanced<T extends Candidate>(candidates: T[]): Promise<{ candidate: T; score: number }> {
  if (candidates.length === 0) throw new Error("No candidates for scoring");

  const α = await getNumericParam('ROUTING_WEIGHT_ALPHA', 0.6);
  const β = await getNumericParam('ROUTING_WEIGHT_BETA', 0.4);
  
  const costs = candidates.map((c) => c.total_cost);
  const days = candidates.map((c) => c.total_transit_days);
  
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const minDays = Math.min(...days);
  const maxDays = Math.max(...days);

  const scored = candidates.map((c) => {
    const normCost = normalize(c.total_cost, minCost, maxCost);
    const normTime = normalize(c.total_transit_days, minDays, maxDays);
    const score = (α * normCost) + (β * normTime);
    
    return {
      candidate: c,
      score: Math.round(score * 1000) / 1000 // 소수점 3자리 유지
    };
  });

  // 스코어가 낮을수록(0에 가까울수록) 우수
  const winner = scored.sort((a, b) => a.score - b.score)[0];
  return winner;
}
