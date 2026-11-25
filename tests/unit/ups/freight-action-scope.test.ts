import { describe, it, expect, vi, beforeEach } from 'vitest';

const coreMock = vi.fn();
const sessionState: { role: string; orgId: string | null } = { role: 'ADMIN', orgId: 'org-admin' };
let membership: { agency_org_id?: string } | null = null;

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(async () => ({
    user: { id: 'u1' },
    profile: { id: 'u1', role: sessionState.role, org_id: sessionState.orgId },
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: membership, error: null }),
      })),
    },
  })),
}));

vi.mock('@/lib/ups/estimate-core', () => ({
  estimateUpsFreightCore: (...args: unknown[]) => coreMock(...args),
}));

import { estimateUpsFreight } from '@/app/actions/ups/freight';

const fullEstimate = {
  platform: {
    chargeableWeightKg: 5,
    billingWeightKg: 5,
    baseSellingPrice: 100,
    baseCostPrice: 80,
    fuelSurchargeSellingAmount: 10,
    fuelSurchargeCostAmount: 8,
    otherChargesSellingTotal: 5,
    otherChargesCostTotal: 4,
    surgeFeeSellingAmount: 0,
    surgeFeeCostAmount: 0,
    totalSellingPrice: 115,
    totalCostPrice: 92,
    currency: 'USD',
    breakdown: {
      zone: { zone_code: 'Z1', zone_name: 'Zone 1' },
      product: { product_code: 'WW_EXPRESS_NONDOC', product_name: 'Express', cargo_type: 'NON_DOC' },
      actualWeightKg: 5,
      volumetricWeightKg: 0,
      chargeableWeightKg: 5,
      volumetricDivisor: 5000,
      billingWeightKg: 5,
      baseRateId: 'r1',
      baseSellingPrice: 100,
      baseCostPrice: 80,
      costSurchargeRate: 0,
      fuelSurchargeId: null,
      fuelSurchargeRate: 0.1,
      fuelSurchargeSellingAmount: 10,
      fuelSurchargeCostAmount: 8,
      otherChargeItems: [],
      otherChargesSellingTotal: 5,
      otherChargesCostTotal: 4,
      surgeFeeId: null,
      surgeFeeSellingRatePerKg: 0,
      surgeFeeSellingAmount: 0,
      surgeFeeCostAmount: 0,
      oversizeApplied: false,
    },
  },
  agency: { baseSellingPrice: 100, fuelSurchargeSellingAmount: 10, otherChargesSellingTotal: 5, surgeFeeSellingAmount: 0, platformSellingTotal: 115, agencyCostPrice: 92, agencySellingPrice: 110, discountRate: 0.04, agencyOtherChargesTotal: 0 },
  shipper: { baseSellingPrice: 100, fuelSurchargeSellingAmount: 10, otherChargesSellingTotal: 5, surgeFeeSellingAmount: 0, shipperDiscountRate: 0.02, finalFreight: 112 },
};

const input = { productId: 'p1', destCountryCode: 'US', actualWeightKg: 5 };

describe('estimateUpsFreight 세션 범위 결정 (TASK-B-373 PR-2)', () => {
  beforeEach(() => {
    coreMock.mockReset();
    coreMock.mockResolvedValue(fullEstimate);
    membership = null;
  });

  it('관리자 — 입력 범위 그대로, 원가 포함 DTO', async () => {
    sessionState.role = 'ADMIN';
    const dto = await estimateUpsFreight({ ...input, agencyOrgId: 'ag-1', shipperOrgId: 'sh-1' });
    expect(coreMock).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: 'ag-1', shipperOrgId: 'sh-1' }), expect.anything());
    expect(dto.platform.totalCostPrice).toBe(92);
    expect(dto.platform.totalSellingPrice).toBe(115);
    expect(dto.agency).not.toBeNull();
    expect(dto.shipper).not.toBeNull();
  });

  it('대리점 — agencyOrgId는 세션 org로 고정, 미소속 화주는 무시', async () => {
    sessionState.role = 'AGENCY';
    sessionState.orgId = 'ag-self';
    membership = null;
    const dto = await estimateUpsFreight({ ...input, agencyOrgId: 'ag-other', shipperOrgId: 'sh-target' });
    expect(coreMock).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: 'ag-self', shipperOrgId: null }), expect.anything());
    expect(dto.platform.totalCostPrice).toBeUndefined();
    expect(dto.platform.totalSellingPrice).toBe(115);
    expect(dto.agency).not.toBeNull();
    expect(dto.shipper).toBeNull();
  });

  it('대리점 — 소속 화주는 계산 범위에 포함', async () => {
    sessionState.role = 'AGENCY';
    sessionState.orgId = 'ag-self';
    membership = { agency_org_id: 'ag-self' };
    const dto = await estimateUpsFreight({ ...input, shipperOrgId: 'sh-owned' });
    expect(coreMock).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: 'ag-self', shipperOrgId: 'sh-owned' }), expect.anything());
    expect(dto.shipper).not.toBeNull();
  });

  it('대리점 소속 화주 — 대리점은 서버가 조회, 플랫폼 판매가 미전달', async () => {
    sessionState.role = 'CORPORATE';
    sessionState.orgId = 'sh-1';
    membership = { agency_org_id: 'ag-1' };
    const dto = await estimateUpsFreight({ ...input, agencyOrgId: 'spoofed', shipperOrgId: 'other' });
    expect(coreMock).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: 'ag-1', shipperOrgId: 'sh-1' }), expect.anything());
    expect(dto.platform.totalSellingPrice).toBeNull();
    expect(dto.agency).toBeNull();
    expect(dto.shipper).not.toBeNull();
  });

  it('비소속 화주 — 플랫폼 판매가만 전달', async () => {
    sessionState.role = 'CORPORATE';
    sessionState.orgId = 'sh-direct';
    membership = null;
    const dto = await estimateUpsFreight({ ...input });
    expect(coreMock).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: null, shipperOrgId: 'sh-direct' }), expect.anything());
    expect(dto.platform.totalSellingPrice).toBe(115);
    expect(dto.agency).toBeNull();
    expect(dto.shipper).toBeNull();
  });
});
