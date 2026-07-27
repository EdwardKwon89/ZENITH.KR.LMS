import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

const createChainableMock = (data: any = null, error: any = null) => {
  const mockObj: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'not', 'limit', 'order', 'single', 'maybeSingle', 'gte', 'lte', 'ilike'];
  methods.forEach((method) => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });
  mockObj.then = (resolve: any) => resolve({ data, error });
  return mockObj;
};

const mockSupabase: any = {
  from: vi.fn(),
};

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

import { validateUserAction } from '@/lib/auth/guards';
import { getOrderRevenueCost, getOrderRevenueCostList, getSubAgencyProfitSummary } from '@/app/actions/finance/order-revenue-cost';

describe('Order별 매출/매입 및 SNTL 수익금 집계 액션 단위 테스트 (Issue #606)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrderRevenueCost', () => {
    it('단건 오더 매출, 매입, 마진 정상 계산', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'admin-1' },
        profile: { id: 'admin-1', role: USER_ROLES.ADMIN },
      });

      const mockOrderData = {
        id: 'order-1',
        order_no: 'ORD-100',
        status: 'DELIVERED',
        dest_country_code: 'US',
        created_at: '2026-07-20T00:00:00Z',
        shipper_id: 'shipper-1',
        shipper: { name: '테스트화주' },
        snapshot: {
          carrier_cost_amount: 100,
          metadata: {
            platform: { totalCostPrice: 100, totalSellingPrice: 150 },
            agency: { agencyCostPrice: 120, agencySellingPrice: 150 },
          },
        },
        costs: [
          { cost_type: 'BASE_FREIGHT', unit_price: 150, quantity: 1, currency: 'USD', is_revenue: true },
        ],
      };

      mockSupabase.from.mockImplementation(() => createChainableMock(mockOrderData));

      const result = await getOrderRevenueCost('order-1');
      expect(result.revenue).toBe(150);
      expect(result.cost).toBe(100);
      expect(result.margin).toBe(50);
      expect(result.marginRate).toBe(33.33);
    });
  });

  describe('getOrderRevenueCostList', () => {
    it('관리자 권한 목록 및 요약 정상 계산', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'admin-1' },
        profile: { id: 'admin-1', role: USER_ROLES.ADMIN },
      });

      const mockOrdersList = [
        {
          id: 'order-1',
          order_no: 'ORD-100',
          status: 'DELIVERED',
          dest_country_code: 'US',
          created_at: '2026-07-20T00:00:00Z',
          shipper_id: 'shipper-1',
          shipper: { name: '화주A' },
          snapshot: { metadata: { platform: { totalCostPrice: 100 } } },
          costs: [{ unit_price: 150, quantity: 1, currency: 'USD', is_revenue: true }],
        },
        {
          id: 'order-2',
          order_no: 'ORD-200',
          status: 'IN_TRANSIT',
          dest_country_code: 'JP',
          created_at: '2026-07-20T01:00:00Z',
          shipper_id: 'shipper-2',
          shipper: { name: '화주B' },
          snapshot: { metadata: { platform: { totalCostPrice: 200 } } },
          costs: [{ unit_price: 300, quantity: 1, currency: 'USD', is_revenue: true }],
        },
      ];

      mockSupabase.from.mockImplementation(() => createChainableMock(mockOrdersList));

      const result = await getOrderRevenueCostList();
      expect(result.items.length).toBe(2);
      expect(result.totalRevenue).toBe(450);
      expect(result.totalCost).toBe(300);
      expect(result.totalMargin).toBe(150);
      expect(result.averageMarginRate).toBe(33.33);
    });
  });

  describe('getSubAgencyProfitSummary', () => {
    it('Sub-Agency별 SNTL 수익금 집계 정상 계산', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'sub-admin-1' },
        profile: { id: 'sub-admin-1', role: USER_ROLES.SUB_ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_organizations') {
          return createChainableMock([{ id: 'agency-1', name: '서브대리점A' }]);
        }
        if (table === 'zen_agency_shippers') {
          return createChainableMock([{ shipper_org_id: 'shipper-1' }]);
        }
        if (table === 'zen_orders') {
          return createChainableMock([
            {
              id: 'order-1',
              snapshot: { metadata: { agency: { agencyCostPrice: 130 }, platform: { totalCostPrice: 100 } } },
              costs: [{ unit_price: 130, quantity: 1, is_revenue: true }],
            },
          ]);
        }
        return createChainableMock();
      });

      const summary = await getSubAgencyProfitSummary();
      expect(summary.rows.length).toBe(1);
      expect(summary.rows[0].agencyName).toBe('서브대리점A');
      expect(summary.rows[0].totalRevenue).toBe(130);
      expect(summary.rows[0].totalCost).toBe(100);
      expect(summary.rows[0].totalMargin).toBe(30);
    });
  });
});
