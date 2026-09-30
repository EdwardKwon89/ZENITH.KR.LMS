import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getnewlabel } from '@/lib/shxk/order';
import { validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({
  SHXK_SHIPPER_NAME: 'SNTL',
  SHXK_SHIPPER_COUNTRY: 'KR',
}));
vi.mock('@/lib/shxk/order', () => ({
  createorder: vi.fn(),
  getnewlabel: vi.fn(),
  removeorder: vi.fn(),
}));
vi.mock('@/lib/ups/label-mapping', () => ({
  buildCreateOrderPayload: vi.fn().mockReturnValue({}),
  determineOrderCargotype: vi.fn().mockReturnValue({ cargotype: 'W', mailCargoType: '4' }),
  buildCargovolume: vi.fn().mockReturnValue([]),
  buildInvoiceFromItems: vi.fn().mockReturnValue([]),
  resolveShipperStreet: vi.fn().mockReturnValue(''),
}));
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

const ORDER_ID = '550e8400-e29b-41d4-a716-446655440000';
const LABEL_ID = '550e8400-e29b-41d4-a716-446655440001';
const REF_NO = 'ZEN-2026-000019';
const MOCK_PDF_URL = 'https://api-pdf.oss-cn-shenzhen.aliyuncs.com/test-label.pdf';
const MOCK_PDF_BUFFER = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

const MOCK_LABEL = {
  id: LABEL_ID,
  reference_no: REF_NO,
  tracking_number: '1Z999AA10123456784',
};

function makeBehavioralSupabase(options: {
  label?: typeof MOCK_LABEL | null;
  /** upload 호출 순서별 결과. null/미지정 = 성공. 배열 소진 후는 마지막 값 반복. */
  uploadErrorSequence?: Array<{ error: Record<string, unknown> | null }>;
  packageUpdateError?: { message: string } | null;
}) {
  let uploadCall = 0;
  const uploadMock = vi.fn().mockImplementation(async () => {
    const seq = options.uploadErrorSequence;
    if (!seq || seq.length === 0) return { error: null };
    const idx = Math.min(uploadCall, seq.length - 1);
    uploadCall += 1;
    return seq[idx];
  });

  const packageUpdates: Array<Record<string, unknown>> = [];
  const labelUpdates: Array<Record<string, unknown>> = [];
  const docInserts: Array<Record<string, unknown>> = [];

  const chains: Record<string, any> = {};

  function tableChain(table: string) {
    if (chains[table]) return chains[table];
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockImplementation(async (payload: Record<string, unknown>) => {
        if (table === 'zen_ups_label_documents') docInserts.push(payload);
        return { error: null };
      }),
      update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
        if (table === 'zen_order_packages') packageUpdates.push(payload);
        if (table === 'zen_ups_labels') labelUpdates.push(payload);
        return {
          eq: vi.fn().mockResolvedValue({ error: options.packageUpdateError ?? null }),
        };
      }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: options.label ?? null, error: null }),
      single: vi.fn().mockResolvedValue({ data: options.label ?? null, error: null }),
    };
    chain.then = (resolve: any, reject: any) =>
      Promise.resolve({ data: options.label ?? null, error: null }).then(resolve, reject);
    chains[table] = chain;
    return chain;
  }

  const supabase = {
    from: vi.fn((table: string) => tableChain(table)),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: uploadMock,
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed.test/ups-labels/label.pdf' },
        }),
      }),
    },
  };

  return { supabase, uploadMock, packageUpdates, labelUpdates, docInserts };
}

function mockPdfFetch() {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(MOCK_PDF_BUFFER.buffer),
  } as Response);
}

describe('DEF-B-148 / TASK-B-328: downloadAndStoreLabelDoc Storage 재시도 + 구조화 로깅', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPdfFetch();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('업로드 1회 실패 후 재시도에서 성공하면 signedUrl을 반환하고 upload를 2회 호출한다', async () => {
    const { downloadAndStoreLabelDoc } = await import('@/app/actions/operations/ups-labels');
    const { supabase, uploadMock } = makeBehavioralSupabase({
      uploadErrorSequence: [
        { error: { message: 'temporary network glitch', statusCode: 503 } },
        { error: null },
      ],
    });

    const result = await downloadAndStoreLabelDoc(
      supabase as any, ORDER_ID, REF_NO, LABEL_ID, '1', MOCK_PDF_URL,
    );

    expect(uploadMock).toHaveBeenCalledTimes(2);
    expect(result.signedUrl).toBe('https://signed.test/ups-labels/label.pdf');
    expect(result.docType).toBe('WAYBILL');
  });

  it('업로드 전건 실패 시 재시도 1회 후 throw하고, uploadError 객체 전체를 구조화 로깅한다', async () => {
    const { downloadAndStoreLabelDoc } = await import('@/app/actions/operations/ups-labels');
    const storageError = {
      message: '',
      statusCode: 413,
      error: 'Payload too large',
      hint: 'max size 50MB',
    };
    const { supabase, uploadMock } = makeBehavioralSupabase({
      uploadErrorSequence: [{ error: storageError }, { error: storageError }],
    });

    await expect(
      downloadAndStoreLabelDoc(supabase as any, ORDER_ID, REF_NO, LABEL_ID, '1', MOCK_PDF_URL),
    ).rejects.toThrow('PDF 업로드 실패');

    expect(uploadMock).toHaveBeenCalledTimes(2);

    const errorCalls = vi.mocked(logger.error).mock.calls.filter((call) =>
      String(call[0]).includes('downloadAndStoreLabelDoc'),
    );
    expect(errorCalls.length).toBeGreaterThanOrEqual(2);

    const firstPayload = errorCalls[0]?.[1] as Record<string, unknown>;
    expect(firstPayload).toMatchObject({
      orderId: ORDER_ID,
      referenceNo: REF_NO,
      attempt: 1,
    });
    const described = firstPayload.uploadError as Record<string, unknown>;
    expect(described).toMatchObject({
      statusCode: 413,
      error: 'Payload too large',
      hint: 'max size 50MB',
    });

    const retryPayload = errorCalls[1]?.[1] as Record<string, unknown>;
    expect(retryPayload).toMatchObject({ attempt: 2 });
  });

  it('uploadError.message가 빈 문자열이어도 에러 메시지에 객체 정보가 포함된다 (DEF-B-148 근본원인)', async () => {
    const { downloadAndStoreLabelDoc } = await import('@/app/actions/operations/ups-labels');
    const { supabase } = makeBehavioralSupabase({
      uploadErrorSequence: [
        { error: { message: '', statusCode: 500, error: 'internal storage failure' } },
        { error: { message: '', statusCode: 500, error: 'internal storage failure' } },
      ],
    });

    let caught: unknown;
    try {
      await downloadAndStoreLabelDoc(
        supabase as any, ORDER_ID, REF_NO, LABEL_ID, '1', MOCK_PDF_URL,
      );
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(Error);
    const message = (caught as Error).message;
    expect(message).toContain('PDF 업로드 실패');
    expect(message).not.toMatch(/PDF 업로드 실패:\s*$/);
    expect(message).toContain('statusCode');
    expect(message).toContain('internal storage failure');
  });
});

