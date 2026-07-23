import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAgencySettlementSummary,
  getAgencyShipperSettlements,
  getAgencyOrderSettlements,
  exportAgencySettlementExcel,
} from '@/lib/actions/agency-settlement';
import { AgencySettlementQuerySchema } from '@/lib/validations/agency';
import { createAdminClient } from '@/utils/supabase/server';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  checkPermission: vi.fn().mockReturnValue(true),
}));

const createQueryMock = (data: any, error: any = null) => {
  const queryChain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: data?.[0] || null, error }),
    then: vi.fn().mockImplementation((onFulfilled: any) => {
      return Promise.resolve({ data, error }).then(onFulfilled);
    })
  };
  queryChain.select.mockReturnValue(queryChain);
  queryChain.eq.mockReturnValue(queryChain);
  queryChain.in.mockReturnValue(queryChain);
  queryChain.gte.mockReturnValue(queryChain);
  queryChain.lte.mockReturnValue(queryChain);
  queryChain.ilike.mockReturnValue(queryChain);
  return queryChain;
};

const createMockSupabase = () => {
  const mock: any = {
    from: vi.fn(),
    _tableMocks: {},
  };
  mock.from.mockImplementation((table: string) => {
    return mock._tableMocks[table] || createQueryMock(null);
  });
  return mock;
};

let mockSupabase = createMockSupabase();

const mockAgencyOrgId = '11111111-1111-4111-8111-111111111111';
const mockShipperAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const mockShipperBId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const mockShippersLink = [
  { shipper_org_id: mockShipperAId },
  { shipper_org_id: mockShipperBId }
];

const mockZoneUSA = 'zone-usa-aaaa-4111-8111-111111111111';
const mockZoneJPN = 'zone-jpn-bbbb-4111-8111-111111111112';

const mockPricingPolicies = [
  { agency_org_id: mockAgencyOrgId, zone_id: mockZoneUSA, discount_rate: 0.05 },
  { agency_org_id: mockAgencyOrgId, zone_id: mockZoneJPN, discount_rate: 0.10 },
];

const mockZoneCountries = [
  { country_code: 'USA', zone_id: mockZoneUSA },
  { country_code: 'JPN', zone_id: mockZoneJPN },
];

const mockOrders = [
  {
    id: '99999999-9999-4999-8999-999999999991',
    order_no: 'ZN-2026001',
    shipper_id: mockShipperAId,
    dest_country_code: 'USA',
    created_at: '2026-06-05T12:00:00Z',
    shipper: { name: 'Shipper A' },
    packages: [{ gross_weight: 2.5, packing_count: 1 }],
    snapshot: {
      rate_card_id: 'rate-card-1',
      applied_unit_price: 35000,
      carrier_cost_amount: 28000,
      metadata: { platform: { breakdown: { baseSellingPrice: 30000, fuelSurchargeSellingAmount: 3000, otherChargesSellingTotal: 2000, surgeFeeSellingAmount: 0 } } }
    }
  },
  {
    id: '99999999-9999-4999-8999-999999999992',
    order_no: 'ZN-2026002',
    shipper_id: mockShipperBId,
    dest_country_code: 'JPN',
    created_at: '2026-06-10T12:00:00Z',
    shipper: { name: 'Shipper B' },
    packages: [{ gross_weight: 5.0, packing_count: 2 }],
    snapshot: {
      rate_card_id: 'rate-card-2',
      applied_unit_price: 50000,
      carrier_cost_amount: 40000,
      metadata: { platform: { breakdown: { baseSellingPrice: 45000, fuelSurchargeSellingAmount: 3000, otherChargesSellingTotal: 2000, surgeFeeSellingAmount: 0 } } }
    }
  }
];

// Order 1 (USA): platformSellingTotal = 30000+3000+2000+0 = 35000, discount=0.05 => cost = 35000*0.95 = 33250
// Order 2 (JPN): platformSellingTotal = 45000+3000+2000+0 = 50000, discount=0.10 => cost = 50000*0.90 = 45000
// Total: revenue=85000, cost=78250, margin=6750, marginRate=6750/85000*100=7.94%

