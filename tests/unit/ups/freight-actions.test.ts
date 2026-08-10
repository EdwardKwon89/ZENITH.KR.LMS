// Phase 7.1 TASK-174 IMP-145 (R-09 회귀 테스트 신규 추가) — An-14 §4·§11
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimateUpsFreight } from '@/app/actions/ups/freight';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/utils/supabase/server';

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
const BOX_PRODUCT = {
  id: 'p2', product_code: 'WW_FLIGHT', sub_code: null, product_name: 'Flight',
  cargo_type: 'BOX', ddu_available: false, ddp_available: true, is_active: true, sort_order: 2, created_at: '',
};
const EXPEDITED_PRODUCT = {
  id: 'p3', product_code: 'WW_EXPEDITED', sub_code: null, product_name: 'Expedited',
  cargo_type: 'BOTH', ddu_available: false, ddp_available: true, is_active: true, sort_order: 3, created_at: '',
};
const ZONE = {
  id: 'z1', zone_code: 'Z8', zone_name: 'North America', description: null, is_active: true, sort_order: 8,
  created_at: '', created_by: null, countries: [{ id: 'c1', zone_id: 'z1', country_code: 'USA', created_at: '', created_by: null }],
};
const IMPORT_ZONE = {
  id: 'z2', zone_code: 'Z5', zone_name: 'Asia Import', description: null, is_active: true, sort_order: 5,
  created_at: '', created_by: null, countries: [{
    id: 'c2', zone_id: 'z2', country_code: 'JPN', product_family: 'FREIGHT', direction: 'IMPORT',
    created_at: '', created_by: null,
  }],
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
    zen_agency_other_charges: createQueryMock({ data: [] }),
    zen_agency_shipper_zone_discounts: createQueryMock({ data: null }),
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

  it('agencyOrgId 전달 시 Agency 단계 견적을 포함한다', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase(),
    });
    (createAdminClient as any).mockResolvedValue(
      buildMockSupabase({
        zen_agency_pricing_policies: createQueryMock({ data: [{ discount_rate: 0.1, cargo_type: 'NON_DOC' }] }),
      })
    );

    const result = await estimateUpsFreight({
      productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5, agencyOrgId: 'agency-1',
    });

    expect(result.agency).not.toBeNull();
    expect(result.agency!.discountRate).toBe(0.1);
    expect(result.shipper).toBeNull();
  });

  it('agencyOrgId + shipperOrgId 전달 시 Shipper 최종 운송비까지 계산한다', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase({
        zen_agency_shipper_zone_discounts: createQueryMock({ data: [{ discount_rate: 0.05, cargo_type: 'NON_DOC' }] }),
      }),
    });
    (createAdminClient as any).mockResolvedValue(
      buildMockSupabase({
        zen_agency_pricing_policies: createQueryMock({ data: [{ discount_rate: 0.1, cargo_type: 'NON_DOC' }] }),
      })
    );

    const result = await estimateUpsFreight({
      productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5,
      agencyOrgId: 'agency-1', shipperOrgId: 'shipper-1',
    });

    expect(result.agency).not.toBeNull();
    expect(result.shipper).not.toBeNull();
    expect(result.shipper!.finalFreight).toBeCloseTo(96475, 0);
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

