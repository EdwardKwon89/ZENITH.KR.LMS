import { describe, it, expect, vi, beforeEach } from 'vitest';
import { removeorder } from '@/lib/shxk/order';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/shxk/order', () => ({ createorder: vi.fn(), getnewlabel: vi.fn(), removeorder: vi.fn() }));
vi.mock('@/lib/ups/label-mapping', () => ({
  buildCreateOrderPayload: vi.fn().mockReturnValue({}),
  determineOrderCargotype: vi.fn().mockReturnValue({ cargotype: 'W', mailCargoType: '4' }),
  buildCargovolume: vi.fn().mockReturnValue([]),
  buildInvoiceFromItems: vi.fn().mockReturnValue([]),
}));

const mockValidateUserAction = vi.fn();
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: (...args: any[]) => mockValidateUserAction(...args),
}));

function makeChain(responseData: any = null) {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.select = vi.fn().mockReturnThis();
  chain.insert = vi.fn().mockReturnThis();
  chain.update = vi.fn().mockReturnThis();
  chain.delete = vi.fn().mockReturnThis();
  chain.eq = vi.fn().mockReturnThis();
  chain.is = vi.fn().mockReturnThis();
  chain.in = vi.fn().mockReturnThis();
  chain.order = vi.fn().mockReturnThis();
  chain.limit = vi.fn().mockReturnThis();
  chain.single = vi.fn().mockResolvedValue({ data: responseData, error: null });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: responseData, error: null });
  chain.then = (resolve: any, reject: any) =>
    Promise.resolve({ data: responseData, error: null }).then(resolve, reject);
  chain.storage = {
    from: vi.fn(() => ({
      remove: vi.fn().mockResolvedValue({ error: null }),
    })),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateUserAction.mockResolvedValue({
    supabase: makeChain(),
    profile: { id: 'admin-user', role: 'ADMIN' },
  });
});

describe('TASK-B-211: removeorder 실패 시 즉시 return', () => {
  it('cancelUpsRegistration — removeorder 실패 시 삭제 미수행, failure 반환', async () => {
    const supabase = makeChain([
      { id: 'lbl-1', reference_no: 'REF-001', tracking_number: 'TRK-001' },
    ]);
    const docsChain = makeChain([]);
    supabase.from.mockImplementation((table: string) => {
      if (table === 'zen_ups_label_documents') return docsChain;
      return supabase;
    });

    mockValidateUserAction.mockResolvedValue({ supabase, profile: { id: 'u1', role: 'ADMIN' } });
    (removeorder as any).mockResolvedValue({ success: 0, message: 'UPS rejected cancellation' });

    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const result = await cancelUpsRegistration('order-123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('UPS 라벨 회수 실패(SHXK)');
    expect(result.error).toContain('UPS rejected cancellation');
    expect(removeorder).toHaveBeenCalledWith('REF001');
    expect(docsChain.delete).not.toHaveBeenCalled();
    expect(supabase.delete).not.toHaveBeenCalled();
  });

  it('voidUpsLabel — removeorder 실패 시 void/unlock 미수행, failure 반환', async () => {
    const supabase = makeChain(null);
    supabase.maybeSingle.mockResolvedValue({
      data: { id: 'lbl-2', reference_no: 'REF-002', tracking_number: 'TRK-002' },
      error: null,
    });

    mockValidateUserAction.mockResolvedValue({ supabase, profile: { id: 'u1', role: 'ADMIN' } });
    (removeorder as any).mockResolvedValue({ success: 0, message: 'UPS rejected void' });

    const { voidUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const result = await voidUpsLabel('order-456');

    expect(result.success).toBe(false);
    expect(result.error).toContain('UPS 라벨 회수 실패(SHXK)');
    expect(result.error).toContain('UPS rejected void');
    expect(removeorder).toHaveBeenCalledWith('REF002');
    expect(supabase.update).not.toHaveBeenCalled();
    const pkgCalls = supabase.from.mock.calls.filter(
      (c: any[]) => c[0] === 'zen_order_packages'
    );
    expect(pkgCalls.length).toBe(0);
  });

  it('cancelUpsRegistration — removeorder 성공 시 정상 삭제 진행 (회귀)', async () => {
    const supabase = makeChain([
      { id: 'lbl-3', reference_no: 'REF-003', tracking_number: 'TRK-003' },
    ]);
    const docsChain = makeChain([{ id: 'doc-1', storage_path: '/path/doc1.pdf' }]);
    supabase.from.mockImplementation((table: string) => {
      if (table === 'zen_ups_label_documents') return docsChain;
      return supabase;
    });

    mockValidateUserAction.mockResolvedValue({ supabase, profile: { id: 'u1', role: 'ADMIN' } });
    (removeorder as any).mockResolvedValue({ success: 1, message: 'ok' });

    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const result = await cancelUpsRegistration('order-789');

    expect(result.success).toBe(true);
    expect(removeorder).toHaveBeenCalledWith('REF003');
    expect(docsChain.delete).toHaveBeenCalled();
    expect(supabase.delete).toHaveBeenCalled();
  });
});

describe('TASK-B-217: 성공 시 tracking_no 리셋', () => {
  it('cancelUpsRegistration — removeorder 성공 후 tracking_no = null UPDATE 호출', async () => {
    const trackingChain = makeChain(null);
    const supabase = makeChain([
      { id: 'lbl-4', reference_no: 'REF-004', tracking_number: 'TRK-004' },
    ]);
    supabase.from.mockImplementation((table: string) => {
      if (table === 'zen_tracking_configs') return trackingChain;
      return supabase;
    });

    mockValidateUserAction.mockResolvedValue({ supabase, profile: { id: 'u1', role: 'ADMIN' } });
    (removeorder as any).mockResolvedValue({ success: 1, message: 'ok' });

    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const result = await cancelUpsRegistration('order-reset-1');

    expect(result.success).toBe(true);
    // zen_tracking_configs UPDATE가 {tracking_no: null}로 호출되었는지 검증
    expect(trackingChain.update).toHaveBeenCalledWith({ tracking_no: null });
    expect(trackingChain.eq).toHaveBeenCalledWith('order_id', 'order-reset-1');
  });

  it('voidUpsLabel — removeorder 성공 후 tracking_no = null UPDATE 호출', async () => {
    const trackingChain = makeChain(null);
    const supabase = makeChain(null);
    supabase.maybeSingle.mockResolvedValue({
      data: { id: 'lbl-5', reference_no: 'REF-005', tracking_number: 'TRK-005' },
      error: null,
    });
    supabase.from.mockImplementation((table: string) => {
      if (table === 'zen_tracking_configs') return trackingChain;
      return supabase;
    });

    mockValidateUserAction.mockResolvedValue({ supabase, profile: { id: 'u1', role: 'ADMIN' } });
    (removeorder as any).mockResolvedValue({ success: 1, message: 'ok' });

    const { voidUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const result = await voidUpsLabel('order-reset-2');

    expect(result.success).toBe(true);
    // zen_tracking_configs UPDATE가 {tracking_no: null}로 호출되었는지 검증
    expect(trackingChain.update).toHaveBeenCalledWith({ tracking_no: null });
    expect(trackingChain.eq).toHaveBeenCalledWith('order_id', 'order-reset-2');
  });
});
