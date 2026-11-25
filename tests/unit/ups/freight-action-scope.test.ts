import { describe, it, expect, vi, beforeEach } from 'vitest';

const coreMock = vi.fn();
const sessionState: { role: string; orgId: string | null } = { role: 'ADMIN', orgId: 'org-admin' };
let membershipRows: Array<Record<string, string>> = [];
let membershipError: { message: string } | null = null;

const queryChain: any = {
  select: vi.fn(() => queryChain),
  eq: vi.fn(() => queryChain),
  then: (resolve: any) => Promise.resolve({ data: membershipRows, error: membershipError }).then(resolve),
};

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(async () => ({
    user: { id: 'u1' },
    profile: { id: 'u1', role: sessionState.role, org_id: sessionState.orgId },
    supabase: { from: vi.fn(() => queryChain) },
  })),
}));

// 소속 판정은 서비스 롤 클라이언트로 수행한다(세션 RLS 비의존).
vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: vi.fn(async () => ({ from: vi.fn(() => queryChain) })),
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
      otherChargeItems: [
        { chargeId: 'c1', chargeCode: 'OVERSIZE', chargeName: 'Oversize', unit: 'PER_SHIPMENT', sellingBase: 5, costBase: 4, fuelSurchargeSelling: 1, fuelSurchargeCost: 1 },
      ],
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
    membershipRows = [];
    membershipError = null;
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

  it('대리점 — agencyOrgId는 세션 org로 고정', async () => {
    sessionState.role = 'AGENCY';
    sessionState.orgId = 'ag-self';
    const dto = await estimateUpsFreight({ ...input, agencyOrgId: 'ag-other' });
    expect(coreMock).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: 'ag-self', shipperOrgId: null }), expect.anything());
    expect(dto.platform.totalCostPrice).toBeUndefined();
    expect(dto.platform.totalSellingPrice).toBe(115);
    expect(dto.agency).not.toBeNull();
    expect(dto.shipper).toBeNull();
  });

  it('대리점 — 소속 화주는 계산 범위에 포함', async () => {
    sessionState.role = 'AGENCY';
    sessionState.orgId = 'ag-self';
    membershipRows = [{ shipper_org_id: 'sh-owned' }];
    const dto = await estimateUpsFreight({ ...input, shipperOrgId: 'sh-owned' });
    expect(coreMock).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: 'ag-self', shipperOrgId: 'sh-owned' }), expect.anything());
    expect(dto.shipper).not.toBeNull();
  });

  it('대리점 — 소속이 아닌 화주 지정은 거부', async () => {
    sessionState.role = 'AGENCY';
    sessionState.orgId = 'ag-self';
    membershipRows = [];
    await expect(estimateUpsFreight({ ...input, shipperOrgId: 'sh-other' })).rejects.toThrow();
    expect(coreMock).not.toHaveBeenCalled();
  });

  it('대리점 — 소속 조회 오류는 fail-closed(예외)', async () => {
    sessionState.role = 'AGENCY';
    sessionState.orgId = 'ag-self';
    membershipError = { message: 'db down' };
    await expect(estimateUpsFreight({ ...input, shipperOrgId: 'sh-owned' })).rejects.toThrow();
    expect(coreMock).not.toHaveBeenCalled();
  });

  it('대리점 소속 화주 — 대리점은 서버가 조회, 플랫폼 판매가 미전달', async () => {
    sessionState.role = 'CORPORATE';
    sessionState.orgId = 'sh-1';
    membershipRows = [{ agency_org_id: 'ag-1' }];
    const dto = await estimateUpsFreight({ ...input, agencyOrgId: 'spoofed', shipperOrgId: 'other' });
    expect(coreMock).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: 'ag-1', shipperOrgId: 'sh-1' }), expect.anything());
    expect(dto.platform.totalSellingPrice).toBeNull();
    expect(dto.agency).toBeNull();
    expect(dto.shipper).not.toBeNull();
  });

  it('비소속 화주 — 플랫폼 판매가만 전달', async () => {
    sessionState.role = 'CORPORATE';
    sessionState.orgId = 'sh-direct';
    membershipRows = [];
    const dto = await estimateUpsFreight({ ...input });
    expect(coreMock).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: null, shipperOrgId: 'sh-direct' }), expect.anything());
    expect(dto.platform.totalSellingPrice).toBe(115);
    expect(dto.agency).toBeNull();
    expect(dto.shipper).toBeNull();
  });

  it('소속 조회 오류 — 비소속으로 폴백하지 않고 예외', async () => {
    sessionState.role = 'SHIPPER';
    sessionState.orgId = 'sh-1';
    membershipError = { message: 'db down' };
    await expect(estimateUpsFreight({ ...input })).rejects.toThrow();
    expect(coreMock).not.toHaveBeenCalled();
  });

  it('다중 소속 — 소속 미확정으로 예외', async () => {
    sessionState.role = 'SHIPPER';
    sessionState.orgId = 'sh-1';
    membershipRows = [{ agency_org_id: 'ag-1' }, { agency_org_id: 'ag-2' }];
    await expect(estimateUpsFreight({ ...input })).rejects.toThrow();
    expect(coreMock).not.toHaveBeenCalled();
  });

  it('OPERATOR — 입력 화주 기준으로 계산, 원가 미포함', async () => {
    sessionState.role = 'OPERATOR';
    membershipRows = [{ agency_org_id: 'ag-1' }];
    const dto = await estimateUpsFreight({ ...input, shipperOrgId: 'sh-selected' });
    expect(coreMock).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: 'ag-1', shipperOrgId: 'sh-selected' }), expect.anything());
    expect(dto.platform.totalCostPrice).toBeUndefined();
    expect(dto.shipper).not.toBeNull();
  });

  it('INDIVIDUAL(org 없음) — 플랫폼 판매가만', async () => {
    sessionState.role = 'INDIVIDUAL';
    sessionState.orgId = null;
    const dto = await estimateUpsFreight({ ...input });
    expect(coreMock).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: null, shipperOrgId: null }), expect.anything());
    expect(dto.platform.totalSellingPrice).toBe(115);
    expect(dto.shipper).toBeNull();
  });

  it('견적 화면이 없는 역할 — 거부', async () => {
    sessionState.role = 'SUB_ADMIN';
    await expect(estimateUpsFreight({ ...input })).rejects.toThrow();
    expect(coreMock).not.toHaveBeenCalled();
  });
});