describe('TC-UPS-FREIGHT-03: 할인율 cargo_type 축 (Issue #1018 + #1023/DEF-B-038)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Express/Saver(cargo_type=NON_DOC) 상품은 Admin→Agency 할인율 조회 시 cargo_type 후보 [NON_DOC, ALL]로 필터한다', async () => {
    const policyMock = createQueryMock({ data: [{ discount_rate: 0.1, cargo_type: 'NON_DOC' }] });
    (validateUserAction as any).mockResolvedValue({ supabase: buildMockSupabase() });
    (createAdminClient as any).mockResolvedValue(
      buildMockSupabase({ zen_agency_pricing_policies: policyMock })
    );

    await estimateUpsFreight({
      productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5, agencyOrgId: 'agency-1',
    });

    expect(policyMock.in).toHaveBeenCalledWith('cargo_type', ['NON_DOC', 'ALL']);
  });

  it('Expedited(cargo_type=BOTH) 상품은 cargo_type 후보 [NON_DOC, ALL]로 필터한다 — DOC 정책은 후보에서 제외', async () => {
    const policyMock = createQueryMock({ data: [{ discount_rate: 0.2, cargo_type: 'ALL' }] });
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase({ zen_ups_products: createQueryMock({ data: EXPEDITED_PRODUCT }) }),
    });
    (createAdminClient as any).mockResolvedValue(
      buildMockSupabase({ zen_agency_pricing_policies: policyMock })
    );

    await estimateUpsFreight({
      productId: 'p3', destCountryCode: 'USA', actualWeightKg: 5, agencyOrgId: 'agency-1',
    });

    expect(policyMock.in).toHaveBeenCalledWith('cargo_type', ['NON_DOC', 'ALL']);
  });

  it('Agency→Shipper 할인율 조회에도 동일한 cargo_type 후보가 적용된다', async () => {
    const shipperPolicyMock = createQueryMock({ data: [{ discount_rate: 0.05, cargo_type: 'NON_DOC' }] });
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase({ zen_agency_shipper_zone_discounts: shipperPolicyMock }),
    });
    (createAdminClient as any).mockResolvedValue(
      buildMockSupabase({ zen_agency_pricing_policies: createQueryMock({ data: [{ discount_rate: 0.1, cargo_type: 'NON_DOC' }] }) })
    );

    await estimateUpsFreight({
      productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5,
      agencyOrgId: 'agency-1', shipperOrgId: 'shipper-1',
    });

    expect(shipperPolicyMock.in).toHaveBeenCalledWith('cargo_type', ['NON_DOC', 'ALL']);
  });
});

