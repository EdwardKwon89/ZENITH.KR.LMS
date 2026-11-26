import { describe, it, expect, vi, beforeEach } from 'vitest';

const trErrorMock = vi.hoisted(() => vi.fn(async (key: string) => key));
vi.mock('@/lib/i18n/action-error', () => ({
  trError: trErrorMock,
  actionLocale: async () => 'ko',
}));

const financeMock = vi.hoisted(() => ({
  generateInvoicesForOrder: vi.fn(),
  finalizeInvoice: vi.fn(),
}));
vi.mock('@/app/actions/finance', () => ({
  generateInvoicesForOrder: financeMock.generateInvoicesForOrder,
}));
vi.mock('@/app/actions/finance/settlement', () => ({
  generateInvoicesForOrder: financeMock.generateInvoicesForOrder,
  finalizeInvoice: financeMock.finalizeInvoice,
}));

const repoMock = vi.hoisted(() => ({
  getMasterOrderId: vi.fn(),
  getStatus: vi.fn(),
}));
vi.mock('@/lib/repositories', () => ({
  OrderRepository: class {
    getMasterOrderId = repoMock.getMasterOrderId;
    getStatus = repoMock.getStatus;
  },
  AdminRepository: class {},
}));

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));
vi.mock('@/lib/logistics/status-machine', () => ({
  canChangeStatus: vi.fn().mockReturnValue({ allowed: true }),
  getOrderEditScope: vi.fn(),
}));
vi.mock('@/lib/logistics/tracking', () => ({
  generateTrackingHistory: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/app/actions/notifications', () => ({
  triggerStatusChangeNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));

import { validateUserAction } from '@/lib/auth/guards';
import { updateOrderStatus } from '@/app/actions/orders';
import { finalizeDailyShipperInvoices } from '@/app/actions/finance/daily-billing';
import { OrderStatus } from '@/types/orders';

function chain(data: unknown = null, error: unknown = null) {
  const node: any = {};
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'neq', 'filter', 'order', 'limit', 'gte', 'lte']) {
    node[method] = vi.fn(() => node);
  }
  node.single = vi.fn(async () => ({ data, error }));
  node.maybeSingle = vi.fn(async () => ({ data, error }));
  node.then = (resolve: (value: unknown) => unknown) => resolve({ data, error });
  return node;
}

const PROFILE = { id: 'user-1', role: 'ADMIN', org_id: 'org-1' };

beforeEach(() => {
  vi.clearAllMocks();
  (validateUserAction as any).mockResolvedValue({
    supabase: { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) },
    user: { id: 'user-1' },
    profile: PROFILE,
  });
  repoMock.getMasterOrderId.mockResolvedValue({ data: null });
  financeMock.finalizeInvoice.mockResolvedValue({ success: true });
});

describe('TASK-B-381 PR-3 — 출고확정 시 UPS 자동 인보이스 미생성', () => {
  it('UPS 오더 RELEASED → generateInvoicesForOrder 미호출', async () => {
    repoMock.getStatus.mockResolvedValue({ data: { status: OrderStatus.IN_TRANSIT, transport_mode: 'UPS' }, error: null });

    const res = await updateOrderStatus('order-ups', OrderStatus.RELEASED);

    expect(res).toEqual({ success: true });
    expect(financeMock.generateInvoicesForOrder).not.toHaveBeenCalled();
  });

  it('비UPS 오더 RELEASED → generateInvoicesForOrder 호출(양성 대조)', async () => {
    repoMock.getStatus.mockResolvedValue({ data: { status: OrderStatus.IN_TRANSIT, transport_mode: 'AIR' }, error: null });
    financeMock.generateInvoicesForOrder.mockResolvedValue({ success: true });

    await updateOrderStatus('order-air', OrderStatus.RELEASED);

    expect(financeMock.generateInvoicesForOrder).toHaveBeenCalledWith('order-air');
  });

  it('UPS 오더라도 RELEASED가 아니면 인보이스 액션을 호출하지 않는다', async () => {
    repoMock.getStatus.mockResolvedValue({ data: { status: OrderStatus.REGISTERED, transport_mode: 'UPS' }, error: null });

    await updateOrderStatus('order-ups-2', OrderStatus.SCHEDULED);

    expect(financeMock.generateInvoicesForOrder).not.toHaveBeenCalled();
  });
});

describe('TASK-B-381 PR-3 — 일괄 마감에서 UPS 인보이스 제외', () => {
  function supabaseForSummary(invoices: unknown[], orders: unknown[]) {
    return {
      from: vi.fn((table: string) => {
        if (table === 'zen_invoices') return chain(invoices);
        if (table === 'zen_orders') return chain(orders);
        return chain(null);
      }),
    };
  }

  it('UPS 인보이스는 건너뛰고 비UPS만 마감한다(skippedCount 1)', async () => {
    const supabase = supabaseForSummary(
      [
        { id: 'inv-ups', metadata: { source_order_id: 'order-ups' } },
        { id: 'inv-air', metadata: { source_order_id: 'order-air' } },
      ],
      [
        { id: 'order-ups', transport_mode: 'UPS' },
        { id: 'order-air', transport_mode: 'AIR' },
      ],
    );
    (validateUserAction as any).mockResolvedValue({ supabase, profile: PROFILE });

    const res = await finalizeDailyShipperInvoices(['inv-ups', 'inv-air']);

    expect(financeMock.finalizeInvoice).toHaveBeenCalledTimes(1);
    expect(financeMock.finalizeInvoice).toHaveBeenCalledWith('inv-air', expect.any(String));
    expect(res).toMatchObject({ success: true, finalizedCount: 1, failedCount: 0, skippedCount: 1 });
    expect(res.errors).toEqual([]);
  });

  it('인보이스 조회 실패는 fail-closed — 아무것도 마감하지 않고 실패 반환', async () => {
    const supabase = {
      from: vi.fn(() => chain(null, { message: 'forced lookup failure' })),
    };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: PROFILE });

    const res = await finalizeDailyShipperInvoices(['inv-1']);

    expect(res.success).toBe(false);
    expect(financeMock.finalizeInvoice).not.toHaveBeenCalled();
  });
});
