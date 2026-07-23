import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

const createChainableMock = (data: any = null, error: any = null) => {
  const mockObj: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'not', 'limit', 'order', 'single', 'maybeSingle', 'gte', 'lte', 'neq', 'filter'];
  methods.forEach((method) => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });
  mockObj.then = (resolve: any) => resolve({ data, error });
  return mockObj;
};

const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/params/service', () => ({
  getNumericParam: vi.fn().mockResolvedValue(1350),
}));

import { validateUserAction } from '@/lib/auth/guards';
import {
  getShipperDailyBillingSummary,
  getShipperDailyOrdersDetails,
  finalizeDailyShipperInvoices,
} from '@/app/actions/finance/daily-billing';

describe('화주별 일별/주별/월별 청구 집계 및 최종 운임 확정 단위 테스트 (Issue #736/#750 / W2 / TASK-204/207)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getShipperDailyBillingSummary', () => {
    it('화주별 일별 오더 집계 및 OTHER_CHARGE 포함 합산 금액 정확히 계산', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_orders') {
          return createChainableMock([
            {
              id: 'ord-1',
              order_no: 'ORD-001',
              status: 'DELIVERED',
              transport_mode: 'UPS',
              created_at: '2026-07-23T10:00:00Z',
              shipper_id: 'shipper-1',
              shipper: { id: 'shipper-1', name: 'ABC 상사' },
            },
            {
              id: 'ord-2',
              order_no: 'ORD-002',
              status: 'DELIVERED',
              transport_mode: 'UPS',
              created_at: '2026-07-23T11:00:00Z',
              shipper_id: 'shipper-1',
              shipper: { id: 'shipper-1', name: 'ABC 상사' },
            },
          ]);
        }
        if (table === 'zen_order_costs') {
          return createChainableMock([
            { order_id: 'ord-1', cost_type: 'BASE_FREIGHT', unit_price: 100, quantity: 1, total_amount: 100 },
            { order_id: 'ord-1', cost_type: 'FUEL_SURCHARGE', unit_price: 20, quantity: 1, total_amount: 20 },
            { order_id: 'ord-1', cost_type: 'OTHER_CHARGE', unit_price: 15, quantity: 1, total_amount: 15 },
            { order_id: 'ord-2', cost_type: 'BASE_FREIGHT', unit_price: 200, quantity: 1, total_amount: 200 },
            { order_id: 'ord-2', cost_type: 'SURGE_FEE', unit_price: 30, quantity: 1, total_amount: 30 },
          ]);
        }
        if (table === 'zen_invoices') {
          return createChainableMock([
            { id: 'inv-1', is_finalized: true, metadata: { source_order_id: 'ord-1' } },
          ]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'daily' });
      expect(res.success).toBe(true);
      expect(res.groups).toBeDefined();
      expect(res.groups.length).toBe(1);

      const group = res.groups[0];
      expect(group.shipperName).toBe('ABC 상사');
      expect(group.orderCount).toBe(2);
      expect(group.totalBaseFreight).toBe(300);
      expect(group.totalFuelSurcharge).toBe(20);
      expect(group.totalSurgeFee).toBe(30);
      expect(group.totalOtherCharge).toBe(15);
      expect(group.totalBillingAmountUsd).toBe(365);
      expect(group.finalizedCount).toBe(1);
      expect(group.unfinalizedCount).toBe(1);
    });

    it('오더가 없을 때 빈 집계 그룹 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation(() => createChainableMock([]));

      const res = await getShipperDailyBillingSummary();
      expect(res.success).toBe(true);
      expect(res.groups).toEqual([]);
    });

    it('주별 집계 그룹(weekly) 생성 및 주차별 합산 정상', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_orders') {
          return createChainableMock([
            {
              id: 'ord-1',
              order_no: 'ORD-001',
              status: 'DELIVERED',
              transport_mode: 'UPS',
              created_at: '2026-07-21T10:00:00Z',
              shipper_id: 'shipper-1',
              shipper: { id: 'shipper-1', name: 'ABC 상사' },
            },
            {
              id: 'ord-2',
              order_no: 'ORD-002',
              status: 'DELIVERED',
              transport_mode: 'UPS',
              created_at: '2026-07-23T11:00:00Z',
              shipper_id: 'shipper-1',
              shipper: { id: 'shipper-1', name: 'ABC 상사' },
            },
          ]);
        }
        if (table === 'zen_order_costs') {
          return createChainableMock([
            { order_id: 'ord-1', cost_type: 'BASE_FREIGHT', unit_price: 100, quantity: 1, total_amount: 100 },
            { order_id: 'ord-2', cost_type: 'BASE_FREIGHT', unit_price: 200, quantity: 1, total_amount: 200 },
          ]);
        }
        if (table === 'zen_invoices') {
          return createChainableMock([]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'weekly' });
      expect(res.success).toBe(true);
      expect(res.groups.length).toBe(1);
      expect(res.groups[0].orderCount).toBe(2);
      expect(res.groups[0].totalBillingAmountUsd).toBe(300);
      expect(res.groups[0].date).toContain('W');
    });

    it('월별 집계 그룹(monthly) YYYY-MM 포맷으로 묶여서 합산 정상', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_orders') {
          return createChainableMock([
            {
              id: 'ord-1',
              order_no: 'ORD-001',
              status: 'DELIVERED',
              transport_mode: 'UPS',
              created_at: '2026-07-05T10:00:00Z',
              shipper_id: 'shipper-1',
              shipper: { id: 'shipper-1', name: 'ABC 상사' },
            },
            {
              id: 'ord-2',
              order_no: 'ORD-002',
              status: 'DELIVERED',
              transport_mode: 'UPS',
              created_at: '2026-07-23T11:00:00Z',
              shipper_id: 'shipper-1',
              shipper: { id: 'shipper-1', name: 'ABC 상사' },
            },
          ]);
        }
        if (table === 'zen_order_costs') {
          return createChainableMock([
            { order_id: 'ord-1', cost_type: 'BASE_FREIGHT', unit_price: 150, quantity: 1, total_amount: 150 },
            { order_id: 'ord-2', cost_type: 'BASE_FREIGHT', unit_price: 250, quantity: 1, total_amount: 250 },
          ]);
        }
        if (table === 'zen_invoices') {
          return createChainableMock([]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'monthly' });
      expect(res.success).toBe(true);
      expect(res.groups.length).toBe(1);
      expect(res.groups[0].date).toBe('2026-07');
      expect(res.groups[0].orderCount).toBe(2);
      expect(res.groups[0].totalBillingAmountUsd).toBe(400);
    });
  });

  describe('getShipperDailyOrdersDetails', () => {
    it('특정 화주 및 날짜의 세부 오더 목록(OTHER_CHARGE 포함) 정상 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_orders') {
          return createChainableMock([
            {
              id: 'ord-1',
              order_no: 'ORD-001',
              status: 'DELIVERED',
              transport_mode: 'UPS',
              recipient_country_code: 'US',
              created_at: '2026-07-23T10:00:00Z',
              shipper_id: 'shipper-1',
              shipper: { name: 'ABC 상사' },
            },
          ]);
        }
        if (table === 'zen_order_costs') {
          return createChainableMock([
            { order_id: 'ord-1', cost_type: 'BASE_FREIGHT', unit_price: 150, quantity: 1, total_amount: 150 },
            { order_id: 'ord-1', cost_type: 'OTHER_CHARGE', unit_price: 25, quantity: 1, total_amount: 25 },
          ]);
        }
        if (table === 'zen_invoices') {
          return createChainableMock([
            { id: 'inv-1', invoice_no: 'INV-001', status: 'UNPAID', is_finalized: false, metadata: { source_order_id: 'ord-1' } },
          ]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyOrdersDetails('shipper-1', '2026-07-23');
      expect(res.success).toBe(true);
      expect(res.orders?.length).toBe(1);
      expect(res.orders?.[0].orderNo).toBe('ORD-001');
      expect(res.orders?.[0].otherCharge).toBe(25);
      expect(res.orders?.[0].totalAmountUsd).toBe(175);
      expect(res.orders?.[0].invoiceNo).toBe('INV-001');
    });

    it('특정 화주 및 월별 기간 세부 오더 목록 정상 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_orders') {
          return createChainableMock([
            {
              id: 'ord-1',
              order_no: 'ORD-001',
              status: 'DELIVERED',
              transport_mode: 'UPS',
              recipient_country_code: 'US',
              created_at: '2026-07-15T10:00:00Z',
              shipper_id: 'shipper-1',
              shipper: { name: 'ABC 상사' },
            },
          ]);
        }
        if (table === 'zen_order_costs') {
          return createChainableMock([
            { order_id: 'ord-1', cost_type: 'BASE_FREIGHT', unit_price: 150, quantity: 1, total_amount: 150 },
          ]);
        }
        if (table === 'zen_invoices') {
          return createChainableMock([]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyOrdersDetails('shipper-1', '2026-07', 'monthly');
      expect(res.success).toBe(true);
      expect(res.orders?.length).toBe(1);
      expect(res.orders?.[0].orderNo).toBe('ORD-001');
    });
  });

  describe('finalizeDailyShipperInvoices', () => {
    it('권한 없는 사용자가 일괄 마감 시 에러 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'corp-usr-1', role: USER_ROLES.CORPORATE },
      });

      const res = await finalizeDailyShipperInvoices(['inv-1']);
      expect(res.success).toBe(false);
      expect(res.errors?.[0]).toContain('권한이 없습니다');
    });
  });
});
