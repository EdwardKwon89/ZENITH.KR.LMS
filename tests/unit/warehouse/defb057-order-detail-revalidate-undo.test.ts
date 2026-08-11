import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';

// TASK-B-288 (Issue #1077 / DEF-B-057): undoUpsRegistration()이
// 오더 상세 동적 페이지 `/(dashboard)/orders/[orderId]`도 revalidate 하는지 검증.
//
// - cancelUpsRegistration/updateOrderStatus는 mock (본 테스트는 warehouse.ts의
//   revalidatePath 배선 검증이 목적)
// - 기존 `/(dashboard)/orders`(목록) revalidate 유지 (회귀 방지)

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
// unstable_cache(파라미터 서비스) 등 다른 next/cache 의존은 보존, revalidatePath만 mock
vi.mock('next/cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/cache')>();
  return { ...actual, revalidatePath: vi.fn() };
});

const mockValidateUserAction = vi.fn();
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: (...args: any[]) => mockValidateUserAction(...args),
}));

const mockUpdateOrderStatus = vi.fn();
vi.mock('@/app/actions/operations/orders', () => ({
  updateOrderStatus: (...args: any[]) => mockUpdateOrderStatus(...args),
  attachOperatorNames: vi.fn(),
}));

const mockCancelUpsRegistration = vi.fn();
vi.mock('@/app/actions/operations/ups-labels', () => ({
  registerUpsOrder: vi.fn(),
  cancelUpsRegistration: (...args: any[]) => mockCancelUpsRegistration(...args),
  fetchAndIssueUpsLabel: vi.fn(),
  voidUpsLabel: vi.fn(),
}));

function makeSupabase() {
  const ordersChain: any = {};
  ordersChain.select = vi.fn().mockReturnThis();
  ordersChain.eq = vi.fn().mockReturnThis();
  ordersChain.single = vi.fn().mockResolvedValue({
    data: { id: 'order-288', order_no: 'ZEN-2026-000008', status: 'PACKED', transport_mode: 'UPS' },
    error: null,
  });
  ordersChain.then = (resolve: any, reject: any) =>
    Promise.resolve({
      data: { id: 'order-288', order_no: 'ZEN-2026-000008', status: 'PACKED', transport_mode: 'UPS' },
      error: null,
    }).then(resolve, reject);

  const supabase: any = {
    from: vi.fn(() => ordersChain),
  };
  return supabase;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateUserAction.mockResolvedValue({
    supabase: makeSupabase(),
    profile: { id: 'u1', role: 'ADMIN' },
    user: { id: 'u1' },
  });
  mockCancelUpsRegistration.mockResolvedValue({ success: true });
  mockUpdateOrderStatus.mockResolvedValue({ success: true });
});

describe('TASK-B-288: undoUpsRegistration → 오더 상세 페이지 revalidate (DEF-B-057)', () => {
  it('성공 시 orders/[orderId] revalidate 호출 + 기존 orders 목록 유지', async () => {
    const { undoUpsRegistration } = await import('@/app/actions/operations/warehouse');
    const result = await undoUpsRegistration('order-288');

    expect(result.success).toBe(true);
    expect(mockCancelUpsRegistration).toHaveBeenCalledWith('order-288');
    expect(mockUpdateOrderStatus).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/orders/[orderId]', 'page');
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/orders', 'page');
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/warehouse/ups-receive', 'page');
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/warehouse/outbound', 'page');
  });

  it('cancelUpsRegistration 실패 시 revalidate 미호출', async () => {
    mockCancelUpsRegistration.mockResolvedValue({ success: false, error: 'UPS 라벨 회수 실패' });
    const { undoUpsRegistration } = await import('@/app/actions/operations/warehouse');
    const result = await undoUpsRegistration('order-288');

    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
