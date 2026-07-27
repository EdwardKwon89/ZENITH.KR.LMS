import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

interface ChainableMock {
  [key: string]: any;
  then: (resolve: any) => void;
}

const createChainableMock = (data: any = null, error: any = null): ChainableMock => {
  const mockObj: ChainableMock = {} as any;
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'not', 'limit', 'order', 'single', 'maybeSingle', 'ilike', 'is', 'filter', 'neq'];
  methods.forEach(method => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });
  mockObj.then = (resolve: any) => resolve({ data, error });
  return mockObj;
};

const mockSupabase: any = {
  from: vi.fn(),
};

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: vi.fn(),
}));

import { validateAdminAction, validateUserAction } from '@/lib/auth/guards';
import { recordUpsActualCharges, getUpsActualCharges, getUpsChargeReconciliation, searchDeliveredUpsOrders } from '@/app/actions/finance/ups-actual-charges';

describe('TASK-B-204: IN_TRANSIT 부가요금 등록', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockValidateUser(role: string, orgId?: string) {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'user-id' },
      profile: { id: 'user-id', role, org_id: orgId || 'org-1' },
    });
  }

  function mockOrderChain(orderData: any) {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock(orderData);
      if (table === 'zen_invoices') return createChainableMock(null);
      if (table === 'zen_order_costs') {
        return createChainableMock([
          { cost_type: 'BASE_FREIGHT', unit_price: 150, quantity: 1 },
          { cost_type: 'FUEL_SURCHARGE', unit_price: 50, quantity: 1 },
        ]);
      }
      if (table === 'zen_ups_actual_charges') return createChainableMock(null, null);
      if (table === 'zen_agency_shippers') return createChainableMock([]);
      return createChainableMock();
    });
  }

  it('TC-B204-01: IN_TRANSIT → 부가요금 등록 성공', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    mockOrderChain({ status: 'IN_TRANSIT', transport_mode: 'UPS', shipper_id: 'shipper-1' });

    const result = await recordUpsActualCharges('order-1', [
      { chargeType: 'BASE', amount: 200, currency: 'USD' },
    ]);

    expect(result.success).toBe(true);
  });

  it('TC-B204-02: REGISTERED 상태 → 차단 (IN_TRANSIT/DELIVERED만 허용)', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    mockOrderChain({ status: 'REGISTERED', transport_mode: 'UPS', shipper_id: 'shipper-1' });

    const result = await recordUpsActualCharges('order-1', []);
    expect(result.success).toBe(false);
    expect(result.error).toContain('IN_TRANSIT 또는 DELIVERED');
  });

  it('TC-B204-03: SHIPPER 권한 없음 → 거부', async () => {
    mockValidateUser(USER_ROLES.CORPORATE);
    mockOrderChain({ status: 'IN_TRANSIT', transport_mode: 'UPS', shipper_id: 'shipper-1' });

    const result = await recordUpsActualCharges('order-1', []);
    expect(result.success).toBe(false);
  });

  it('TC-B204-04: AGENCY 권한 허용 → 본인 화주 오더 등록 성공', async () => {
    mockValidateUser(USER_ROLES.AGENCY, 'agency-org');
    mockOrderChain({ status: 'IN_TRANSIT', transport_mode: 'UPS', shipper_id: 'shipper-1' });
    // AGENCY → shipper-1 연결되어 있다고 가정
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock({ status: 'IN_TRANSIT', transport_mode: 'UPS', shipper_id: 'shipper-1' });
      if (table === 'zen_invoices') return createChainableMock(null);
      if (table === 'zen_agency_shippers') return createChainableMock([{ shipper_org_id: 'shipper-1' }]);
      if (table === 'zen_order_costs') return createChainableMock([
        { cost_type: 'BASE_FREIGHT', unit_price: 150, quantity: 1 },
        { cost_type: 'FUEL_SURCHARGE', unit_price: 50, quantity: 1 },
      ]);
      if (table === 'zen_ups_actual_charges') return createChainableMock(null, null);
      return createChainableMock();
    });

    const result = await recordUpsActualCharges('order-1', [
      { chargeType: 'BASE', amount: 100, currency: 'USD' },
    ]);
    expect(result.success).toBe(true);
  });

  it('TC-B204-05: DELIVERED 상태 기존 플로우 회귀 확인 (마감 전)', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    mockOrderChain({ status: 'DELIVERED', transport_mode: 'UPS', shipper_id: 'shipper-1' });

    const result = await recordUpsActualCharges('order-1', [
      { chargeType: 'BASE', amount: 200, currency: 'USD' },
    ]);
    expect(result.success).toBe(true);
  });

  it('TC-B204-06: AGENCY 타 화주 오더 → 차단', async () => {
    mockValidateUser(USER_ROLES.AGENCY, 'agency-org');
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock({ status: 'IN_TRANSIT', transport_mode: 'UPS', shipper_id: 'other-shipper' });
      if (table === 'zen_agency_shippers') return createChainableMock([{ shipper_org_id: 'shipper-1' }]);
      return createChainableMock();
    });

    const result = await recordUpsActualCharges('order-1', []);
    expect(result.success).toBe(false);
    expect(result.error).toContain('본인 소속 화주의 오더만');
  });

  it('TC-B204-07: searchDeliveredUpsOrders가 recipient_country_code를 사용한다 (DEF-B-018)', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    const mockOrders = [
      { id: 'o1', order_no: 'ZEN-UPS-001', status: 'DELIVERED', transport_mode: 'UPS', shipper_id: 's1', dest_country_code: 'KR', created_at: '2026-07-26', tracking_config: { tracking_no: 'TRACK-001' } },
    ];
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock(mockOrders);
      return createChainableMock([]);
    });

    const result = await searchDeliveredUpsOrders('UPS-001');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].dest_country_code).toBe('KR');
  });

  it('TC-B204-08: getUpsChargeReconciliation이 estimatedBreakdown을 반환한다', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_order_costs') return createChainableMock([
        { cost_type: 'BASE_FREIGHT', unit_price: 100, quantity: 1, currency: 'USD' },
        { cost_type: 'FUEL_SURCHARGE', unit_price: 30, quantity: 1, currency: 'USD' },
        { cost_type: 'SURGE_FEE', unit_price: 20, quantity: 1, currency: 'USD' },
      ]);
      if (table === 'zen_ups_actual_charges') return createChainableMock([]);
      if (table === 'zen_invoices') return createChainableMock(null);
      return createChainableMock();
    });

    const { getUpsChargeReconciliation } = await import('@/app/actions/finance/ups-actual-charges');
    const result = await getUpsChargeReconciliation('order-1');

    expect(result).not.toBeNull();
    expect(result!.estimated).toBe(150);
    expect(result!.estimatedBreakdown).toHaveLength(3);
    expect(result!.estimatedBreakdown[0].costType).toBe('BASE_FREIGHT');
    expect(result!.estimatedBreakdown[0].amount).toBe(100);
    expect(result!.actual).toBe(150);
    expect(result!.variance).toBe(0);
  });

  it('TC-B204-09: getUpsChargeReconciliation에서 actual = estimated + additionalSum', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_order_costs') return createChainableMock([
        { cost_type: 'BASE_FREIGHT', unit_price: 100, quantity: 1, currency: 'USD' },
      ]);
      if (table === 'zen_ups_actual_charges') return createChainableMock([
        { charge_amount: 50 },
        { charge_amount: 25 },
      ]);
      if (table === 'zen_invoices') return createChainableMock(null);
      return createChainableMock();
    });

    const { getUpsChargeReconciliation } = await import('@/app/actions/finance/ups-actual-charges');
    const result = await getUpsChargeReconciliation('order-1');

    expect(result).not.toBeNull();
    expect(result!.estimated).toBe(100);
    expect(result!.actual).toBe(175);
    expect(result!.variance).toBe(75);
  });

  describe('TASK-B-227: getUpsChargeReconciliation invoiceNo/invoiceDate', () => {
    it('TC-B227-01: zen_invoices 없는 오더 → invoiceNo/invoiceDate가 null', async () => {
      mockValidateUser(USER_ROLES.ADMIN);
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_order_costs') return createChainableMock([
          { cost_type: 'BASE_FREIGHT', unit_price: 100, quantity: 1, currency: 'USD' },
        ]);
        if (table === 'zen_ups_actual_charges') return createChainableMock([]);
        if (table === 'zen_invoices') return createChainableMock(null);
        return createChainableMock();
      });

      const result = await getUpsChargeReconciliation('order-no-invoice');
      expect(result.invoiceNo).toBeNull();
      expect(result.invoiceDate).toBeNull();
      // isFinalized는 기존 동작 유지 (변경 금지)
      expect(result.isFinalized).toBe(false);
    });

    it('TC-B227-02: zen_invoices 연결된 오더 → invoiceNo/invoiceDate가 fixture 값과 일치', async () => {
      const mockInvoice = {
        id: 'inv-test-001',
        invoice_no: 'INV-TASK-B227-TEST',
        created_at: '2026-07-27T10:00:00.000Z',
        is_finalized: true,
      };

      mockValidateUser(USER_ROLES.ADMIN);
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_order_costs') return createChainableMock([
          { cost_type: 'BASE_FREIGHT', unit_price: 100, quantity: 1, currency: 'USD' },
        ]);
        if (table === 'zen_ups_actual_charges') return createChainableMock([]);
        if (table === 'zen_invoices') return createChainableMock(mockInvoice);
        return createChainableMock();
      });

      const result = await getUpsChargeReconciliation('order-with-invoice');
      expect(result.invoiceNo).toBe('INV-TASK-B227-TEST');
      expect(result.invoiceDate).toBe('2026-07-27T10:00:00.000Z');
      // isFinalized는 기존 동작 그대로 — finalized invoice이면 true
      expect(result.isFinalized).toBe(true);
    });

    it('TC-B227-03: isFinalized가 CANCELED 아닌 invoice의 is_finalized 값을 반영한다', async () => {
      const mockInvoice = {
        id: 'inv-test-002',
        invoice_no: 'INV-NOT-FINALIZED',
        created_at: '2026-07-27T11:00:00.000Z',
        is_finalized: false,
      };

      mockValidateUser(USER_ROLES.ADMIN);
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_order_costs') return createChainableMock([
          { cost_type: 'BASE_FREIGHT', unit_price: 100, quantity: 1, currency: 'USD' },
        ]);
        if (table === 'zen_ups_actual_charges') return createChainableMock([]);
        if (table === 'zen_invoices') return createChainableMock(mockInvoice);
        return createChainableMock();
      });

      const result = await getUpsChargeReconciliation('order-with-invoice-2');
      expect(result.invoiceNo).toBe('INV-NOT-FINALIZED');
      expect(result.isFinalized).toBe(false);
    });
  });

  it('TC-B204-10: recordUpsActualCharges에서 adjustmentAmount = actualSum - estimatedSum 수식 유지', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock({ status: 'DELIVERED', transport_mode: 'UPS', shipper_id: 'shipper-1' });
      if (table === 'zen_invoices') return createChainableMock(null);
      if (table === 'zen_order_costs') return createChainableMock([
        { cost_type: 'BASE_FREIGHT', unit_price: 100, quantity: 1, currency: 'USD' },
      ]);
      if (table === 'zen_ups_actual_charges') return createChainableMock(null, null);
      return createChainableMock();
    });

    const result = await recordUpsActualCharges('order-1', [
      { chargeType: 'ADDITIONAL', amount: 50, currency: 'USD' },
    ]);
    expect(result.success).toBe(true);
    expect(result.adjustmentAmount).toBe(50);
  });
});