describe('DEF-B-148 / TASK-B-328: fetchAndIssueUpsLabel(docType 없음) 오류 구분 + 패키지 마킹', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPdfFetch();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: null,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getnewlabel 성공 + Storage 전건 실패 시: 정확한 메시지 반환 + markAllPackagesIssued 호출(③)', async () => {
    vi.mocked(getnewlabel).mockResolvedValue({
      success: 1,
      data: [{ lable_file: MOCK_PDF_URL, lable_content_type: '4' }],
      message: 'OK',
    } as any);

    const { supabase, uploadMock, packageUpdates } = makeBehavioralSupabase({
      label: MOCK_LABEL,
      uploadErrorSequence: [
        { error: { message: '', statusCode: 500, error: 'storage down' } },
        { error: { message: '', statusCode: 500, error: 'storage down' } },
        { error: { message: '', statusCode: 500, error: 'storage down' } },
        { error: { message: '', statusCode: 500, error: 'storage down' } },
      ],
    });
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: supabase as any,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    } as any);

    const { fetchAndIssueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const result = await fetchAndIssueUpsLabel(ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('배송 처리는 완료되었으나');
    expect(result.error).toContain('라벨 문서 저장에 실패했습니다');
    expect(result.error).not.toContain('getnewlabel');

    // ③: Storage 실패와 무관하게 패키지 마킹이 수행되어야 함
    expect(uploadMock).toHaveBeenCalled();
    expect(packageUpdates.length).toBeGreaterThan(0);
    expect(packageUpdates[0]).toMatchObject({
      intl_ref_no: MOCK_LABEL.tracking_number,
      intl_ref_locked: true,
    });
  });

  it('getnewlabel 자체 실패 시: 기존 메시지 유지 + markAllPackagesIssued 호출 안 함', async () => {
    vi.mocked(getnewlabel).mockResolvedValue({
      success: 0,
      data: null,
      message: 'SHXK getnewlabel error',
    } as any);

    const { supabase, packageUpdates } = makeBehavioralSupabase({
      label: MOCK_LABEL,
    });
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: supabase as any,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    } as any);

    const { fetchAndIssueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const result = await fetchAndIssueUpsLabel(ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('라벨 발급 실패 (getnewlabel)');
    expect(packageUpdates.length).toBe(0);
  });

  it('getnewlabel 성공 + Storage 성공 시: signed URL 반환 + 패키지 마킹 수행', async () => {
    vi.mocked(getnewlabel).mockResolvedValue({
      success: 1,
      data: [{ lable_file: MOCK_PDF_URL, lable_content_type: '4' }],
      message: 'OK',
    } as any);

    const { supabase, packageUpdates } = makeBehavioralSupabase({
      label: MOCK_LABEL,
      uploadErrorSequence: [{ error: null }],
    });
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: supabase as any,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    } as any);

    const { fetchAndIssueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const result = await fetchAndIssueUpsLabel(ORDER_ID);

    expect(result.success).toBe(true);
    expect(result.url).toBe('https://signed.test/ups-labels/label.pdf');
    expect(packageUpdates.length).toBeGreaterThan(0);
    expect(packageUpdates[0]).toMatchObject({
      intl_ref_no: MOCK_LABEL.tracking_number,
      intl_ref_locked: true,
    });
  });

  it('getnewlabel 실패 후 Storage 경로를 호출하지 않는다 (교차 검증)', async () => {
    vi.mocked(getnewlabel).mockResolvedValue({
      success: 0,
      data: null,
      message: 'quota',
    } as any);

    const { supabase, uploadMock } = makeBehavioralSupabase({
      label: MOCK_LABEL,
    });
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: supabase as any,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    } as any);

    const { fetchAndIssueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    await fetchAndIssueUpsLabel(ORDER_ID);

    expect(uploadMock).not.toHaveBeenCalled();
  });
});
