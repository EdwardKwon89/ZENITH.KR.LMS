import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { removeorder } from '@/lib/shxk/order';

// TASK-B-288 (Issue #1077 / DEF-B-057): 라벨 상태를 바꾸는 서버 액션이
// 오더 상세 동적 페이지 `/(dashboard)/orders/[orderId]`도 revalidate 하는지 검증.
//
// - cancelUpsRegistration(): revalidatePath('/(dashboard)/orders/[orderId]', 'page') 호출
// - voidUpsLabel(): 동일
// - 기존 `/(dashboard)/warehouse/outbound` revalidate 유지 (회귀 방지)

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/shxk/order', () => ({ createorder: vi.fn(), getnewlabel: vi.fn(), removeorder: vi.fn() }));

const mockValidateUserAction = vi.fn();
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: (...args: any[]) => mockValidateUserAction(...args),
}));

function tableChain(data: any) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnThis();
  chain.insert = vi.fn().mockReturnThis();
  chain.update = vi.fn().mockReturnThis();
  chain.delete = vi.fn().mockReturnThis();
  chain.eq = vi.fn().mockReturnThis();
  chain.is = vi.fn().mockReturnThis();
  chain.in = vi.fn().mockReturnThis();
  chain.order = vi.fn().mockReturnThis();
  chain.limit = vi.fn().mockReturnThis();
  chain.single = vi.fn().mockResolvedValue({ data, error: null });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  chain.then = (resolve: any, reject: any) =>
    Promise.resolve({ data, error: null }).then(resolve, reject);
  return chain;
}

function makeSupabase() {
  const tables: Record<string, any> = {
    // voidUpsLabel의 fetchActiveLabelByOrder는 .limit(1).maybeSingle()로 단일 레코드 반환
    zen_ups_labels: (() => {
      const chain = tableChain([{ id: 'lbl-1', reference_no: 'REF-001', tracking_number: 'TRK-001' }]);
      chain.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'lbl-1', reference_no: 'REF-001', tracking_number: 'TRK-001' },
        error: null,
      });
      return chain;
    })(),
    zen_ups_label_documents: tableChain([]),
    zen_order_packages: tableChain(null),
    zen_tracking_configs: tableChain(null),
  };
  const supabase: any = {
    from: vi.fn((table: string) => tables[table] || tableChain(null)),
  };
  supabase.storage = {
    from: vi.fn(() => ({ remove: vi.fn().mockResolvedValue({ error: null }) })),
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
  (removeorder as any).mockResolvedValue({ success: 1, message: 'ok' });
});

describe('TASK-B-288: 라벨 상태 변경 액션 → 오더 상세 페이지 revalidate (DEF-B-057)', () => {
  it('cancelUpsRegistration — 성공 시 orders/[orderId] + outbound revalidate 호출', async () => {
    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const result = await cancelUpsRegistration('order-123');

    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/orders/[orderId]', 'page');
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/warehouse/outbound', 'page');
  });

  it('cancelUpsRegistration — revalidatePath가 outbound revalidate를 계속 유지 (회귀 방지)', async () => {
    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    await cancelUpsRegistration('order-123');

    const calls = (revalidatePath as any).mock.calls;
    expect(calls.some((c: any[]) => c[0] === '/(dashboard)/warehouse/outbound')).toBe(true);
  });

  it('voidUpsLabel — 성공 시 orders/[orderId] + outbound revalidate 호출', async () => {
    const { voidUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const result = await voidUpsLabel('order-456');

    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/orders/[orderId]', 'page');
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/warehouse/outbound', 'page');
  });

  it('cancelUpsRegistration — removeorder 실패 시 revalidate 미호출', async () => {
    (removeorder as any).mockResolvedValue({ success: 0, message: 'UPS rejected' });
    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const result = await cancelUpsRegistration('order-123');

    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