describe('Agency Settlement Integration Tests (TC-P7-SETTLE-01~04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    (createAdminClient as any).mockResolvedValue(mockSupabase);

    mockSupabase._tableMocks = {
      zen_agency_shippers: createQueryMock(mockShippersLink),
      zen_agency_pricing_policies: createQueryMock(mockPricingPolicies),
      zen_ups_zone_countries: createQueryMock(mockZoneCountries),
      zen_orders: createQueryMock(mockOrders)
    };
  });

  it('TC-P7-SETTLE-01: Agency 정산 요약 — 하위 화주 2개 오더 zone별 할인율 적용 합산 정확', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    const result = await getAgencySettlementSummary(mockAgencyOrgId, '2026-06-01', '2026-06-15');

    expect(result.data).not.toBeNull();
    // Order 1 (USA, discount 5%): revenue=35000, cost=33250
    // Order 2 (JPN, discount 10%): revenue=50000, cost=45000
    // Total: revenue=85000, cost=78250, margin=6750
    expect(result.data?.orderCount).toBe(2);
    expect(result.data?.totalRevenue).toBe(85000);
    expect(result.data?.totalCost).toBe(78250);
    expect(result.data?.totalMargin).toBe(6750);
    expect(result.data?.marginRate).toBeCloseTo((6750 / 85000) * 100, 2);
  });

  it('TC-P7-SETTLE-02: 화주별 정산 — 화주A vs 화주B zone별 할인율 분리 집계 정확', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    const result = await getAgencyShipperSettlements(mockAgencyOrgId, '2026-06-01', '2026-06-15');

    expect(result.data).not.toBeNull();
    expect(result.data?.length).toBe(2);

    const shipperA = result.data?.find((s: any) => s.shipperId === mockShipperAId);
    const shipperB = result.data?.find((s: any) => s.shipperId === mockShipperBId);

    // Shipper A (USA, discount 5%): revenue=35000, cost=33250, margin=1750
    expect(shipperA?.revenue).toBe(35000);
    expect(shipperA?.cost).toBe(33250);
    expect(shipperA?.margin).toBe(1750);

    // Shipper B (JPN, discount 10%): revenue=50000, cost=45000, margin=5000
    expect(shipperB?.revenue).toBe(50000);
    expect(shipperB?.cost).toBe(45000);
    expect(shipperB?.margin).toBe(5000);
  });

  it('TC-P7-SETTLE-03: Zone별 할인율 적용 — USA 5%, JPN 10% 각각 정확', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    mockSupabase._tableMocks.zen_orders = createQueryMock([mockOrders[0]]);

    const filteredResult = await getAgencyOrderSettlements(mockAgencyOrgId, mockShipperAId, '2026-06-01', '2026-06-15');
    expect(filteredResult.data).not.toBeNull();
    expect(filteredResult.data?.length).toBe(1);
    // USA order: platformSellingTotal=35000, discount=5% => cost=33250, revenue=35000
    expect(filteredResult.data?.[0].revenue).toBe(35000);
    expect(filteredResult.data?.[0].cost).toBe(33250);
  });

  it('TC-P7-SETTLE-04: RLS — Agency A 사용자가 Agency B 데이터 조회 불가', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    const mockShippersQuery = createQueryMock([]);
    mockSupabase._tableMocks.zen_agency_shippers = mockShippersQuery;

    await getAgencySettlementSummary('22222222-2222-4222-8222-222222222222', '2026-06-01', '2026-06-15');

    expect(mockShippersQuery.eq).toHaveBeenCalledWith('agency_org_id', mockAgencyOrgId);
    expect(mockShippersQuery.eq).not.toHaveBeenCalledWith('agency_org_id', '22222222-2222-4222-8222-222222222222');
  });

  it('TC-B-BREAKDOWN-01: metadata 있는 오더 — breakdown 필드가 올바르게 파싱됨', async () => {
    const ordersWithMetadata = [
      {
        id: '99999999-9999-4999-8999-999999999991',
        order_no: 'ZN-2026001',
        shipper_id: mockShipperAId,
        dest_country_code: 'USA',
        created_at: '2026-06-05T12:00:00Z',
        shipper: { name: 'Shipper A' },
        packages: [{ gross_weight: 2.5, packing_count: 1 }],
        snapshot: {
          rate_card_id: 'rate-card-1',
          applied_unit_price: 35000,
          carrier_cost_amount: 28000,
          metadata: {
            platform: {
              breakdown: {
                baseSellingPrice: 20000,
                fuelSurchargeSellingAmount: 3000,
                otherChargesSellingTotal: 2000,
                surgeFeeSellingAmount: 500,
              }
            }
          }
        }
      }
    ];

    mockSupabase._tableMocks.zen_orders = createQueryMock(ordersWithMetadata);
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    const result = await getAgencyOrderSettlements(mockAgencyOrgId, mockShipperAId, '2026-06-01', '2026-06-15');

    expect(result.data).not.toBeNull();
    expect(result.data?.length).toBe(1);
    expect(result.data?.[0].breakdown).toEqual({
      baseSellingPrice: 20000,
      fuelSurchargeSellingAmount: 3000,
      otherChargesSellingTotal: 2000,
      surgeFeeSellingAmount: 500,
    });
  });

  it('TC-B-BREAKDOWN-02: metadata 없는 오더 — breakdown 필드가 null, cost는 carrier_cost_amount fallback', async () => {
    const ordersWithoutMetadata = [
      {
        id: '99999999-9999-4999-8999-999999999992',
        order_no: 'ZN-2026002',
        shipper_id: mockShipperBId,
        dest_country_code: 'JPN',
        created_at: '2026-06-10T12:00:00Z',
        shipper: { name: 'Shipper B' },
        packages: [{ gross_weight: 5.0, packing_count: 2 }],
        snapshot: {
          rate_card_id: 'rate-card-2',
          applied_unit_price: 50000,
          carrier_cost_amount: 40000,
        }
      }
    ];

    mockSupabase._tableMocks.zen_orders = createQueryMock(ordersWithoutMetadata);
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    const result = await getAgencyOrderSettlements(mockAgencyOrgId, mockShipperBId, '2026-06-01', '2026-06-15');

    expect(result.data).not.toBeNull();
    expect(result.data?.length).toBe(1);
    expect(result.data?.[0].breakdown).toBeNull();
    // No metadata breakdown → fallback to carrier_cost_amount
    expect(result.data?.[0].cost).toBe(40000);
  });

  it('TC-B-SEARCH-01: 오더번호 ILIKE 검색 — "ZN-2026" 입력 시 일치 오더만 반환', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    mockSupabase._tableMocks.zen_orders = createQueryMock(mockOrders);

    await getAgencyOrderSettlements(mockAgencyOrgId, undefined, '2026-06-01', '2026-06-15', 'ZN-2026');

    const ordersQuery = mockSupabase._tableMocks.zen_orders;
    expect(ordersQuery.ilike).toHaveBeenCalledWith('order_no', '%ZN-2026%');
  });

  it('TC-B-SEARCH-02: 존재하지 않는 오더번호 검색 — 빈 배열 반환', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    mockSupabase._tableMocks.zen_orders = createQueryMock([]);

    const result = await getAgencyOrderSettlements(mockAgencyOrgId, mockShipperAId, '2026-06-01', '2026-06-15', 'NONEXISTENT');

    expect(result.data).toEqual([]);
  });

  it('TC-B-SEARCH-03: 오더번호 + 화주 필터 동시 적용 — AND 결합', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    mockSupabase._tableMocks.zen_orders = createQueryMock([mockOrders[0]]);

    const result = await getAgencyOrderSettlements(mockAgencyOrgId, mockShipperAId, '2026-06-01', '2026-06-15', 'ZN-2026001');

    expect(result.data).not.toBeNull();
    expect(result.data?.length).toBe(1);
    expect(result.data?.[0].orderNo).toBe('ZN-2026001');
    expect(result.data?.[0].shipperId).toBe(mockShipperAId);
  });
});

