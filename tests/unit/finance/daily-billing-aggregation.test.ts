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
            { order_id: 'ord-1', cost_type: 'BASE_FREIGHT', unit_price: 150, quantity: 1, total_amount: 150, currency: 'USD' },
            { order_id: 'ord-1', cost_type: 'OTHER_CHARGE', unit_price: 25, quantity: 1, total_amount: 25, currency: 'USD' },
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
      expect(res.orders?.[0].otherCharge).toBe(25 * 1350);
      expect(res.orders?.[0].totalAmountKrw).toBe(175 * 1350);
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

    it('getShipperDailyOrdersDetails: AGENCY 역할은 zen_agency_shippers를 조회하여 shipperId 검증', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'agency-usr', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      });

      const mockAgencyChain = createChainableMock([{ shipper_org_id: 'shipper-allowed' }]);
      const mockOrdersChain = createChainableMock([]);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_agency_shippers') return mockAgencyChain;
        return mockOrdersChain;
      });

      const res = await getShipperDailyOrdersDetails('shipper-allowed', '2026-07-27', 'daily');
      expect(mockAgencyChain.eq).toHaveBeenCalledWith('agency_org_id', 'agency-org');
      expect(res.success).toBe(true);
    });

    it('getShipperDailyOrdersDetails: AGENCY 역할은 허용되지 않은 shipperId는 빈 결과 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'agency-usr', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_agency_shippers') return createChainableMock([{ shipper_org_id: 'shipper-allowed' }]);
        if (table === 'zen_orders') return createChainableMock([
          { id: 'o1', order_no: 'ZEN-001', status: 'DELIVERED', transport_mode: 'UPS', recipient_country_code: 'KR', created_at: '2026-07-27T10:00:00Z', shipper_id: 'shipper-other', shipper: { name: 'OTHER' } },
        ]);
        return createChainableMock([]);
      });

      const res = await getShipperDailyOrdersDetails('shipper-other', '2026-07-27', 'daily');
      expect(res.success).toBe(true);
      expect(res.orders).toHaveLength(0);
    });
  });

  describe('Issue #920: zen_invoices 기반 역할별 청구 집계 (getShipperDailyBillingSummary)', () => {
    it('ADMIN 세션 → invoice_tier IN (ADMIN_TO_AGENCY, ADMIN_TO_SHIPPER) 인보이스만 집계', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN, org_id: 'platform-org' },
      });

      // Mock returns pre-filtered data (simulating server-side .in('invoice_tier', [...]))
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock([
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
        }
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'daily' });
      expect(res.success).toBe(true);

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

    it('AGENCY 세션 → 매입(ADMIN_TO_AGENCY, 본인 billed) + 매출(AGENCY_TO_SHIPPER, 소속 화주 billed) 분리 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'agency-usr', role: USER_ROLES.AGENCY, org_id: 'agency-org' },
      });

      let invoiceCallIdx = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_agency_shippers') {
          return createChainableMock([{ shipper_org_id: 'shipper-x' }]);
        }
        if (table === 'zen_invoices') {
          invoiceCallIdx++;
          if (invoiceCallIdx === 1) {
            // 1st call: purchased (ADMIN_TO_AGENCY, billed_org_id=agency-org)
            return createChainableMock([
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
          } else {
            // 2nd call: sold (AGENCY_TO_SHIPPER, billed_org_id IN [shipper-x])
            return createChainableMock([
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
          }
        }
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'daily' });
      expect(res.success).toBe(true);

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

    it('SHIPPER 세션 → billed_org_id = 본인 org_id인 인보이스만 집계, 접근 허용', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'shipper-usr', role: USER_ROLES.SHIPPER, org_id: 'shipper-my' },
      });

      // Mock returns only the shipper's own invoice (server-side .eq('billed_org_id', ...))
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock([
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
        }
        return createChainableMock();
      });

      const res = await getShipperDailyBillingSummary({ periodType: 'daily' });
      expect(res.success).toBe(true);

      const groups = res.groups || [];
      expect(groups.length).toBe(1);

      const myGroup = groups[0];
      expect(myGroup.shipperId).toBe('shipper-my');
      expect(myGroup.shipperName).toBe('나의 화주');
      expect(myGroup.totalBillingAmountKrw).toBe(800 * 1350);
      expect(myGroup.invoiceIds).toContain('inv-mine');
    });
  });
});
