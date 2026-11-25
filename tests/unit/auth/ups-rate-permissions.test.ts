import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hasAdminOrManagerRole,
  hasAdminManagerOrSubAdminRole,
  requireAdminOrManager,
  requireAdminManagerOrSubAdmin,
} from '@/lib/auth/ups-rate-permissions';

describe('ups-rate-permissions (TASK-B-373 PR-2)', () => {
  it.each([
    ['ZENITH_SUPER_ADMIN', true],
    ['ADMIN', true],
    ['MANAGER', true],
    ['SUB_ADMIN', false],
    ['AGENCY', false],
    ['SHIPPER', false],
    ['CORPORATE', false],
    [undefined, false],
  ])('hasAdminOrManagerRole(%s) = %s', (role, expected) => {
    expect(hasAdminOrManagerRole(role as string | undefined)).toBe(expected);
  });

  it.each([
    ['ZENITH_SUPER_ADMIN', true],
    ['ADMIN', true],
    ['MANAGER', true],
    ['SUB_ADMIN', true],
    ['AGENCY', false],
    ['SHIPPER', false],
    [undefined, false],
  ])('hasAdminManagerOrSubAdminRole(%s) = %s', (role, expected) => {
    expect(hasAdminManagerOrSubAdminRole(role as string | undefined)).toBe(expected);
  });

  it('requireAdminOrManager — SUB_ADMIN 거부', () => {
    expect(() => requireAdminOrManager('SUB_ADMIN')).toThrow('UPS 요율 관리 권한이 없습니다.');
    expect(() => requireAdminOrManager('ADMIN')).not.toThrow();
  });

  it('requireAdminManagerOrSubAdmin — SUB_ADMIN 허용', () => {
    expect(() => requireAdminManagerOrSubAdmin('SUB_ADMIN')).not.toThrow();
    expect(() => requireAdminManagerOrSubAdmin('AGENCY')).toThrow('Agency 원가 할인율 관리 권한이 없습니다.');
  });
});

describe('rates 조회 6종 역할 가드 (C안)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('@/lib/i18n/action-error', () => ({ trError: vi.fn(async (key: string) => key) }));
  });

  async function setup(role: string) {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
      then: (cb: any) => Promise.resolve({ data: [], error: null }).then(cb),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) };
    vi.doMock('@/lib/auth/guards', () => ({
      validateUserAction: vi.fn().mockResolvedValue({
        user: { id: 'u1' },
        profile: { id: 'u1', role, org_id: 'org-1' },
        supabase,
      }),
    }));
    return supabase;
  }

  it.each(['SHIPPER', 'CORPORATE', 'AGENCY', 'SUB_ADMIN'])(
    '%s — 비관리자 원가 5종은 거부된다',
    async (role) => {
      await setup(role);
      const rates = await import('@/app/actions/ups/rates');
      for (const fn of [
        rates.getUpsFuelSurcharge,
        rates.getUpsOtherCharges,
        rates.getUpsSurgeFees,
        rates.getUpsWeightTierRates,
        rates.getUpsFreightMinimums,
      ]) {
        await expect((fn as any)()).rejects.toThrow('permission_denied');
      }
    }
  );

  it('SUB_ADMIN — 기본요율은 허용되고 나머지 5종은 거부된다', async () => {
    await setup('SUB_ADMIN');
    const rates = await import('@/app/actions/ups/rates');
    await expect(rates.getUpsBaseRates()).resolves.toEqual([]);
    await expect(rates.getUpsOtherCharges()).rejects.toThrow('permission_denied');
  });

  it.each(['ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'])('%s — 기본요율·원가 5종 모두 허용(양성 대조)', async (role) => {
    await setup(role);
    const rates = await import('@/app/actions/ups/rates');
    await expect(rates.getUpsBaseRates()).resolves.toEqual([]);
    for (const fn of [
      rates.getUpsFuelSurcharge,
      rates.getUpsOtherCharges,
      rates.getUpsSurgeFees,
      rates.getUpsWeightTierRates,
      rates.getUpsFreightMinimums,
    ]) {
      await expect((fn as any)()).resolves.toBeDefined();
    }
  });

  it('getAgencyPricingPolicies — 관리자급 가드(비관리자 거부)', async () => {
    await setup('AGENCY');
    const mutation = await import('@/app/actions/ups/rates-mutation');
    await expect(mutation.getAgencyPricingPolicies()).rejects.toThrow('Agency 원가 할인율 관리 권한이 없습니다.');
  });

  it('getAgencyPricingPolicies — ADMIN 허용(양성 대조)', async () => {
    await setup('ADMIN');
    const mutation = await import('@/app/actions/ups/rates-mutation');
    await expect(mutation.getAgencyPricingPolicies()).resolves.toEqual([]);
  });
});
