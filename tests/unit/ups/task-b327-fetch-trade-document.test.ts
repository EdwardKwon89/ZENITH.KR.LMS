import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// TASK-B-327 (Issue #1196 / DEF-B-147): fetchShxkTradeDocument() 성공 시 revalidatePath 미호출 버그.
// 실제 서버 액션을 호출해 문서 저장 후 revalidatePath('/(dashboard)/orders/[orderId]','page')가
// 호출되는지, 그리고 실패 시 호출되지 않는지 검증한다. (소스 문자열 검사 아님)

const holder = vi.hoisted(() => ({
  validateUserAction: vi.fn(),
  getnewlabel: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: holder.validateUserAction,
}));
vi.mock('@/lib/shxk/order', () => ({
  createorder: vi.fn(),
  getnewlabel: holder.getnewlabel,
  removeorder: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

function makeSupabase() {
  const labelChain: any = {};
  ['select', 'eq', 'order', 'limit'].forEach((m) => {
    labelChain[m] = vi.fn(() => labelChain);
  });
  labelChain.maybeSingle = vi.fn().mockResolvedValue({
    data: { id: 'label-1', reference_no: 'ZEN-2026-000007', tracking_number: null },
    error: null,
  });

  const docInsert = vi.fn().mockResolvedValue({ error: null });

  return {
    from: vi.fn((table: string) => {
      if (table === 'zen_ups_labels') return labelChain;
      if (table === 'zen_ups_label_documents') return { insert: docInsert };
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed/doc.pdf' } }),
      })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  holder.validateUserAction.mockResolvedValue({
    supabase: makeSupabase(),
    profile: { id: 'u1', role: 'ADMIN', org_id: 'o1' },
  });
  holder.getnewlabel.mockResolvedValue({
    success: 1,
    data: [{ lable_file: 'https://api-pdf.example/doc.pdf', lable_content_type: '3' }],
    message: '',
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TASK-B-327: fetchShxkTradeDocument revalidatePath (DEF-B-147)', () => {
  it('문서 저장 성공 시 revalidatePath(orders/[orderId])를 호출한다', async () => {
    const { fetchShxkTradeDocument } = await import('@/app/actions/operations/ups-labels');
    const { revalidatePath } = await import('next/cache');

    const res = await fetchShxkTradeDocument('order-1', 'INVOICE');

    expect(res.success).toBe(true);
    expect(res.url).toBe('https://signed/doc.pdf');
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/orders/[orderId]', 'page');
  });

  it('SHXK getnewlabel 실패 시 success=false 이고 revalidatePath 는 호출되지 않는다', async () => {
    holder.getnewlabel.mockResolvedValue({ success: 0, data: null, message: '未找到订单信息' });
    const { fetchShxkTradeDocument } = await import('@/app/actions/operations/ups-labels');
    const { revalidatePath } = await import('next/cache');

    const res = await fetchShxkTradeDocument('order-1', 'INVOICE');

    expect(res.success).toBe(false);
    expect(res.error).toBe('未找到订单信息');
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
