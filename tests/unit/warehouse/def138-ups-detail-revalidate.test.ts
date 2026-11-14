import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';

// TASK-1145 (Issue #1212 / DEF-138): UPS 등록 확정·취소 서버 액션이
// 오더 상세 동적 페이지 `/(dashboard)/orders/[orderId]/ups-detail`도
// revalidate하는지 검증 (DEF-B-057 동일 유형 재발 방지).
//
// - confirmUpsRegistration(): ups-detail 포함 5개 경로 호출
// - undoUpsRegistration(): ups-detail 포함 5개 경로 호출
// - 기존 4개 경로 유지 (회귀 방지)

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockValidateUserAction = vi.fn();
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: (...args: any[]) => mockValidateUserAction(...args),
}));

const mockFindById = vi.fn();
vi.mock('@/lib/repositories', () => ({
  OrderRepository: vi.fn(function (this: any) {
    return {
      findById: (...args: any[]) => mockFindById(...args),
    };
  }),
}));

const mockUpdateOrderStatus = vi.fn();
vi.mock('@/app/actions/operations/orders', () => ({
  updateOrderStatus: (...args: any[]) => mockUpdateOrderStatus(...args),
  attachOperatorNames: vi.fn(),
}));

const mockRegisterUpsOrder = vi.fn();
const mockCancelUpsRegistration = vi.fn();
vi.mock('@/app/actions/operations/ups-labels', () => ({
  registerUpsOrder: (...args: any[]) => mockRegisterUpsOrder(...args),
  cancelUpsRegistration: (...args: any[]) => mockCancelUpsRegistration(...args),
  fetchAndIssueUpsLabel: vi.fn(),
  voidUpsLabel: vi.fn(),
}));

const WAREHOUSED_ORDER = { id: 'order-1', status: 'WAREHOUSED', shipper_id: 'org-1' };
const PACKED_ORDER = { id: 'order-1', status: 'PACKED', shipper_id: 'org-1' };

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateUserAction.mockResolvedValue({
    supabase: {},
    profile: { id: 'u1', role: 'ADMIN' },
    user: { id: 'u1' },
  });
  mockUpdateOrderStatus.mockResolvedValue({ success: true });
  mockRegisterUpsOrder.mockResolvedValue({
    success: true,
    data: { shxk_order_id: 'S1', tracking_number: 'T1', reference_no: 'R1' },
  });
  mockCancelUpsRegistration.mockResolvedValue({ success: true });
});

describe('TASK-1145: UPS 등록 확정·취소 → ups-detail revalidate (DEF-138)', () => {
  it('TC-UPSRV-01: [Success] confirmUpsRegistration 성공 시 ups-detail 포함 revalidate 호출', async () => {
    // Given
    mockFindById.mockResolvedValue({ data: WAREHOUSED_ORDER, error: null });
    const { confirmUpsRegistration } = await import('@/app/actions/operations/warehouse');

    // When — 실제 서버 액션 호출
    const result = await confirmUpsRegistration('order-1');

    // Then
    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/orders/[orderId]/ups-detail', 'page');
  });

  it('TC-UPSRV-02: [Guard] confirmUpsRegistration 기존 4개 경로 유지 (회귀 방지)', async () => {
    // Given
    mockFindById.mockResolvedValue({ data: WAREHOUSED_ORDER, error: null });
    const { confirmUpsRegistration } = await import('@/app/actions/operations/warehouse');

    // When
    await confirmUpsRegistration('order-1');

    // Then
    const calls = (revalidatePath as any).mock.calls;
    expect(calls.some((c: any[]) => c[0] === '/(dashboard)/warehouse/ups-receive')).toBe(true);
    expect(calls.some((c: any[]) => c[0] === '/(dashboard)/warehouse/outbound')).toBe(true);
    expect(calls.some((c: any[]) => c[0] === '/(dashboard)/orders')).toBe(true);
    expect(calls.some((c: any[]) => c[0] === '/(dashboard)/orders/[orderId]')).toBe(true);
  });

  it('TC-UPSRV-03: [Success] undoUpsRegistration 성공 시 ups-detail 포함 revalidate 호출', async () => {
    // Given
    mockFindById.mockResolvedValue({ data: PACKED_ORDER, error: null });
    const { undoUpsRegistration } = await import('@/app/actions/operations/warehouse');

    // When — 실제 서버 액션 호출
    const result = await undoUpsRegistration('order-1');

    // Then
    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/orders/[orderId]/ups-detail', 'page');
  });

  it('TC-UPSRV-04: [Guard] 등록 실패 시 revalidate 미호출', async () => {
    // Given — UPS 등록 실패
    mockFindById.mockResolvedValue({ data: WAREHOUSED_ORDER, error: null });
    mockRegisterUpsOrder.mockResolvedValueOnce({ success: false, error: 'UPS rejected' });
    const { confirmUpsRegistration } = await import('@/app/actions/operations/warehouse');

    // When
    const result = await confirmUpsRegistration('order-1');

    // Then
    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
