import { describe, it, expect, vi, beforeEach } from 'vitest';

// 고정 fixture — 출고확정일·estimate·환율을 테스트가 직접 정한다.
vi.mock('@/lib/orders/order-released-date', () => ({
  getOrderReleasedDate: vi.fn(async () => '2026-11-20'),
}));
vi.mock('@/lib/ups/estimate-core', () => ({
  estimateUpsFreightCore: vi.fn(),
}));

import { estimateUpsFreightCore } from '@/lib/ups/estimate-core';
import { computeSettlementCost, buildSettlementPreview } from '@/lib/ups/settlement/build';
import {
  SettlementCurrencyError,
  SettlementEstimateError,
  type SettlementCostSummary,
  type UpsSettlementInput,
} from '@/lib/ups/settlement/types';

const estimateMock = vi.mocked(estimateUpsFreightCore);

/** `zen_exchange_rates` 조회 체인만 흉내 내는 최소 client. */
function rateClient(rates: Record<string, number>) {
  return {
    from() {
      let base = '';
      const chain: any = {
        select: () => chain,
        eq: (column: string, value: string) => {
          if (column === 'base_currency') base = value;
          return chain;
        },
        lte: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({
          data: base && rates[base] != null ? { rate: rates[base] } : null,
          error: null,
        }),
      };
      return chain;
    },
  };
}

function estimateFixture(overrides: {
  agencyCostPrice?: number;
  withAgency?: boolean;
  withShipper?: boolean;
} = {}) {
  const platform = {
    baseSellingPrice: 100,
    fuelSurchargeSellingAmount: 10,
    surgeFeeSellingAmount: 5,
    otherChargesSellingTotal: 5,
    billingWeightKg: 5,
  };
  return {
    platform,
    agency: overrides.withAgency === false ? null : {
      baseSellingPrice: 80,
      fuelSurchargeSellingAmount: 8,
      surgeFeeSellingAmount: 4,
      otherChargesSellingTotal: 4,
      agencyCostPrice: overrides.agencyCostPrice ?? 90,
    },
    shipper: overrides.withShipper === false ? null : {
      baseSellingPrice: 100,
      fuelSurchargeSellingAmount: 10,
      surgeFeeSellingAmount: 5,
      otherChargesSellingTotal: 5,
      finalFreight: 130,
    },
  } as any;
}

const ORDER = {
  id: 'order-1',
  ups_product_id: 'product-1',
  ups_product_code: 'WW_SAVER_NONDOC',
  recipient_country_code: 'US',
  agency_org_id: 'agency-1',
  shipper_id: 'shipper-1',
  incoterms: 'DDP',
  snapshot: { metadata: { platform: { chargeableWeightKg: 5, billingWeightKg: 5 } } },
};

const COST: SettlementCostSummary = {
  releasedDate: '2026-11-20',
  baseCurrency: 'KRW',
  exchangeRates: { KRW: 1, TST: 1.2345 },
  totalCostKrw: 1232,
  baseCostKrw: 1070,
  fuelCostKrw: 100,
  surgeCostKrw: 50,
  otherChargesCostKrw: 12,
  baseRawKrw: 1000,
  surchargeRate: 0.07,
  surchargeAmountKrw: 70,
  appliedExchangeRates: { KRW: 1, TST: 1.2345 },
};

const INPUT: UpsSettlementInput = {
  orderId: 'order-1',
  baseFreight: { amount: 1000, currency: 'KRW' },
  fuelSurcharge: { amount: 100, currency: 'KRW' },
  surgeFee: { amount: 50, currency: 'KRW' },
  otherCharges: [
    { name: '주소정정', amount: 10, currency: 'KRW' },
    { name: '반송', amount: 0.005, currency: 'KRW' },
  ],
};

beforeEach(() => {
  estimateMock.mockReset();
  estimateMock.mockResolvedValue(estimateFixture());
});

