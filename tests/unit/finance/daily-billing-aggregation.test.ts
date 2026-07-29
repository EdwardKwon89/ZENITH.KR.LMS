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
    it('zen_invoices 기반 화주별 일별 집계 및 총 청구액 정확히 계산', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN, org_id: 'platform-org' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock([
            {
              id: 'inv-1',
              invoice_no: 'INV-001',
              total_amount: 15000,
              currency: 'USD',
              status: 'UNPAID',
              is_finalized: true,
              billed_org_id: 'shipper-1',
              invoice_tier: 'ADMIN_TO_SHIPPER',
              created_at: '2026-07-23T10:00:00Z',
              org: { id: 'shipper-1', name: 'ABC 상사' },
            },
            {
              id: 'inv-2',
              invoice_no: 'INV-002',
              total_amount: 20000,
              currency: 'USD',
              status: 'UNPAID',
              is_finalized: false,
              billed_org_id: 'shipper-1',
              invoice_tier: 'ADMIN_TO_SHIPPER',
              created_at: '2026-07-23T11:00:00Z',
              org: { id: 'shipper-1', name: 'ABC 상사' },
            },
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
      expect(group.totalBillingAmountKrw).toBe(35000 * 1350);
      expect(group.finalizedCount).toBe(1);
      expect(group.unfinalizedCount).toBe(1);
      expect(group.invoiceIds).toContain('inv-1');
      expect(group.invoiceIds).toContain('inv-2');
    });

    it('인보이스가 없을 때 빈 집계 그룹 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN, org_id: 'platform-org' },
      });

      mockSupabase.from.mockImplementation(() => createChainableMock([]));

      const res = await getShipperDailyBillingSummary();
      expect(res.success).toBe(true);
      expect(res.groups).toEqual([]);
    });

    it('주별 집계 그룹(weekly) 생성 및 주차별 합산 정상', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN, org_id: 'platform-org' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock([
            {
              id: 'inv-1',
              invoice_no: 'INV-001',
              total_amount: 10000,
              currency: 'USD',
              status: 'UNPAID',
              is_finalized: false,
              billed_org_id: 'shipper-1',
              invoice_tier: 'ADMIN_TO_SHIPPER',
              created_at: '2026-07-21T10:00:00Z',
              org: { id: 'shipper-1', name: 'ABC 상사' },
            },
            {
              id: 'inv-2',
              invoice_no: 'INV-002',
              total_amount: 20000,
              currency: 'USD',
              status: 'UNPAID',
              is_finalized: false,
              billed_org_id: 'shipper-1',
              invoice_tier: 'ADMIN_TO_SHIPPER',
              created_at: '2026-07-23T11:00:00Z',
              org: { id: 'shipper-1', name: 'ABC 상사' },
            },
          ]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'weekly' });
      expect(res.success).toBe(true);
      expect(res.groups.length).toBe(1);
      expect(res.groups[0].orderCount).toBe(2);
      expect(res.groups[0].totalBillingAmountKrw).toBe(30000 * 1350);
      expect(res.groups[0].date).toContain('W');
    });

    it('월별 집계 그룹(monthly) YYYY-MM 포맷으로 묶여서 합산 정상', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN, org_id: 'platform-org' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock([
            {
              id: 'inv-1',
              invoice_no: 'INV-001',
              total_amount: 15000,
              currency: 'USD',
              status: 'UNPAID',
              is_finalized: false,
              billed_org_id: 'shipper-1',
              invoice_tier: 'ADMIN_TO_SHIPPER',
              created_at: '2026-07-05T10:00:00Z',
              org: { id: 'shipper-1', name: 'ABC 상사' },
            },
            {
              id: 'inv-2',
              invoice_no: 'INV-002',
              total_amount: 25000,
              currency: 'USD',
              status: 'UNPAID',
              is_finalized: false,
              billed_org_id: 'shipper-1',
              invoice_tier: 'ADMIN_TO_SHIPPER',
              created_at: '2026-07-23T11:00:00Z',
              org: { id: 'shipper-1', name: 'ABC 상사' },
            },
          ]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'monthly' });
      expect(res.success).toBe(true);
      expect(res.groups.length).toBe(1);
      expect(res.groups[0].date).toBe('2026-07');
      expect(res.groups[0].orderCount).toBe(2);
      expect(res.groups[0].totalBillingAmountKrw).toBe(40000 * 1350);
    });
  });

  describe('getShipperDailyOrdersDetails', () => {
    it('ADMIN_TO_AGENCY 티어 인보이스로 invoiceIds 전달 시 metadata.source_order_id 기반 오더 역추적', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock([
            { id: 'inv-1', invoice_no: 'INV-001', status: 'UNPAID', is_finalized: false, metadata: { source_order_id: 'ord-1' }, total_amount: 175, currency: 'USD', invoice_tier: 'ADMIN_TO_AGENCY' },
          ]);
        }
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
            { order_id: 'ord-1', cost_type: 'BASE_FREIGHT', unit_price: 150, quantity: 1, total_amount: 150, currency: 'USD' },
            { order_id: 'ord-1', cost_type: 'OTHER_CHARGE', unit_price: 25, quantity: 1, total_amount: 25, currency: 'USD' },
          ]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyOrdersDetails(['inv-1']);
      expect(res.success).toBe(true);
      expect(res.orders?.length).toBe(1);
      expect(res.orders?.[0].orderNo).toBe('ORD-001');
      expect(res.orders?.[0].otherCharge).toBe(25 * 1350);
      expect(res.orders?.[0].totalAmountKrw).toBe(175 * 1350);
      expect(res.orders?.[0].invoiceNo).toBe('INV-001');
    });

    it('AGENCY_TO_SHIPPER 티어 인보이스도 동일하게 오더 역추적 정상 동작', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock([
            { id: 'inv-2', invoice_no: 'INV-002', status: 'UNPAID', is_finalized: false, metadata: { source_order_id: 'ord-2' } },
          ]);
        }
        if (table === 'zen_orders') {
          return createChainableMock([
            {
              id: 'ord-2',
              order_no: 'ORD-002',
              status: 'SHIPPED',
              transport_mode: 'UPS',
              recipient_country_code: 'KR',
              created_at: '2026-07-25T14:00:00Z',
              shipper_id: 'shipper-2',
              shipper: { name: 'XYZ 무역' },
            },
          ]);
        }
        if (table === 'zen_order_costs') {
          return createChainableMock([
            { order_id: 'ord-2', cost_type: 'FREIGHT', unit_price: 200, quantity: 1, total_amount: 200, currency: 'USD' },
          ]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyOrdersDetails(['inv-2']);
      expect(res.success).toBe(true);
      expect(res.orders?.length).toBe(1);
      expect(res.orders?.[0].orderNo).toBe('ORD-002');
      expect(res.orders?.[0].baseFreight).toBe(200 * 1350);
    });

    it('invoiceIds가 빈 배열이면 빈 결과 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      const res = await getShipperDailyOrdersDetails([]);
      expect(res.success).toBe(true);
      expect(res.orders).toHaveLength(0);
    });

    it('CANCELED 인보이스는 제외됨', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock([]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyOrdersDetails(['inv-canceled']);
      expect(res.success).toBe(true);
      expect(res.orders).toHaveLength(0);
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

  describe('Issue #912: 통화 혼재 청구액 오류 수정', () => {
    it('KRW 통화 인보이스 → totalBillingAmountKrw가 정확히 원화 합계', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN, org_id: 'platform-org' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock([
            {
              id: 'inv-krw-1',
              invoice_no: 'INV-KRW-001',
              total_amount: 60000,
              currency: 'KRW',
              status: 'UNPAID',
              is_finalized: false,
              billed_org_id: 'shipper-1',
              invoice_tier: 'ADMIN_TO_SHIPPER',
              created_at: '2026-07-28T10:00:00Z',
              org: { id: 'shipper-1', name: '테스트 화주' },
            },
          ]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'daily' });
      expect(res.success).toBe(true);
      expect(res.groups).toBeDefined();
      expect(res.groups.length).toBe(1);

      const group = res.groups[0];
      expect(group.totalBillingAmountKrw).toBe(60000);
      expect(group.estimatedBillingAmountUsd).toBe(Math.round(60000 / 1350 * 100) / 100);
      expect(group.hasUnsupportedCurrency).toBe(false);
    });

    it('USD 통화 인보이스 → totalBillingAmountKrw가 USD합계 × 환율과 일치', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN, org_id: 'platform-org' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock([
            {
              id: 'inv-usd-1',
              invoice_no: 'INV-USD-001',
              total_amount: 120,
              currency: 'USD',
              status: 'UNPAID',
              is_finalized: false,
              billed_org_id: 'shipper-1',
              invoice_tier: 'ADMIN_TO_SHIPPER',
              created_at: '2026-07-28T10:00:00Z',
              org: { id: 'shipper-1', name: '테스트 화주' },
            },
          ]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'daily' });
      expect(res.success).toBe(true);
      expect(res.groups).toBeDefined();
      expect(res.groups.length).toBe(1);

      const group = res.groups[0];
      expect(group.totalBillingAmountKrw).toBe(120 * 1350);
      expect(group.hasUnsupportedCurrency).toBe(false);
    });

    it('미지원 통화(TWD) 포함 인보이스 → hasUnsupportedCurrency=true 확인', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN, org_id: 'platform-org' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock([
            {
              id: 'inv-unsup-1',
              invoice_no: 'INV-UNSUP-001',
              total_amount: 50000,
              currency: 'TWD',
              status: 'UNPAID',
              is_finalized: false,
              billed_org_id: 'shipper-1',
              invoice_tier: 'ADMIN_TO_SHIPPER',
              created_at: '2026-07-28T10:00:00Z',
              org: { id: 'shipper-1', name: '테스트 화주' },
            },
          ]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'daily' });
      expect(res.success).toBe(true);
      expect(res.groups).toBeDefined();
      expect(res.groups.length).toBe(1);

      const group = res.groups[0];
      expect(group.hasUnsupportedCurrency).toBe(true);
    });
  });

  describe('AGENCY 앱 레벨 필터 (DEF-B-021)', () => {
    it('getShipperDailyBillingSummary: AGENCY 역할은 zen_agency_shippers를 조회하여 매출 인보이스를 필터링한다', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'agency-usr', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      });

      const mockAgencyChain = createChainableMock([{ shipper_org_id: 'shipper-allowed' }]);
      const mockInvoicesChain = createChainableMock([]);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_agency_shippers') return mockAgencyChain;
        if (table === 'zen_invoices') return mockInvoicesChain;
        return createChainableMock();
      });

      await getShipperDailyBillingSummary({ periodType: 'daily', startDate: '2026-07-27', endDate: '2026-07-27' });

      expect(mockAgencyChain.eq).toHaveBeenCalledWith('agency_org_id', 'agency-org');
      expect(mockAgencyChain.eq).toHaveBeenCalledWith('is_active', true);
      // The function should query zen_invoices for both purchased and sold
      expect(mockInvoicesChain.eq).toHaveBeenCalledWith('billed_org_id', 'agency-org');
    });

    it('getShipperDailyOrdersDetails: AGENCY 역할은 invoiceIds로 인보이스 조회 시 오더 역추적 정상 동작', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'agency-usr', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock([
            { id: 'inv-agency-1', invoice_no: 'INV-AGENCY-001', status: 'UNPAID', is_finalized: false, metadata: { source_order_id: 'ord-agency-1' } },
          ]);
        }
        if (table === 'zen_orders') {
          return createChainableMock([
            { id: 'ord-agency-1', order_no: 'ORD-AGENCY-001', status: 'DELIVERED', transport_mode: 'UPS', recipient_country_code: 'US', created_at: '2026-07-27T10:00:00Z', shipper_id: 'shipper-1', shipper: { name: '화주A' } },
          ]);
        }
        if (table === 'zen_order_costs') {
          return createChainableMock([
            { order_id: 'ord-agency-1', cost_type: 'FREIGHT', unit_price: 100, quantity: 1, total_amount: 100, currency: 'USD' },
          ]);
        }
        return createChainableMock();
      });

      const res = await getShipperDailyOrdersDetails(['inv-agency-1']);
      expect(res.success).toBe(true);
      expect(res.orders?.length).toBe(1);
      expect(res.orders?.[0].orderNo).toBe('ORD-AGENCY-001');
    });

    it('getShipperDailyOrdersDetails: AGENCY 역할은 빈 invoiceIds로 호출 시 빈 결과 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'agency-usr', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      });

      const res = await getShipperDailyOrdersDetails([]);
      expect(res.success).toBe(true);
      expect(res.orders).toHaveLength(0);
    });
  });

  describe('Issue #920: zen_invoices 기반 역할별 청구 집계 (getShipperDailyBillingSummary)', () => {
    it('ADMIN 세션 → .in("invoice_tier", ["ADMIN_TO_AGENCY","ADMIN_TO_SHIPPER"]) 필터가 실제로 적용된다', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN, org_id: 'platform-org' },
      });

      const invoiceChain = createChainableMock([
        {
          id: 'inv-admin-1',
          invoice_no: 'INV-ADMIN-001',
          total_amount: 500,
          currency: 'USD',
          status: 'UNPAID',
          is_finalized: false,
          billed_org_id: 'agency-org',
          invoice_tier: 'ADMIN_TO_AGENCY',
          created_at: '2026-07-25T10:00:00Z',
          org: { id: 'agency-org', name: '대리점A' },
        },
        {
          id: 'inv-admin-2',
          invoice_no: 'INV-ADMIN-002',
          total_amount: 300,
          currency: 'USD',
          status: 'UNPAID',
          is_finalized: true,
          billed_org_id: 'shipper-org',
          invoice_tier: 'ADMIN_TO_SHIPPER',
          created_at: '2026-07-25T11:00:00Z',
          org: { id: 'shipper-org', name: '화주B' },
        },
      ]);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') return invoiceChain;
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'daily' });
      expect(res.success).toBe(true);

      // Verify the .in() filter was actually called on zen_invoices query chain
      expect(invoiceChain.in).toHaveBeenCalledWith('invoice_tier', ['ADMIN_TO_AGENCY', 'ADMIN_TO_SHIPPER']);
      expect(invoiceChain.neq).toHaveBeenCalledWith('status', 'CANCELED');

      const groups = res.groups || [];
      expect(groups.length).toBe(2);

      const agencyGroup = groups.find((g: any) => g.shipperName === '대리점A');
      expect(agencyGroup).toBeDefined();
      expect(agencyGroup!.totalBillingAmountKrw).toBe(500 * 1350);
      expect(agencyGroup!.invoiceIds).toContain('inv-admin-1');
      expect(agencyGroup!.unfinalizedCount).toBe(1);

      const shipperGroup = groups.find((g: any) => g.shipperName === '화주B');
      expect(shipperGroup).toBeDefined();
      expect(shipperGroup!.totalBillingAmountKrw).toBe(300 * 1350);
      expect(shipperGroup!.finalizedCount).toBe(1);
    });

    it('AGENCY 세션 → 매입(.eq("billed_org_id",agency).eq("invoice_tier",ADMIN_TO_AGENCY)) + 매출(.eq("invoice_tier",AGENCY_TO_SHIPPER).in("billed_org_id",shippers)) 필터가 실제로 적용된다', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'agency-usr', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      });

      const agencyShippersChain = createChainableMock([{ shipper_org_id: 'shipper-x' }]);

      // 1st zen_invoices call: purchased (ADMIN_TO_AGENCY)
      const purchasedChain = createChainableMock([
        {
          id: 'inv-purchase',
          invoice_no: 'INV-PURCHASE-001',
          total_amount: 1000,
          currency: 'USD',
          status: 'UNPAID',
          is_finalized: false,
          billed_org_id: 'agency-org',
          invoice_tier: 'ADMIN_TO_AGENCY',
          created_at: '2026-07-26T09:00:00Z',
          org: { id: 'agency-org', name: '대리점A' },
        },
      ]);

      // 2nd zen_invoices call: sold (AGENCY_TO_SHIPPER)
      const soldChain = createChainableMock([
        {
          id: 'inv-sold',
          invoice_no: 'INV-SOLD-001',
          total_amount: 600,
          currency: 'USD',
          status: 'UNPAID',
          is_finalized: false,
          billed_org_id: 'shipper-x',
          invoice_tier: 'AGENCY_TO_SHIPPER',
          created_at: '2026-07-26T10:00:00Z',
          org: { id: 'shipper-x', name: '화주X' },
        },
      ]);

      let invoiceCallIdx = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_agency_shippers') return agencyShippersChain;
        if (table === 'zen_invoices') {
          invoiceCallIdx++;
          return invoiceCallIdx === 1 ? purchasedChain : soldChain;
        }
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'daily' });
      expect(res.success).toBe(true);

      // Verify agency_shippers query filters
      expect(agencyShippersChain.eq).toHaveBeenCalledWith('agency_org_id', 'agency-org');
      expect(agencyShippersChain.eq).toHaveBeenCalledWith('is_active', true);

      // Verify purchased query filters
      expect(purchasedChain.eq).toHaveBeenCalledWith('billed_org_id', 'agency-org');
      expect(purchasedChain.eq).toHaveBeenCalledWith('invoice_tier', 'ADMIN_TO_AGENCY');
      expect(purchasedChain.neq).toHaveBeenCalledWith('status', 'CANCELED');

      // Verify sold query filters
      expect(soldChain.eq).toHaveBeenCalledWith('invoice_tier', 'AGENCY_TO_SHIPPER');
      expect(soldChain.in).toHaveBeenCalledWith('billed_org_id', ['shipper-x']);
      expect(soldChain.neq).toHaveBeenCalledWith('status', 'CANCELED');

      const groups = res.groups || [];
      expect(groups.length).toBe(2);

      const purchased = groups.find((g: any) => g.shipperId === 'agency-org');
      expect(purchased).toBeDefined();
      expect(purchased!.shipperName).toBe('대리점A');
      expect(purchased!.totalBillingAmountKrw).toBe(1000 * 1350);
      expect(purchased!.invoiceIds).toContain('inv-purchase');

      const sold = groups.find((g: any) => g.shipperId === 'shipper-x');
      expect(sold).toBeDefined();
      expect(sold!.shipperName).toBe('화주X');
      expect(sold!.totalBillingAmountKrw).toBe(600 * 1350);
      expect(sold!.invoiceIds).toContain('inv-sold');
    });

    it('SHIPPER 세션 → .eq("billed_org_id", 본인 org_id) 필터가 실제로 적용된다', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'shipper-usr', role: USER_ROLES.SHIPPER, org_id: 'shipper-my' },
      });

      const invoiceChain = createChainableMock([
        {
          id: 'inv-mine',
          invoice_no: 'INV-MINE-001',
          total_amount: 800,
          currency: 'USD',
          status: 'UNPAID',
          is_finalized: false,
          billed_org_id: 'shipper-my',
          invoice_tier: 'ADMIN_TO_SHIPPER',
          created_at: '2026-07-27T10:00:00Z',
          org: { id: 'shipper-my', name: '나의 화주' },
        },
      ]);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') return invoiceChain;
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'daily' });
      expect(res.success).toBe(true);

      // Verify the .eq() filter was actually called on zen_invoices query chain
      expect(invoiceChain.eq).toHaveBeenCalledWith('billed_org_id', 'shipper-my');
      expect(invoiceChain.neq).toHaveBeenCalledWith('status', 'CANCELED');

      const groups = res.groups || [];
      expect(groups.length).toBe(1);

      const myGroup = groups[0];
      expect(myGroup.shipperId).toBe('shipper-my');
      expect(myGroup.shipperName).toBe('나의 화주');
      expect(myGroup.totalBillingAmountKrw).toBe(800 * 1350);
      expect(myGroup.invoiceIds).toContain('inv-mine');
    });
  });

  describe('DEF-B-029: breakdown 필드 누적 (Issue #964)', () => {
    it('zen_order_costs에 BASE_FREIGHT/FUEL_SURCHARGE 등이 있으면 각 필드에 누적된다', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr', role: USER_ROLES.ADMIN },
      });

      const invoiceChain = createChainableMock([
        {
          id: 'inv-1',
          invoice_no: 'INV-001',
          total_amount: 500,
          currency: 'USD',
          status: 'UNPAID',
          is_finalized: false,
          billed_org_id: 'shipper-1',
          invoice_tier: 'ADMIN_TO_SHIPPER',
          created_at: '2026-07-28T10:00:00Z',
          metadata: { source_order_id: 'order-1' },
          org: { id: 'shipper-1', name: '화주A' },
        },
      ]);

      const costsChain = createChainableMock([
        { order_id: 'order-1', cost_type: 'BASE_FREIGHT', unit_price: 100, quantity: 1, total_amount: 100, currency: 'USD' },
        { order_id: 'order-1', cost_type: 'FUEL_SURCHARGE', unit_price: 30, quantity: 1, total_amount: 30, currency: 'USD' },
        { order_id: 'order-1', cost_type: 'SURGE_FEE', unit_price: 20, quantity: 1, total_amount: 20, currency: 'USD' },
        { order_id: 'order-1', cost_type: 'OTHER_CHARGE', unit_price: 10, quantity: 1, total_amount: 10, currency: 'USD' },
      ]);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') return invoiceChain;
        if (table === 'zen_order_costs') return costsChain;
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'daily', startDate: '2026-07-28', endDate: '2026-07-28' });
      expect(res.success).toBe(true);

      const group = res.groups![0];
      expect(group.totalBaseFreight).toBe(100 * 1350);
      expect(group.totalFuelSurcharge).toBe(30 * 1350);
      expect(group.totalSurgeFee).toBe(20 * 1350);
      expect(group.totalOtherCharge).toBe(10 * 1350);
    });

    it('metadata.source_order_id가 없는 인보이스는 breakdown이 0으로 유지된다', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr', role: USER_ROLES.ADMIN },
      });

      const invoiceChain = createChainableMock([
        {
          id: 'inv-legacy',
          invoice_no: 'INV-LEGACY',
          total_amount: 200,
          currency: 'USD',
          status: 'UNPAID',
          is_finalized: false,
          billed_org_id: 'shipper-1',
          invoice_tier: 'ADMIN_TO_SHIPPER',
          created_at: '2026-07-28T10:00:00Z',
          metadata: {},
          org: { id: 'shipper-1', name: '화주B' },
        },
      ]);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') return invoiceChain;
        return createChainableMock([]);
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'daily', startDate: '2026-07-28', endDate: '2026-07-28' });
      expect(res.success).toBe(true);

      const group = res.groups![0];
      expect(group.totalBaseFreight).toBe(0);
      expect(group.totalFuelSurcharge).toBe(0);
      expect(group.totalSurgeFee).toBe(0);
      expect(group.totalOtherCharge).toBe(0);
      expect(group.totalBillingAmountKrw).toBe(200 * 1350);
    });
  });

  describe('DEF-B-032: getShipperDailyOrdersDetails 인보이스 기반 계산 (Issue #972)', () => {
    it('ADMIN_TO_AGENCY 인보이스는 platform_breakdown 기반으로 breakdown 표시', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      });

      const ordersChain = createChainableMock([
        { id: 'order-1', order_no: 'ZEN-001', status: 'DELIVERED', transport_mode: 'UPS', recipient_country_code: 'USA', created_at: '2026-07-29T10:00:00Z', shipper_id: 'shipper-1', shipper: { name: '화주A' } },
      ]);
      const invoicesChain = createChainableMock([
        {
          id: 'inv-1', invoice_no: 'INV-001', status: 'UNPAID', is_finalized: false,
          metadata: { source_order_id: 'order-1', platform_breakdown: { baseFreight: 100000, fuelSurcharge: 20000, surgeFee: 5000, otherCharges: 3000 } },
          total_amount: 128000, currency: 'KRW', invoice_tier: 'ADMIN_TO_AGENCY',
        },
      ]);
      const costsChain = createChainableMock([
        { order_id: 'order-1', cost_type: 'BASE_FREIGHT', unit_price: 50000, quantity: 1, total_amount: 50000, currency: 'KRW' },
      ]);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') return invoicesChain;
        if (table === 'zen_orders') return ordersChain;
        if (table === 'zen_order_costs') return costsChain;
        return createChainableMock([]);
      });

      const { getShipperDailyOrdersDetails } = await import('@/app/actions/finance/daily-billing');
      const result = await getShipperDailyOrdersDetails(['inv-1'], 1350);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.orders![0].baseFreight).toBe(100000);
      expect(result.orders![0].fuelSurcharge).toBe(20000);
      expect(result.orders![0].surgeFee).toBe(5000);
      expect(result.orders![0].otherCharge).toBe(3000);
    });

    it('AGENCY_TO_SHIPPER 인보이스는 zen_order_costs 기반으로 계산 (회귀 확인)', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      });

      const ordersChain = createChainableMock([
        { id: 'order-2', order_no: 'ZEN-002', status: 'DELIVERED', transport_mode: 'UPS', recipient_country_code: 'USA', created_at: '2026-07-29T10:00:00Z', shipper_id: 'shipper-1', shipper: { name: '화주B' } },
      ]);
      const invoicesChain = createChainableMock([
        {
          id: 'inv-2', invoice_no: 'INV-002', status: 'UNPAID', is_finalized: false,
          metadata: { source_order_id: 'order-2' },
          total_amount: 80000, currency: 'KRW', invoice_tier: 'AGENCY_TO_SHIPPER',
        },
      ]);
      const costsChain = createChainableMock([
        { order_id: 'order-2', cost_type: 'BASE_FREIGHT', unit_price: 60000, quantity: 1, total_amount: 60000, currency: 'KRW' },
        { order_id: 'order-2', cost_type: 'FUEL_SURCHARGE', unit_price: 15000, quantity: 1, total_amount: 15000, currency: 'KRW' },
      ]);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') return invoicesChain;
        if (table === 'zen_orders') return ordersChain;
        if (table === 'zen_order_costs') return costsChain;
        return createChainableMock([]);
      });

      const { getShipperDailyOrdersDetails } = await import('@/app/actions/finance/daily-billing');
      const result = await getShipperDailyOrdersDetails(['inv-2'], 1350);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.orders![0].baseFreight).toBe(60000);
      expect(result.orders![0].fuelSurcharge).toBe(15000);
      expect(result.orders![0].totalAmountKrw).toBe(80000);
    });

    it('인보이스가 없는 오더는 breakdown이 0으로 유지됨', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      });

      const ordersChain = createChainableMock([
        { id: 'order-3', order_no: 'ZEN-003', status: 'DELIVERED', transport_mode: 'UPS', recipient_country_code: 'USA', created_at: '2026-07-29T10:00:00Z', shipper_id: 'shipper-1', shipper: { name: '화주C' } },
      ]);
      const invoicesChain = createChainableMock([
        {
          id: 'inv-3', invoice_no: 'INV-003', status: 'UNPAID', is_finalized: false,
          metadata: { source_order_id: 'order-3' },
          total_amount: 0, currency: 'KRW', invoice_tier: 'AGENCY_TO_SHIPPER',
        },
      ]);
      const costsChain = createChainableMock([]);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') return invoicesChain;
        if (table === 'zen_orders') return ordersChain;
        if (table === 'zen_order_costs') return costsChain;
        return createChainableMock([]);
      });

      const { getShipperDailyOrdersDetails } = await import('@/app/actions/finance/daily-billing');
      const result = await getShipperDailyOrdersDetails(['inv-3'], 1350);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.orders![0].baseFreight).toBe(0);
      expect(result.orders![0].totalAmountKrw).toBe(0);
    });
  });
});
