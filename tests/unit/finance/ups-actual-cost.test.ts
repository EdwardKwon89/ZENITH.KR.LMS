import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

const createChainableMock = (data: any = null, error: any = null) => {
  const mockObj: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'not', 'limit', 'order', 'single', 'maybeSingle', 'filter', 'neq', 'is', 'upsert'];
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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/finance/exchange-rate', () => ({
  getExchangeRate: vi.fn().mockResolvedValue(1350),
}));

vi.mock('@/app/actions/ups/freight', () => ({
  estimateUpsFreight: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/app/actions/finance/settlement', () => ({
  finalizeInvoice: vi.fn().mockResolvedValue({ success: true }),
}));

import { validateUserAction } from '@/lib/auth/guards';
import { recordActualCostAndFinalize } from '@/app/actions/finance/ups-actual-cost';

describe('recordActualCostAndFinalize (TASK-B-317)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('기본운임 +7% admin 원가 적용 후 저장', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN },
      user: { id: 'admin-1' },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') {
        return createChainableMock({ id: 'ord-1', status: 'IN_TRANSIT', transport_mode: 'UPS', shipper_id: 'shipper-1', created_at: '2026-08-17' });
      }
      if (table === 'order_status_history') {
        return createChainableMock({ created_at: '2026-08-15' });
      }
      if (table === 'zen_ups_actual_cost') {
        return createChainableMock(null);
      }
      return createChainableMock();
    });

    const result = await recordActualCostAndFinalize('ord-1', {
      baseFreightKrw: 100000,
      fuelSurchargeKrw: 10000,
      surgeFeeKrw: 5000,
      otherChargesKrw: 3000,
    });

    expect(result.success).toBe(true);
    // 기본운임 100000 * 1.07 = 107000, 합계: 107000 + 10000 + 5000 + 3000 = 125000
    expect(result.totalCostKrw).toBe(125000);
  });

  it('ADMIN이 아닌 역할은 거부', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'user-1', role: USER_ROLES.SHIPPER },
      user: { id: 'user-1' },
    });

    const result = await recordActualCostAndFinalize('ord-1', {
      baseFreightKrw: 100000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('권한이 없습니다');
  });

  it('IN_TRANSIT/DELIVERED가 아닌 상태는 거부', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN },
      user: { id: 'admin-1' },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') {
        return createChainableMock({ id: 'ord-1', status: 'REGISTERED', transport_mode: 'UPS', shipper_id: 'shipper-1', created_at: '2026-08-17' });
      }
      return createChainableMock();
    });

    const result = await recordActualCostAndFinalize('ord-1', {
      baseFreightKrw: 100000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('IN_TRANSIT 또는 DELIVERED');
  });

  it('기타부가운임이 실제로 저장됨', async () => {
    let insertedCharges: any[] = [];
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN },
      user: { id: 'admin-1' },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') {
        return createChainableMock({ id: 'ord-1', status: 'IN_TRANSIT', transport_mode: 'UPS', shipper_id: 'shipper-1', created_at: '2026-08-17' });
      }
      if (table === 'order_status_history') {
        return createChainableMock({ created_at: '2026-08-15' });
      }
      if (table === 'zen_ups_actual_cost') {
        return createChainableMock(null);
      }
      if (table === 'zen_ups_actual_other_charges') {
        const mock = createChainableMock(null);
        mock.insert = vi.fn().mockImplementation((data) => {
          insertedCharges = data;
          return mock;
        });
        return mock;
      }
      return createChainableMock();
    });

    const result = await recordActualCostAndFinalize('ord-1', {
      baseFreightKrw: 100000,
      otherCharges: [
        { name: 'Customs Clearance', amount: 5000, currency: 'KRW' },
        { name: 'Documentation Fee', amount: 2000, currency: 'KRW' },
      ],
    });

    expect(result.success).toBe(true);
    expect(insertedCharges).toHaveLength(2);
    expect(insertedCharges[0].charge_name).toBe('Customs Clearance');
    expect(insertedCharges[0].amount).toBe(5000);
  });
});
