import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn().mockResolvedValue({
    supabase: null,
    profile: { id: 'user-1', role: 'ADMIN' },
  }),
}));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/shxk/order', () => ({
  createorder: vi.fn(),
  getnewlabel: vi.fn(),
  removeorder: vi.fn(),
}));
vi.mock('@/lib/ups/label-mapping', () => ({
  buildCreateOrderPayload: vi.fn().mockReturnValue({}),
}));

import { downloadAndStoreLabelDoc } from '@/app/actions/operations/ups-labels';

const ORDER_ID = '550e8400-e29b-41d4-a716-446655440000';
const LABEL_ID = '550e8400-e29b-41d4-a716-446655440001';
const REF_NO = 'ZEN-2026-000001';
const MOCK_URL = 'https://api-pdf.oss-cn-shenzhen.aliyuncs.com/test-label.pdf';
const MOCK_PDF_BUFFER = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

let uploadMock: ReturnType<typeof vi.fn>;
let insertMock: ReturnType<typeof vi.fn>;
let createSignedUrlMock: ReturnType<typeof vi.fn>;

function makeSupabase() {
  uploadMock = vi.fn().mockResolvedValue({ error: null });
  insertMock = vi.fn().mockResolvedValue({ error: null });
  createSignedUrlMock = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.test/ups-labels/550e8400-waybill-abc12345.pdf' } });

  return {
    from: vi.fn().mockReturnValue({
      insert: insertMock,
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: uploadMock,
        createSignedUrl: createSignedUrlMock,
      }),
    },
  } as any;
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(MOCK_PDF_BUFFER.buffer),
  } as Response);
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('downloadAndStoreLabelDoc', () => {
  it('SHXK URL에서 PDF를 다운로드하고 Supabase Storage에 업로드한다', async () => {
    const supabase = makeSupabase();
    const result = await downloadAndStoreLabelDoc(
      supabase, ORDER_ID, REF_NO, LABEL_ID, '1', MOCK_URL,
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(MOCK_URL);
    expect(supabase.storage.from).toHaveBeenCalledWith('invoices');
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringContaining('ups-labels/'),
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'application/pdf' }),
    );
    expect(insertMock).toHaveBeenCalled();
    expect(result.signedUrl).toBeTruthy();
    expect(result.docType).toBe('WAYBILL');
  });

  it('zen_ups_label_documents에正确的メタデータを挿入する', async () => {
    const supabase = makeSupabase();
    await downloadAndStoreLabelDoc(
      supabase, ORDER_ID, REF_NO, LABEL_ID, '2', MOCK_URL,
    );

    const insertCall = insertMock.mock.calls[0]?.[0] ?? insertMock.mock.calls[0];
    expect(insertCall).toMatchObject({
      order_id: ORDER_ID,
      label_id: LABEL_ID,
      reference_no: REF_NO,
      content_type: '2',
      doc_type: 'CUSTOMS',
    });
  });

  it('content_type "1"はWAYBILLとして保存される', async () => {
    const supabase = makeSupabase();
    const result = await downloadAndStoreLabelDoc(
      supabase, ORDER_ID, REF_NO, LABEL_ID, '1', MOCK_URL,
    );
    expect(result.docType).toBe('WAYBILL');
  });

  it('content_type "3"はINVOICEとして保存される', async () => {
    const supabase = makeSupabase();
    const result = await downloadAndStoreLabelDoc(
      supabase, ORDER_ID, REF_NO, LABEL_ID, '3', MOCK_URL,
    );
    expect(result.docType).toBe('INVOICE');
  });

  it('content_type "6"はCOMBINEDとして保存される', async () => {
    const supabase = makeSupabase();
    const result = await downloadAndStoreLabelDoc(
      supabase, ORDER_ID, REF_NO, LABEL_ID, '6', MOCK_URL,
    );
    expect(result.docType).toBe('COMBINED');
  });

  it('fetch 실패 시 에러를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);
    const supabase = makeSupabase();
    await expect(
      downloadAndStoreLabelDoc(supabase, ORDER_ID, REF_NO, LABEL_ID, '1', MOCK_URL),
    ).rejects.toThrow('PDF 다운로드 실패');
  });

  it('Storage 업로드 실패 시 에러를 던진다', async () => {
    const supabase = makeSupabase();
    uploadMock.mockResolvedValue({ error: { message: 'quota exceeded' } });
    await expect(
      downloadAndStoreLabelDoc(supabase, ORDER_ID, REF_NO, LABEL_ID, '1', MOCK_URL),
    ).rejects.toThrow('PDF 업로드 실패');
  });

  it('DB insert 실패 시 에러를 던진다', async () => {
    const supabase = makeSupabase();
    insertMock.mockResolvedValue({ error: { message: 'RLS violation' } });
    await expect(
      downloadAndStoreLabelDoc(supabase, ORDER_ID, REF_NO, LABEL_ID, '1', MOCK_URL),
    ).rejects.toThrow('문서 메타데이터 저장 실패');
  });
});