describe('TC-UPS-FREIGHT-04: cargo_type ALL/NON_DOC 폴백 (Issue #1023 / DEF-B-038)', () => {
  const DOC_PRODUCT_FIXTURE = {
    id: 'p-doc1', product_code: 'WW_EXPRESS_DOC', sub_code: null, product_name: 'Express DOC',
    cargo_type: 'DOC', ddu_available: false, ddp_available: true, is_active: true, sort_order: 1, created_at: '',
  };
  const SAVER_NONDOC_PRODUCT_FIXTURE = {
    id: 'p-sn1', product_code: 'WW_SAVER_NONDOC', sub_code: null, product_name: 'Saver NONDOC',
    cargo_type: 'NON_DOC', ddu_available: false, ddp_available: true, is_active: true, sort_order: 2, created_at: '',
  };

  beforeEach(() => vi.clearAllMocks());

  function runEstimate(opts: { product: any; agencyPolicies?: any[]; shipperDiscounts?: any[]; shipperOrgId?: boolean }) {
    const supabaseMock = buildMockSupabase({
      zen_ups_products: createQueryMock({ data: opts.product }),
      ...(opts.shipperOrgId
        ? { zen_agency_shipper_zone_discounts: createQueryMock({ data: opts.shipperDiscounts ?? [] }) }
        : {}),
    });
    (validateUserAction as any).mockResolvedValue({ supabase: supabaseMock });
    (createAdminClient as any).mockResolvedValue(
      buildMockSupabase({
        zen_agency_pricing_policies: createQueryMock({ data: opts.agencyPolicies ?? [] }),
        zen_agency_other_charges: createQueryMock({ data: [] }),
      })
    );
    return estimateUpsFreight({
      productId: opts.product.id, destCountryCode: 'USA', actualWeightKg: 5,
      agencyOrgId: 'agency-1', ...(opts.shipperOrgId ? { shipperOrgId: 'shipper-1' } : {}),
    });
  }

  // ─── Admin→Agency (zen_agency_pricing_policies) ────────────────────────────

  it('ALL만 등록 → DOC 상품(Express DOC)도 할인 적용 (폴백)', async () => {
    const result = await runEstimate({
      product: DOC_PRODUCT_FIXTURE,
      agencyPolicies: [{ discount_rate: 0.1, cargo_type: 'ALL' }],
    });
    expect(result.agency).not.toBeNull();
    expect(result.agency!.discountRate).toBe(0.1);
  });

  it('ALL만 등록 → NON_DOC 상품(Saver NONDOC)도 할인 적용 (폴백)', async () => {
    const result = await runEstimate({
      product: SAVER_NONDOC_PRODUCT_FIXTURE,
      agencyPolicies: [{ discount_rate: 0.12, cargo_type: 'ALL' }],
    });
    expect(result.agency!.discountRate).toBe(0.12);
  });

  it('ALL만 등록 → BOTH 상품(Expedited)도 할인 적용 (폴백)', async () => {
    const result = await runEstimate({
      product: EXPEDITED_PRODUCT,
      agencyPolicies: [{ discount_rate: 0.08, cargo_type: 'ALL' }],
    });
    expect(result.agency!.discountRate).toBe(0.08);
  });

  it('DOC만 등록 → DOC 상품 할인 적용, NON_DOC 상품 0% (미적용)', async () => {
    const docResult = await runEstimate({
      product: DOC_PRODUCT_FIXTURE,
      agencyPolicies: [{ discount_rate: 0.15, cargo_type: 'DOC' }],
    });
    expect(docResult.agency!.discountRate).toBe(0.15);

    const nonDocResult = await runEstimate({
      product: SAVER_NONDOC_PRODUCT_FIXTURE,
      agencyPolicies: [{ discount_rate: 0.15, cargo_type: 'DOC' }],
    });
    expect(nonDocResult.agency!.discountRate).toBe(0);
  });

  it('NON_DOC만 등록 → NON_DOC 상품 할인 적용, DOC 상품 0%, Expedited(전자)에도 적용', async () => {
    const nonDocResult = await runEstimate({
      product: SAVER_NONDOC_PRODUCT_FIXTURE,
      agencyPolicies: [{ discount_rate: 0.18, cargo_type: 'NON_DOC' }],
    });
    expect(nonDocResult.agency!.discountRate).toBe(0.18);

    const docResult = await runEstimate({
      product: DOC_PRODUCT_FIXTURE,
      agencyPolicies: [{ discount_rate: 0.18, cargo_type: 'NON_DOC' }],
    });
    expect(docResult.agency!.discountRate).toBe(0);

    const expedResult = await runEstimate({
      product: EXPEDITED_PRODUCT,
      agencyPolicies: [{ discount_rate: 0.18, cargo_type: 'NON_DOC' }],
    });
    expect(expedResult.agency!.discountRate).toBe(0.18);
  });

  it('NON_DOC + ALL 동시 등록 → BOTH(Expedited)는 NON_DOC 우선 (폴백 우선순위)', async () => {
    const result = await runEstimate({
      product: EXPEDITED_PRODUCT,
      agencyPolicies: [
        { discount_rate: 0.05, cargo_type: 'ALL' },
        { discount_rate: 0.18, cargo_type: 'NON_DOC' },
      ],
    });
    expect(result.agency!.discountRate).toBe(0.18);
  });

  // ─── Agency→Shipper (zen_agency_shipper_zone_discounts) ────────────────────

  it('SHIPPER 할인: ALL만 등록 → NON_DOC 상품 할인 적용 (폴백)', async () => {
    const result = await runEstimate({
      product: SAVER_NONDOC_PRODUCT_FIXTURE,
      agencyPolicies: [{ discount_rate: 0.1, cargo_type: 'ALL' }],
      shipperDiscounts: [{ discount_rate: 0.05, cargo_type: 'ALL' }],
      shipperOrgId: true,
    });
    expect(result.shipper).not.toBeNull();
    expect(result.shipper!.shipperDiscountRate).toBe(0.05);
  });

  it('SHIPPER 할인: NON_DOC + ALL 동시 등록 → NON_DOC 우선', async () => {
    const result = await runEstimate({
      product: EXPEDITED_PRODUCT,
      agencyPolicies: [{ discount_rate: 0.1, cargo_type: 'ALL' }],
      shipperDiscounts: [
        { discount_rate: 0.03, cargo_type: 'ALL' },
        { discount_rate: 0.09, cargo_type: 'NON_DOC' },
      ],
      shipperOrgId: true,
    });
    expect(result.shipper!.shipperDiscountRate).toBe(0.09);
  });

  it('SHIPPER 할인: DOC만 등록 → DOC 상품 적용, NON_DOC 상품 0%', async () => {
    const docResult = await runEstimate({
      product: DOC_PRODUCT_FIXTURE,
      agencyPolicies: [{ discount_rate: 0.1, cargo_type: 'ALL' }],
      shipperDiscounts: [{ discount_rate: 0.07, cargo_type: 'DOC' }],
      shipperOrgId: true,
    });
    expect(docResult.shipper!.shipperDiscountRate).toBe(0.07);

    const nonDocResult = await runEstimate({
      product: SAVER_NONDOC_PRODUCT_FIXTURE,
      agencyPolicies: [{ discount_rate: 0.1, cargo_type: 'ALL' }],
      shipperDiscounts: [{ discount_rate: 0.07, cargo_type: 'DOC' }],
      shipperOrgId: true,
    });
    expect(nonDocResult.shipper!.shipperDiscountRate).toBe(0);
  });
});

