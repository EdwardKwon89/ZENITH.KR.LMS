// Phase 7.1 TASK-174 IMP-145 (R-09 회귀 테스트 신규 추가) — An-14 §4·§11
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimateUpsFreight } from '@/app/actions/ups/freight';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

const createQueryMock = (resolved: { data: any; error?: any }) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolved.data, error: resolved.error ?? null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolved.data, error: resolved.error ?? null }),
    then: vi.fn().mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: resolved.data, error: resolved.error ?? null }).then(onFulfilled)
    ),
  };
  return chain;
};

const PRODUCT = {
  id: 'p1', product_code: 'WW_EXPRESS_NONDOC', sub_code: null, product_name: 'Express',
  cargo_type: 'NON_DOC', ddu_available: false, ddp_available: true, is_active: true, sort_order: 1, created_at: '',
};
const ZONE = {
  id: 'z1', zone_code: 'Z8', zone_name: 'North America', description: null, is_active: true, sort_order: 8,
  created_at: '', created_by: null, countries: [{ id: 'c1', zone_id: 'z1', country_code: 'USA', created_at: '', created_by: null }],
};
const BASE_RATE = {
  id: 'r1', product_id: 'p1', zone_id: 'z1', weight_kg: 5, selling_price: 85000, cost_price: 68000,
  currency: 'KRW', valid_from: '2026-07-01', valid_until: null, is_active: true, created_at: '', created_by: null,
};
const FUEL = { id: 'f1', product_id: null, effective_week: '2026-06-29', selling_rate: 0.185, cost_rate: 0.155, created_at: '', created_by: null };

function buildMockSupabase(overrides: Record<string, any> = {}) {
  const tableMocks: Record<string, any> = {
    zen_ups_products: createQueryMock({ data: PRODUCT }),
    zen_ups_zones: createQueryMock({ data: [ZONE] }),
    zen_ups_base_rates: createQueryMock({ data: BASE_RATE }),
    zen_ups_fuel_surcharges: createQueryMock({ data: [FUEL] }),
    zen_ups_other_charges: createQueryMock({ data: [] }),
    zen_agency_pricing_policies: createQueryMock({ data: null }),
    zen_agency_rate_overrides: createQueryMock({ data: null }),
    zen_agency_other_charges: createQueryMock({ data: [] }),
    zen_agency_shippers: createQueryMock({ data: null }),
    ...overrides,
  };
  return { from: vi.fn((table: string) => tableMocks[table] ?? createQueryMock({ data: null })) };
}

describe('TC-UPS-FREIGHT-01: estimateUpsFreight', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Agency 정보 없이 호출하면 Platform 견적만 반환한다', async () => {
    (validateUserAction as any).mockResolvedValue({ supabase: buildMockSupabase() });

    const result = await estimateUpsFreight({
      productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5,
    });

    expect(result.platform.totalSellingPrice).toBeGreaterThan(0);
    expect(result.agency).toBeNull();
    expect(result.shipper).toBeNull();
  });

  it('agencyOrgId 전달 시 Agency 단계 견적을 포함한다(override 없음 → 폴백)', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase({
        zen_agency_pricing_policies: createQueryMock({ data: { discount_rate: 0.1 } }),
      }),
    });

    const result = await estimateUpsFreight({
      productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5, agencyOrgId: 'agency-1',
    });

    expect(result.agency).not.toBeNull();
    expect(result.agency!.source).toBe('platform_fallback');
    expect(result.shipper).toBeNull();
  });

  it('agencyOrgId + shipperOrgId 전달 시 Shipper 최종 운송비까지 계산한다', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase({
        zen_agency_pricing_policies: createQueryMock({ data: { discount_rate: 0.1 } }),
        zen_agency_rate_overrides: createQueryMock({ data: { selling_price: 90000, cost_price: 76500 } }),
        zen_agency_shippers: createQueryMock({ data: { discount_rate: 0.05 } }),
      }),
    });

    const result = await estimateUpsFreight({
      productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5,
      agencyOrgId: 'agency-1', shipperOrgId: 'shipper-1',
    });

    expect(result.agency!.source).toBe('override');
    expect(result.agency!.agencySellingPrice).toBe(90000);
    expect(result.shipper).not.toBeNull();
    expect(result.shipper!.finalFreight).toBeCloseTo(90000 * 0.95, 2);
  });

  it('목적지 국가에 매핑된 Zone이 없으면 에러를 던진다', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase({ zen_ups_zones: createQueryMock({ data: [] }) }),
    });

    await expect(
      estimateUpsFreight({ productId: 'p1', destCountryCode: 'ZZZ', actualWeightKg: 5 })
    ).rejects.toThrow(/Zone/);
  });

  it('해당 조건의 기준요금이 없으면 에러를 던진다', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase({ zen_ups_base_rates: createQueryMock({ data: null }) }),
    });

    await expect(
      estimateUpsFreight({ productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5 })
    ).rejects.toThrow(/기준요금/);
  });
});