describe('buildSettlementPreview — run 금액·부가항목 값', () => {
  it('두 tier의 구성요소·음수 조정·2자리 반올림·line_total을 값으로 계산한다', async () => {
    const preview = await buildSettlementPreview(rateClient({}) as any, ORDER as any, INPUT, COST);

    const agency = preview.amounts.find((a) => a.tier === 'ADMIN_TO_AGENCY')!;
    expect(agency).toMatchObject({
      base_freight: 80,
      fuel_surcharge: 8,
      surge_fee: 4,
      other_charges: 4,
      freight_adjustment: -6, // 90 − 96
      settlement_charges_total: 10.01, // 10 + 0.01
      line_total: 100.01, // 96 − 6 + 10.01
    });

    const shipper = preview.amounts.find((a) => a.tier === 'SHIPPER')!;
    expect(shipper).toMatchObject({
      base_freight: 100,
      fuel_surcharge: 10,
      surge_fee: 5,
      other_charges: 5,
      freight_adjustment: 10, // 130 − 120
      settlement_charges_total: 10.01,
      line_total: 140.01, // 120 + 10 + 10.01
    });

    expect(preview.chargeWeightKg).toBe(5);
    expect(preview.charges).toHaveLength(4);
    expect(preview.charges.map((c) => [c.tier, c.line_no, c.name, c.amount])).toEqual([
      ['ADMIN_TO_AGENCY', 1, '주소정정', 10],
      ['ADMIN_TO_AGENCY', 2, '반송', 0.01],
      ['SHIPPER', 1, '주소정정', 10],
      ['SHIPPER', 2, '반송', 0.01],
    ]);
  });

  it('agency 원가가 0 이하이면 플랫폼 합계로 폴백한다(기존 recomputeRevenue 규칙)', async () => {
    estimateMock.mockResolvedValue(estimateFixture({ agencyCostPrice: 0 }));
    const preview = await buildSettlementPreview(rateClient({}) as any, ORDER as any, INPUT, COST);
    const agency = preview.amounts.find((a) => a.tier === 'ADMIN_TO_AGENCY')!;
    // target = platform 120 → adjustment = 120 − 96
    expect(agency.freight_adjustment).toBe(24);
    expect(agency.line_total).toBe(130.01);
  });

  it('agency/shipper가 없으면 플랫폼 구성요소·target으로 조정 0을 만든다', async () => {
    estimateMock.mockResolvedValue(estimateFixture({ withAgency: false, withShipper: false }));
    const preview = await buildSettlementPreview(rateClient({}) as any, ORDER as any, INPUT, COST);
    for (const tier of preview.amounts) {
      expect(tier.base_freight).toBe(100);
      expect(tier.freight_adjustment).toBe(0);
      expect(tier.line_total).toBe(130.01);
    }
  });

  it('3자리 소수 환율은 부가항목을 항목별 2자리로 반올림한다', async () => {
    const preview = await buildSettlementPreview(
      rateClient({}) as any,
      ORDER as any,
      { ...INPUT, otherCharges: [{ name: '해외수수료', amount: 10, currency: 'TST' }] },
      COST,
    );
    expect(preview.amounts[0].settlement_charges_total).toBe(12.35); // 10 × 1.2345
    expect(preview.charges[0].amount).toBe(12.35);
  });

  it('상품을 찾을 수 없으면 SettlementEstimateError(PRODUCT_NOT_FOUND)', async () => {
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) };
    await expect(
      buildSettlementPreview(
        supabase as any,
        { ...ORDER, ups_product_id: null } as any,
        INPUT,
        COST,
      ),
    ).rejects.toMatchObject({ name: 'SettlementEstimateError', reason: 'PRODUCT_NOT_FOUND' });
  });

  it('도착 국가가 없으면 SettlementEstimateError(DEST_COUNTRY_MISSING)', async () => {
    await expect(
      buildSettlementPreview(rateClient({}) as any, { ...ORDER, recipient_country_code: null } as any, INPUT, COST),
    ).rejects.toBeInstanceOf(SettlementEstimateError);
  });
});

describe('computeSettlementCost — 출고확정일 환율·원가 값', () => {
  it('기본운임 +7%·항목별 환산을 값으로 계산하고 적용 환율을 남긴다', async () => {
    const { summary, amounts } = await computeSettlementCost(
      rateClient({ TST: 1.2345 }) as any,
      { id: 'order-1', created_at: '2026-11-01T00:00:00Z' },
      {
        orderId: 'order-1',
        baseFreight: { amount: 1000, currency: 'KRW' },
        fuelSurcharge: { amount: 100, currency: 'KRW' },
        surgeFee: { amount: 50, currency: 'KRW' },
        otherCharges: [{ name: '해외수수료', amount: 10, currency: 'TST' }],
      },
    );

    expect(summary.releasedDate).toBe('2026-11-20');
    expect(summary.baseCostKrw).toBe(1070); // 1000 × 1.07
    expect(summary.surchargeAmountKrw).toBe(70);
    expect(summary.fuelCostKrw).toBe(100);
    expect(summary.surgeCostKrw).toBe(50);
    expect(summary.otherChargesCostKrw).toBe(12); // 기존 computeUpsActualCostKrw는 정수 반올림
    expect(summary.totalCostKrw).toBe(1232);
    expect(summary.appliedExchangeRates.TST).toBe(1.2345);
    expect(amounts.otherCharges[0]).toMatchObject({ name: '해외수수료', amount: 10, currency: 'TST' });
  });

  it('유효 환율이 없으면 fallback 없이 SettlementCurrencyError', async () => {
    await expect(
      computeSettlementCost(
        rateClient({}) as any,
        { id: 'order-1' },
        { orderId: 'order-1', otherCharges: [{ name: 'X', amount: 1, currency: 'ZZZ' }] },
      ),
    ).rejects.toBeInstanceOf(SettlementCurrencyError);
  });
});