describe('TC-UPS-FREIGHT-02: resolveZoneByCountry 연동 (GH#202)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Box 상품(FREIGHT family) + IMPORT 방향 Zone이 정확 매치된다', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase({
        zen_ups_products: createQueryMock({ data: BOX_PRODUCT }),
        zen_ups_zones: createQueryMock({ data: [IMPORT_ZONE] }),
        zen_ups_base_rates: createQueryMock({ data: null }),
      }),
    });

    await expect(
      estimateUpsFreight({ productId: 'p2', destCountryCode: 'JPN', actualWeightKg: 10, direction: 'IMPORT' })
    ).rejects.toThrow(/Freight.*최소운임/);
  });

  it('IMPORT 방향 Zone이 direction=IMPORT로 정확 매치된다', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase({
        zen_ups_products: createQueryMock({ data: BOX_PRODUCT }),
        zen_ups_zones: createQueryMock({ data: [IMPORT_ZONE] }),
        zen_ups_base_rates: createQueryMock({ data: null }),
      }),
    });

    await expect(
      estimateUpsFreight({
        productId: 'p2', destCountryCode: 'JPN', actualWeightKg: 10, direction: 'IMPORT',
      })
    ).rejects.toThrow(/Freight.*최소운임/);
  });

  it('direction 미지정(EXPORT 기본값)으로 IMPORT 전용 Zone 조회 시 Zone 에러', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase({
        zen_ups_products: createQueryMock({ data: BOX_PRODUCT }),
        zen_ups_zones: createQueryMock({ data: [IMPORT_ZONE] }),
      }),
    });

    await expect(
      estimateUpsFreight({ productId: 'p2', destCountryCode: 'JPN', actualWeightKg: 10 })
    ).rejects.toThrow(/Zone/);
  });

  it('EXPRESS EXPORT 정확매치 시 fallbackApplied=false가 breakdown에 전달된다', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase(),
    });

    const result = await estimateUpsFreight({
      productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5,
    });

    expect(result.platform.breakdown.fallbackApplied).toBe(false);
  });

  it('agencyOrgId 전달 시 zen_agency_pricing_policies를 adminClient로 조회한다', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase(),
    });
    (createAdminClient as any).mockResolvedValue(
      buildMockSupabase({
        zen_agency_pricing_policies: createQueryMock({ data: [{ discount_rate: 0.15, cargo_type: 'NON_DOC' }] }),
        zen_agency_other_charges: createQueryMock({ data: [] }),
      })
    );

    const result = await estimateUpsFreight({
      productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5, agencyOrgId: 'agency-1',
    });

    expect(createAdminClient).toHaveBeenCalledTimes(1);
    expect(result.agency?.discountRate).toBe(0.15);
  });

  it('DDP incoterms 전달 시 otherCharges가 0으로 계산됨 (DEF-B-026)', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase({
        zen_ups_other_charges: createQueryMock({ data: [{ id: 'oc1', charge_code: 'DDP', charge_name: 'Delivery Duty Paid', selling_price: 30000, cost_price: 25000, is_active: true }] }),
      }),
    });

    const result = await estimateUpsFreight({
      productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5, incoterms: 'DDP',
    });

    expect(result.platform.otherChargesSellingTotal).toBe(0);
    expect(result.platform.otherChargesCostTotal).toBe(0);
  });

  it('OVERSIZE other_charge는 zen_ups_other_charges에서 조회됨 (회귀 확인)', async () => {
    const oversizeChargeData = { id: 'oc2', charge_code: 'OVERSIZE', charge_name: '대형포장물', selling_price: 20000, cost_price: 15000, is_active: true };
    (validateUserAction as any).mockResolvedValue({
      supabase: buildMockSupabase({
        zen_ups_other_charges: createQueryMock({ data: [oversizeChargeData] }),
      }),
    });

    const result = await estimateUpsFreight({
      productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5,
    });

    expect(result.platform.otherChargesSellingTotal).toBe(0);
    expect(result.platform.otherChargesCostTotal).toBe(0);
  });

  describe('서류(DOC) 상품 max_weight_kg 상한 — 5kg 초과 시 비서류(NONDOC) 요금 자동 전환 (2026-08-09)', () => {
    const DOC_PRODUCT = {
      id: 'p-doc', product_code: 'WW_EXPRESS_DOC', sub_code: null, product_name: 'UPS Worldwide Express (서류)',
      cargo_type: 'DOC', ddu_available: false, ddp_available: true, is_active: true, sort_order: 1, created_at: '',
      max_weight_kg: 5,
    };
    const NONDOC_RATE = { ...BASE_RATE, id: 'r-nondoc', product_id: 'p-nondoc', selling_price: 246900, cost_price: 40366 };

    // zen_ups_products는 이 시나리오에서 두 번 다른 조건으로 조회됨(① id로 DOC 상품 조회
    // ② product_code='WW_EXPRESS_NONDOC'로 전환 대상 조회) — 공용 createQueryMock은 호출 인자를
    // 구분하지 못해 첫 조회에 사용한 값을 그대로 반환하므로, 이 테스트만 인자를 추적하는 전용 mock 사용.
    function makeProductsSwitchMock() {
      let eqCalls: Array<{ field: string; value: any }> = [];
      const chain: any = {
        select: () => chain,
        eq: (field: string, value: any) => { eqCalls.push({ field, value }); return chain; },
        single: () => { eqCalls = []; return Promise.resolve({ data: DOC_PRODUCT, error: null }); },
        maybeSingle: () => {
          const isNonDocLookup = eqCalls.some((c) => c.field === 'product_code' && c.value === 'WW_EXPRESS_NONDOC');
          eqCalls = [];
          return isNonDocLookup
            ? Promise.resolve({ data: { id: 'p-nondoc' }, error: null })
            : Promise.resolve({ data: null, error: null });
        },
      };
      return chain;
    }

    function makeBaseRatesRecordingMock(returnRow: any) {
      const calls: Array<{ field: string; value: any }> = [];
      const chain: any = {
        select: () => chain,
        eq: (field: string, value: any) => { calls.push({ field, value }); return chain; },
        lte: () => chain,
        or: () => chain,
        maybeSingle: () => Promise.resolve({ data: returnRow, error: null }),
      };
      return { chain, calls };
    }

    it('서류 상품 + 5kg 초과 중량 → 에러 대신 비서류(NONDOC) 요금으로 자동 계산됨', async () => {
      const { chain: baseRatesChain, calls: baseRatesCalls } = makeBaseRatesRecordingMock(NONDOC_RATE);
      (validateUserAction as any).mockResolvedValue({
        supabase: buildMockSupabase({
          zen_ups_products: makeProductsSwitchMock(),
          zen_ups_base_rates: baseRatesChain,
        }),
      });

      const result = await estimateUpsFreight({ productId: 'p-doc', destCountryCode: 'USA', actualWeightKg: 7 });

      // 실제 base_rates 조회가 DOC('p-doc')가 아니라 전환된 NONDOC('p-nondoc')의 product_id로 나갔는지 확인
      expect(baseRatesCalls).toContainEqual({ field: 'product_id', value: 'p-nondoc' });
      expect(baseRatesCalls).not.toContainEqual({ field: 'product_id', value: 'p-doc' });
      // 표시상 상품 정보(cargo_type 등)는 원래 DOC 상품 그대로 유지(통관상 서류 성격은 안 바뀜)
      expect(result.platform.breakdown.product.cargo_type).toBe('DOC');
      expect(result.platform.breakdown.product.product_code).toBe('WW_EXPRESS_DOC');
      expect(result.platform.breakdown.nonDocRateApplied).toBe(true);
      expect(result.platform.totalSellingPrice).toBeGreaterThan(0);
    });

    it('전환 대상 비서류 상품이 없으면(비활성 등) 명확한 에러', async () => {
      // 첫 조회(.single(), id로 DOC 조회)와 두 번째 조회(.maybeSingle(), product_code로 NONDOC
      // 조회)를 메서드별로 분기하는 전용 mock — "전환 대상 없음"만 재현하면 되므로 인자 추적은 불필요.
      const notFoundChain: any = {
        select: () => notFoundChain,
        eq: () => notFoundChain,
        single: () => Promise.resolve({ data: DOC_PRODUCT, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      };
      (validateUserAction as any).mockResolvedValue({
        supabase: buildMockSupabase({ zen_ups_products: notFoundChain }),
      });

      await expect(
        estimateUpsFreight({ productId: 'p-doc', destCountryCode: 'USA', actualWeightKg: 7 })
      ).rejects.toThrow(/WW_EXPRESS_NONDOC/);
    });

    it('서류 상품 + 정확히 5kg(상한) → DOC 요금 그대로 정상 계산됨(전환 아님)', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: buildMockSupabase({
          zen_ups_products: createQueryMock({ data: DOC_PRODUCT }),
          zen_ups_base_rates: createQueryMock({ data: { ...BASE_RATE, product_id: 'p-doc' } }),
        }),
      });

      const result = await estimateUpsFreight({
        productId: 'p-doc', destCountryCode: 'USA', actualWeightKg: 5,
      });

      expect(result.platform.totalSellingPrice).toBeGreaterThan(0);
      expect(result.platform.breakdown.nonDocRateApplied).toBe(false);
    });

    it('max_weight_kg이 없는 상품(NON_DOC 등)은 중량과 무관하게 차단되지 않음', async () => {
      (validateUserAction as any).mockResolvedValue({ supabase: buildMockSupabase() });

      const result = await estimateUpsFreight({
        productId: 'p1', destCountryCode: 'USA', actualWeightKg: 20,
      });

      expect(result.platform.totalSellingPrice).toBeGreaterThan(0);
    });
  });
});
