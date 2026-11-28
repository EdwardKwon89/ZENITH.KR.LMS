import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: Record<string, unknown[]> = { lte: [], or: [] };

const chain: any = {
  select: vi.fn(() => chain),
  eq: vi.fn(() => chain),
  lte: vi.fn((...args: unknown[]) => { calls.lte.push(args); return chain; }),
  or: vi.fn((...args: unknown[]) => { calls.or.push(args); return chain; }),
  order: vi.fn(() => chain),
  then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
};

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(async () => ({
    user: { id: 'u1' },
    profile: { id: 'u1', role: 'SHIPPER', org_id: 'org-1' },
    supabase: { from: vi.fn(() => chain) },
  })),
}));

import { getPublicWeightTierRates } from '@/app/actions/ups/rates-public';

describe('getPublicWeightTierRates — 기준일 유효기간 필터 (TASK-B-373 PR-2)', () => {
  beforeEach(() => {
    calls.lte = [];
    calls.or = [];
    vi.clearAllMocks();
  });

  it('valid_from <= 기준일, valid_until null 또는 >= 기준일 조건을 적용한다', async () => {
    const today = new Date().toISOString().split('T')[0];
    await getPublicWeightTierRates();
    expect(calls.lte).toContainEqual(['valid_from', today]);
    expect(String(calls.or[0]?.[0])).toContain('valid_until.is.null');
    expect(String(calls.or[0]?.[0])).toContain(`valid_until.gte.${today}`);
  });

  it('빈 결과를 반환한다(만료 행 미포함 계약)', async () => {
    await expect(getPublicWeightTierRates()).resolves.toEqual([]);
  });
});
