import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

const createChainableMock = (data: any = null, error: any = null) => {
  const node: any = {};
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'not', 'limit', 'order', 'single', 'maybeSingle', 'gte', 'lte', 'neq', 'filter', 'ilike']) {
    node[method] = vi.fn(() => node);
  }
  node.then = (resolve: any) => resolve({ data, error });
  return node;
};

const mockSupabase = { from: vi.fn() };

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/params/service', () => ({ getNumericParam: vi.fn().mockResolvedValue(1350) }));
vi.mock('@/lib/finance/exchange-rate', () => ({ getExchangeRate: vi.fn().mockResolvedValue(1350) }));

import { validateUserAction } from '@/lib/auth/guards';
import { getShipperDailyBillingSummary } from '@/app/actions/finance/daily-billing';

// TASK-B-381 PR-4a (§2-7): /finance/daily-billing UPS 항목 숨김.
describe('TASK-B-381 PR-4a — 일별 청구 집계에서 UPS 제외', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'platform-org' },
    });
  });

  it('출처 오더가 UPS인 인보이스는 집계에서 제외한다', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_invoices') {
        return createChainableMock([
          {
            id: 'inv-ups',
            invoice_no: 'INV-UPS',
            total_amount: 1000,
            currency: 'KRW',
            status: 'UNPAID',
            is_finalized: false,
            billed_org_id: 'shipper-1',
            invoice_tier: 'ADMIN_TO_SHIPPER',
            created_at: '2026-07-29T10:00:00Z',
            metadata: { source_order_id: 'order-ups' },
            applied_exchange_rate: 1350,
            org: { id: 'shipper-1', name: '화주A' },
          },
        ]);
      }
      if (table === 'zen_orders') {
        return createChainableMock([{ id: 'order-ups', transport_mode: 'UPS' }]);
      }
      return createChainableMock([]);
    });

    const res = await getShipperDailyBillingSummary({ periodType: 'daily' });

    expect(res.success).toBe(true);
    expect(res.groups).toEqual([]);
  });

  it('비UPS 인보이스는 기존대로 집계한다(양성 대조)', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_invoices') {
        return createChainableMock([
          {
            id: 'inv-air',
            invoice_no: 'INV-AIR',
            total_amount: 1000,
            currency: 'KRW',
            status: 'UNPAID',
            is_finalized: false,
            billed_org_id: 'shipper-1',
            invoice_tier: 'ADMIN_TO_SHIPPER',
            created_at: '2026-07-29T10:00:00Z',
            metadata: { source_order_id: 'order-air' },
            applied_exchange_rate: 1350,
            org: { id: 'shipper-1', name: '화주A' },
          },
        ]);
      }
      if (table === 'zen_orders') {
        return createChainableMock([{ id: 'order-air', transport_mode: 'AIR' }]);
      }
      return createChainableMock([]);
    });

    const res = await getShipperDailyBillingSummary({ periodType: 'daily' });

    expect(res.success).toBe(true);
    expect(res.groups).toHaveLength(1);
    expect(res.groups![0].orderCount).toBe(1);
  });
});
