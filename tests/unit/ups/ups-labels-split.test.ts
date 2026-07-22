import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createorder, getnewlabel, removeorder } from '@/lib/shxk/order';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/shxk/order', () => ({ createorder: vi.fn(), getnewlabel: vi.fn(), removeorder: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn().mockResolvedValue({
    supabase: null,
    profile: { id: 'test', role: 'ADMIN' },
  }),
}));
vi.mock('@/utils/supabase/server', () => ({ createAdminClient: vi.fn(), createClient: vi.fn() }));
vi.mock('@/lib/ups/label-mapping', () => ({
  buildCreateOrderPayload: vi.fn().mockReturnValue({ reference_no: 'TEST001', shipper: {}, consignee: {}, cargovolume: [], invoice: [] }),
  determineOrderCargotype: vi.fn().mockReturnValue({ cargotype: 'W', mailCargoType: '4' }),
  buildCargovolume: vi.fn().mockReturnValue([]),
  buildInvoiceFromItems: vi.fn().mockReturnValue([]),
  resolveShipperStreet: vi.fn().mockReturnValue(''),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const ORDER_ID = 'order-uuid-001';
const REF_NO = 'ZEN-2026-000001';
const STRIPPED_REF = 'ZEN2026000001';

function makeChain(result: any) {
  const chain: any = {};
  const methods = ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete', 'is', 'in'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

function makeSupabase(tableResults: Record<string, any>) {
  return {
    from: vi.fn((table: string) => {
      const result = tableResults[table];
      if (!result) return makeChain({ data: null, error: null });
      if (typeof result === 'function') return makeChain(result());
      return makeChain(result);
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.test/label.pdf' } }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer),
  } as Response);
  vi.mocked(createorder).mockResolvedValue({ success: 1, data: { order_id: 'shxk-order-1', shipping_method_no: 'TK123', refrence_no: REF_NO }, message: 'OK' });
  vi.mocked(getnewlabel).mockResolvedValue({ success: 1, data: [{ lable_file: 'https://test.example.com/label', lable_content_type: '1' }], message: 'OK' });
  vi.mocked(removeorder).mockResolvedValue({ success: 1, message: 'OK' });
});

describe('TASK-B-167: registerUpsOrder', () => {
  it('createorder를 호출하고 saveInitialLabel까지 수행한다', async () => {
    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const order = { id: ORDER_ID, order_no: REF_NO, recipient_country_code: 'US', ups_product_code: 'WPX', incoterms: 'DDP', dest_port_id: null };
    const supabase = makeSupabase({
      zen_orders: { data: order, error: null },
      zen_order_packages: { data: [{ id: 'pkg-1', items: [] }], error: null },
      zen_ups_labels: { data: null, error: null },
      zen_ups_shxk_country_map: { data: { shxk_code: 'SHP-CODE' }, error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    const result = await registerUpsOrder(ORDER_ID);

    expect(result.success).toBe(true);
    expect(result.data?.reference_no).toBe(REF_NO);
    expect(createorder).toHaveBeenCalled();
  });

  it('createorder 실패 시 zen_ups_label_errors에 기록한다', async () => {
    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    vi.mocked(createorder).mockResolvedValue({ success: 0, data: null, message: 'duplicate' });
    const order = { id: ORDER_ID, order_no: REF_NO, recipient_country_code: 'US', ups_product_code: 'WPX', incoterms: 'DDP', dest_port_id: null };
    const supabase = makeSupabase({
      zen_orders: { data: order, error: null },
      zen_order_packages: { data: [{ id: 'pkg-1', items: [] }], error: null },
      zen_ups_label_errors: { data: null, error: null },
      zen_ups_shxk_country_map: { data: { shxk_code: 'SHP-CODE' }, error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    const result = await registerUpsOrder(ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('createorder failed');
  });

  it('getnewlabel을 호출하지 않는다', async () => {
    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const order = { id: ORDER_ID, order_no: REF_NO, recipient_country_code: 'US', ups_product_code: 'WPX', incoterms: 'DDP', dest_port_id: null };
    const supabase = makeSupabase({
      zen_orders: { data: order, error: null },
      zen_order_packages: { data: [{ id: 'pkg-1', items: [] }], error: null },
      zen_ups_labels: { data: null, error: null },
      zen_ups_shxk_country_map: { data: { shxk_code: 'SHP-CODE' }, error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    await registerUpsOrder(ORDER_ID);

    expect(getnewlabel).not.toHaveBeenCalled();
  });
});

describe('TASK-B-167: fetchAndIssueUpsLabel', () => {
  it('getnewlabel을 호출하고 signed URL을 반환한다', async () => {
    const { fetchAndIssueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const supabase = makeSupabase({
      zen_ups_labels: { data: { id: 'lbl-1', reference_no: REF_NO, tracking_number: 'TK123' }, error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    const result = await fetchAndIssueUpsLabel(ORDER_ID);

    expect(result.success).toBe(true);
    expect(result.url).toBeTruthy();
    expect(getnewlabel).toHaveBeenCalledWith(
      expect.objectContaining({ lable_content_type: '4' }),
      [{ reference_no: STRIPPED_REF }],
    );
  });

  it('docType 지정 시 해당 content_type으로 getnewlabel을 호출한다', async () => {
    const { fetchAndIssueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const supabase = makeSupabase({
      zen_ups_labels: { data: { id: 'lbl-2', reference_no: REF_NO, tracking_number: 'TK123' }, error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    const result = await fetchAndIssueUpsLabel(ORDER_ID, 'WAYBILL');

    expect(result.success).toBe(true);
    expect(result.url).toBeTruthy();
    expect(getnewlabel).toHaveBeenCalledWith(
      expect.objectContaining({ lable_content_type: '1' }),
      [{ reference_no: STRIPPED_REF }],
    );
  });

  it('라벨 레코드가 없으면 에러를 반환한다', async () => {
    const { fetchAndIssueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const supabase = makeSupabase({
      zen_ups_labels: { data: null, error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    const result = await fetchAndIssueUpsLabel(ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('라벨이 없습니다');
  });
});

describe('TASK-B-167: cancelUpsRegistration', () => {
  it('removeorder를 호출하고 해당 오더의 전체 라벨을 삭제한다', async () => {
    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const supabase = makeSupabase({
      zen_ups_labels: { data: [{ id: 'lbl-cancel-1', reference_no: REF_NO, tracking_number: 'TK123' }], error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    const result = await cancelUpsRegistration(ORDER_ID);

    expect(result.success).toBe(true);
    expect(removeorder).toHaveBeenCalledWith(STRIPPED_REF);
  });

  it('라벨 레코드가 없으면 에러를 반환한다', async () => {
    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const supabase = makeSupabase({
      zen_ups_labels: { data: [], error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    const result = await cancelUpsRegistration(ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('라벨 레코드가 없습니다');
  });

  it('removeorder 실패 시에도 로깅 후 계속 진행한다', async () => {
    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    vi.mocked(removeorder).mockResolvedValue({ success: 0, message: 'API error' });
    const supabase = makeSupabase({
      zen_ups_labels: { data: [{ id: 'lbl-cancel-2', reference_no: REF_NO, tracking_number: 'TK123' }], error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    const result = await cancelUpsRegistration(ORDER_ID);

    expect(result.success).toBe(true);
    expect(removeorder).toHaveBeenCalled();
  });

  it('다중 라벨(패키지 3건) 시 오더의 전체 라벨을 삭제한다', async () => {
    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const labels = [
      { id: 'lbl-1', reference_no: REF_NO, tracking_number: 'TK001' },
      { id: 'lbl-2', reference_no: REF_NO, tracking_number: 'TK002' },
      { id: 'lbl-3', reference_no: REF_NO, tracking_number: 'TK003' },
    ];
    const supabase = makeSupabase({
      zen_ups_labels: { data: labels, error: null },
      zen_ups_label_documents: { data: [{ id: 'doc-1', storage_path: 'ups-labels/test/order-1/waybill.pdf' }], error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    const result = await cancelUpsRegistration(ORDER_ID);

    expect(result.success).toBe(true);
    expect(removeorder).toHaveBeenCalledWith(STRIPPED_REF);
    expect(supabase.from).toHaveBeenCalledWith('zen_ups_labels');
  });

  it('문서가 존재하면 Storage 파일과 label_documents를 삭제한다', async () => {
    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const supabase = makeSupabase({
      zen_ups_labels: { data: [{ id: 'lbl-1', reference_no: REF_NO, tracking_number: 'TK001' }], error: null },
      zen_ups_label_documents: { data: [{ id: 'doc-1', storage_path: 'ups-labels/test/doc.pdf' }, { id: 'doc-2', storage_path: 'ups-labels/test/doc2.pdf' }], error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    const result = await cancelUpsRegistration(ORDER_ID);

    expect(result.success).toBe(true);
    expect(supabase.storage.from).toHaveBeenCalledWith('invoices');
    const storageMock = supabase.storage.from('invoices');
    expect(storageMock.remove).toHaveBeenCalledWith(['ups-labels/test/doc.pdf', 'ups-labels/test/doc2.pdf']);
  });

  it('문서가 없으면 Storage 삭제를 건너뛴다', async () => {
    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const supabase = makeSupabase({
      zen_ups_labels: { data: [{ id: 'lbl-1', reference_no: REF_NO, tracking_number: 'TK001' }], error: null },
      zen_ups_label_documents: { data: [], error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    const result = await cancelUpsRegistration(ORDER_ID);

    expect(result.success).toBe(true);
    expect(supabase.storage.from('invoices').remove).not.toHaveBeenCalled();
  });

  it('Storage 삭제 실패 시 로깅 후 계속 진행한다', async () => {
    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const storageRemoveMock = vi.fn().mockResolvedValue({ error: { message: 'Storage error' } });
    const supabase = makeSupabase({
      zen_ups_labels: { data: [{ id: 'lbl-1', reference_no: REF_NO, tracking_number: 'TK001' }], error: null },
      zen_ups_label_documents: { data: [{ id: 'doc-1', storage_path: 'ups-labels/test/doc.pdf' }], error: null },
    });
    supabase.storage.from = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.test/label.pdf' } }),
      remove: storageRemoveMock,
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);

    const result = await cancelUpsRegistration(ORDER_ID);

    expect(result.success).toBe(true);
    expect(storageRemoveMock).toHaveBeenCalled();
  });
});

describe('TASK-B-167: issueUpsLabel() wrapper', () => {
  it('fetchAndIssueUpsLabel 실패 시 success: false를 반환한다', async () => {
    const { issueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const order = { id: ORDER_ID, order_no: REF_NO, recipient_country_code: 'US', ups_product_code: 'WPX', incoterms: 'DDP', dest_port_id: null };
    const supabase = makeSupabase({
      zen_orders: { data: order, error: null },
      zen_order_packages: { data: [{ id: 'pkg-1', items: [] }], error: null },
      zen_ups_labels: { data: { id: 'lbl-1', reference_no: REF_NO, tracking_number: 'TK123' }, error: null },
      zen_ups_shxk_country_map: { data: { shxk_code: 'SHP-CODE' }, error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({ supabase: supabase as any, profile: { id: 'test', role: 'ADMIN' } } as any);
    vi.mocked(createorder).mockResolvedValue({ success: 1, data: { order_id: 'shxk-order-1', shipping_method_no: 'TK123', refrence_no: REF_NO }, message: 'OK' });
    vi.mocked(getnewlabel).mockResolvedValue({ success: 0, data: null, message: 'getnewlabel API error' });

    const result = await issueUpsLabel(ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('라벨 발급 실패');
  });
});
