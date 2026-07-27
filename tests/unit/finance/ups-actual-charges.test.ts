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
      { id: 'o1', order_no: 'ZEN-UPS-001', status: 'DELIVERED', transport_mode: 'UPS', shipper_id: 's1', recipient_country_code: 'KR', created_at: '2026-07-26', tracking_config: { tracking_no: 'TRACK-001' } },
    ];
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock(mockOrders);
      return createChainableMock([]);
    });

    const result = await searchDeliveredUpsOrders('UPS-001');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].recipient_country_code).toBe('KR');
  });
});
