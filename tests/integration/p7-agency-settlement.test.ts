import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAgencySettlementSummary,
  getAgencyShipperSettlements,
  getAgencyOrderSettlements
} from '@/lib/actions/agency-settlement';
import { createAdminClient } from '@/utils/supabase/server';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  checkPermission: vi.fn().mockReturnValue(true),
}));

// Helper to create query mock
const createQueryMock = (data: any, error: any = null) => {
  const queryChain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn().mockImplementation((onFulfilled: any) => {
      return Promise.resolve({ data, error }).then(onFulfilled);
    })
  };
  queryChain.select.mockReturnValue(queryChain);
  queryChain.eq.mockReturnValue(queryChain);
  queryChain.in.mockReturnValue(queryChain);
  queryChain.gte.mockReturnValue(queryChain);
  queryChain.lte.mockReturnValue(queryChain);
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

describe('Agency Settlement Integration Tests (TC-P7-SETTLE-01~04)', () => {
  // Strict v4 UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y is [8, 9, a, b]
  const mockAgencyOrgId = '11111111-1111-4111-8111-111111111111';
  const mockShipperAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const mockShipperBId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  const mockShippersLink = [
    { shipper_org_id: mockShipperAId },
    { shipper_org_id: mockShipperBId }
  ];

  const mockBaseRates = [
    { id: '11111111-2222-4333-8444-555555555551', selling_price: 35000, cost_price: 28000 },
    { id: '11111111-2222-4333-8444-555555555552', selling_price: 50000, cost_price: 40000 }
  ];

  const mockOverrides = [
    { base_rate_id: '11111111-2222-4333-8444-555555555551', selling_price: 33000, cost_price: 25000 }
  ];

  const mockOrders = [
    {
      id: '99999999-9999-4999-8999-999999999991',
      order_no: 'ZN-2026001',
      shipper_id: mockShipperAId,
      created_at: '2026-06-05T12:00:00Z',
      shipper: { name: 'Shipper A' },
      packages: [{ gross_weight: 2.5, packing_count: 1 }],
      snapshot: { rate_card_id: '11111111-2222-4333-8444-555555555551', applied_unit_price: 35000, carrier_cost_amount: 28000 }
    },
    {
      id: '99999999-9999-4999-8999-999999999992',
      order_no: 'ZN-2026002',
      shipper_id: mockShipperBId,
      created_at: '2026-06-10T12:00:00Z',
      shipper: { name: 'Shipper B' },
      packages: [{ gross_weight: 5.0, packing_count: 2 }],
      snapshot: { rate_card_id: '11111111-2222-4333-8444-555555555552', applied_unit_price: 50000, carrier_cost_amount: 40000 }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    (createAdminClient as any).mockResolvedValue(mockSupabase);

    mockSupabase._tableMocks = {
      zen_agency_shippers: createQueryMock(mockShippersLink),
      zen_ups_base_rates: createQueryMock(mockBaseRates),
      zen_agency_rate_overrides: createQueryMock(mockOverrides),
      zen_orders: createQueryMock(mockOrders)
    };
  });

  it('TC-P7-SETTLE-01: Agency 정산 요약 — 하위 화주 2개 오더 합산 정확', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    const result = await getAgencySettlementSummary(mockAgencyOrgId, '2026-06-01', '2026-06-15');

    expect(result.data).not.toBeNull();
    // Order 1 (overridden): revenue = 33000, cost = 25000
    // Order 2 (no override, uses base rate): revenue = 50000, cost = 40000
    // Total: revenue = 83000, cost = 65000, margin = 18000
    expect(result.data?.orderCount).toBe(2);
    expect(result.data?.totalRevenue).toBe(83000);
    expect(result.data?.totalCost).toBe(65000);
    expect(result.data?.totalMargin).toBe(18000);
    expect(result.data?.marginRate).toBeCloseTo((18000 / 83000) * 100, 2);
  });

  it('TC-P7-SETTLE-02: 화주별 정산 — 화주A vs 화주B 분리 집계 정확', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    const result = await getAgencyShipperSettlements(mockAgencyOrgId, '2026-06-01', '2026-06-15');

    expect(result.data).not.toBeNull();
    expect(result.data?.length).toBe(2);

    const shipperA = result.data?.find((s: any) => s.shipperId === mockShipperAId);
    const shipperB = result.data?.find((s: any) => s.shipperId === mockShipperBId);

    expect(shipperA?.revenue).toBe(33000);
    expect(shipperA?.cost).toBe(25000);
    expect(shipperA?.margin).toBe(8000);

    expect(shipperB?.revenue).toBe(50000);
    expect(shipperB?.cost).toBe(40000);
    expect(shipperB?.margin).toBe(10000);
  });

  it('TC-P7-SETTLE-03: Agency 요율 오버라이드 반영 — override 있는 경우 override 금액 사용', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId }
    });

    mockSupabase._tableMocks.zen_orders = createQueryMock([mockOrders[0]]);

    const filteredResult = await getAgencyOrderSettlements(mockAgencyOrgId, mockShipperAId, '2026-06-01', '2026-06-15');
    expect(filteredResult.data).not.toBeNull();
    expect(filteredResult.data?.length).toBe(1);
    expect(filteredResult.data?.[0].revenue).toBe(33000); // Overridden price
    expect(filteredResult.data?.[0].cost).toBe(25000);    // Overridden price
  });

  it('TC-P7-SETTLE-04: RLS — Agency A 사용자가 Agency B 데이터 조회 불가', async () => {
    // If a user with role 'AGENCY' has org_id = '11111111-1111-4111-8111-111111111111' but requests '22222222-2222-4222-8222-222222222222'
    (validateUserAction as any).mockResolvedValue({
      profile: { id: '33333333-3333-4333-8333-333333333333', role: 'AGENCY', org_id: mockAgencyOrgId } // Logged in agency is 111
    });

    const mockShippersQuery = createQueryMock([]);
    mockSupabase._tableMocks.zen_agency_shippers = mockShippersQuery;

    await getAgencySettlementSummary('22222222-2222-4222-8222-222222222222', '2026-06-01', '2026-06-15');
    
    // Check that zen_agency_shippers was queried with mockAgencyOrgId (11111111-1111-4111-8111-111111111111) instead of 222
    expect(mockShippersQuery.eq).toHaveBeenCalledWith('agency_org_id', mockAgencyOrgId);
    expect(mockShippersQuery.eq).not.toHaveBeenCalledWith('agency_org_id', '22222222-2222-4222-8222-222222222222');
  });
});