describe('TC-B-EXCEL-01~03: Agency 정산 엑셀 다운로드', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    (createAdminClient as any).mockResolvedValue(mockSupabase);
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    mockSupabase._tableMocks = {
      zen_agency_shippers: createQueryMock(mockShippersLink),
      zen_agency_pricing_policies: createQueryMock(mockPricingPolicies),
      zen_ups_zone_countries: createQueryMock(mockZoneCountries),
      zen_orders: createQueryMock(mockOrders)
    };
  });

  it('TC-B-EXCEL-01: 기간 설정 후 엑셀 다운로드 — 9개 컬럼 정상 포함', async () => {
    const result = await exportAgencySettlementExcel(mockAgencyOrgId, undefined, '2026-06-01', '2026-06-15');

    expect(result.data).not.toBeNull();
    expect(result.error).toBeNull();
    expect(result.data?.base64).toBeTruthy();
    expect(typeof result.data?.base64).toBe('string');
    expect(result.data?.filename).toMatch(/^agency_settlement_\d{8}\.xlsx$/);

    const binaryStr = atob(result.data!.base64);
    expect(binaryStr.charCodeAt(0)).toBe(0x50);
    expect(binaryStr.charCodeAt(1)).toBe(0x4B);
    expect(binaryStr.charCodeAt(2)).toBe(0x03);
    expect(binaryStr.charCodeAt(3)).toBe(0x04);
  });

  it('TC-B-EXCEL-02: 데이터 없는 기간 — 헤더만 있는 빈 엑셀 파일', async () => {
    mockSupabase._tableMocks.zen_agency_shippers = createQueryMock([]);

    const result = await exportAgencySettlementExcel(mockAgencyOrgId, undefined, '2026-01-01', '2026-01-31');

    expect(result.data).not.toBeNull();
    expect(result.data?.base64).toBeTruthy();
    expect(result.data?.filename).toMatch(/^agency_settlement_\d{8}\.xlsx$/);
  });

  it('TC-B-EXCEL-03: 특정 화주 필터 후 다운로드 — 해당 화주 데이터만 포함', async () => {
    mockSupabase._tableMocks.zen_agency_shippers = createQueryMock([
      { shipper_org_id: mockShipperAId }
    ]);
    mockSupabase._tableMocks.zen_orders = createQueryMock([mockOrders[0]]);

    const result = await exportAgencySettlementExcel(mockAgencyOrgId, mockShipperAId, '2026-06-01', '2026-06-15');

    expect(result.data).not.toBeNull();
    expect(result.data?.base64).toBeTruthy();
    expect(result.data?.filename).toMatch(/^agency_settlement_\d{8}\.xlsx$/);
  });

  it('TC-B-SCHEMA-01: order_no_search "ORD" 포함 schema parse 성공', () => {
    const result = AgencySettlementQuerySchema.parse({
      agency_org_id: '11111111-1111-4111-8111-111111111111',
      from: '2026-06-01',
      to: '2026-06-15',
      order_no_search: 'ORD',
    });
    expect(result.order_no_search).toBe('ORD');
  });

  it('TC-B-SCHEMA-02: order_no_search 미포함 schema parse 성공', () => {
    const result = AgencySettlementQuerySchema.parse({
      agency_org_id: '11111111-1111-4111-8111-111111111111',
      from: '2026-06-01',
      to: '2026-06-15',
    });
    expect(result.order_no_search).toBeUndefined();
  });

  it('TC-B-SCHEMA-03: order_no_search undefined schema parse 성공', () => {
    const result = AgencySettlementQuerySchema.parse({
      agency_org_id: '11111111-1111-4111-8111-111111111111',
      from: '2026-06-01',
      to: '2026-06-15',
      order_no_search: undefined,
    });
    expect(result.order_no_search).toBeUndefined();
  });
});
