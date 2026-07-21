import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ShxkBaseResponse } from '@/types/ups-api';

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));
const mockCreateAdminClient = vi.fn(() => Promise.resolve({ from: mockFrom }));
const mockLoggerError = vi.fn();
const mockFetch = vi.fn();

vi.mock('@/utils/supabase/server', () => ({ createAdminClient: mockCreateAdminClient }));
vi.mock('@/lib/logger', () => ({ logger: { error: mockLoggerError } }));
vi.mock('./config', () => ({
  SHXK_ENDPOINT: 'https://mock-shxk.test/api',
  SHXK_APP_KEY: 'test-key',
  SHXK_APP_TOKEN: 'test-token',
}));

async function callShxk(
  method: string,
  params?: Record<string, unknown>,
): Promise<ShxkBaseResponse> {
  const mod = await import('@/lib/shxk/client');
  return mod.callShxk(method as any, params);
}

describe('SHXK API 로깅 (Issue #661)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockCreateAdminClient.mockResolvedValue({ from: mockFrom } as any);
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).fetch;
  });

  // ─────────────────────────
  // Mock 모드
  // ─────────────────────────

  it('TC-SHXK-01: mock 모드 → mock 응답 반환 + 로그 insert 호출', async () => {
    vi.stubEnv('SHXK_TEST_MOCK', 'true');

    const result = await callShxk('createorder', { reference_no: 'REF-001' });

    expect(result.success).toBe(1);
    expect((result.data as Record<string, unknown>)?.refrence_no).toBe('REF-001');

    expect(mockCreateAdminClient).toHaveBeenCalledOnce();
    expect(mockFrom).toHaveBeenCalledWith('zen_shxk_api_logs');
    expect(mockInsert).toHaveBeenCalledOnce();

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.method).toBe('createorder');
    expect(insertArg.reference_no).toBe('REF-001');
    expect(insertArg.success).toBe(true);
    expect(insertArg.is_mock).toBe(true);

    vi.unstubAllEnvs();
  });

  it('TC-SHXK-02: mock 모드 + listorder reference_no 추출', async () => {
    vi.stubEnv('SHXK_TEST_MOCK', 'true');

    await callShxk('removeorder', {
      listorder: [{ reference_no: 'LIST-REF-001' }],
    });

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.reference_no).toBe('LIST-REF-001');
    expect(insertArg.method).toBe('removeorder');

    vi.unstubAllEnvs();
  });

  // ─────────────────────────
  // 실제 HTTP 호출 모드
  // ─────────────────────────

  it('TC-SHXK-03: 실제 호출 성공 → 응답 반환 + 로그 insert', async () => {
    vi.stubEnv('SHXK_TEST_MOCK', 'false');
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ success: 1, enmessage: 'OK', data: { id: 1 } })),
    });

    const result = await callShxk('createorder', { reference_no: 'REAL-001' });

    expect(result.success).toBe(1);
    expect(result.enmessage).toBe('OK');

    expect(mockInsert).toHaveBeenCalledOnce();
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.http_status).toBe(200);
    expect(insertArg.is_mock).toBe(false);
    expect(insertArg.success).toBe(true);

    vi.unstubAllEnvs();
  });

  it('TC-SHXK-04: HTTP 오류 → 예외 throw + 로그 insert (실패 기록)', async () => {
    vi.stubEnv('SHXK_TEST_MOCK', 'false');
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve(''),
    });

    await expect(callShxk('createorder')).rejects.toThrow('shxk API HTTP 500');

    expect(mockInsert).toHaveBeenCalledOnce();
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.http_status).toBe(500);
    expect(insertArg.success).toBe(false);
    expect(insertArg.error_message).toBe('Internal Server Error');

    vi.unstubAllEnvs();
  });

  it('TC-SHXK-05: 네트워크 오류 → 예외 throw + 로그 insert', async () => {
    vi.stubEnv('SHXK_TEST_MOCK', 'false');
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(callShxk('createorder')).rejects.toThrow('shxk API 호출 실패');

    expect(mockInsert).toHaveBeenCalledOnce();
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.success).toBe(false);
    expect(insertArg.error_message).toContain('ECONNREFUSED');

    vi.unstubAllEnvs();
  });

  // ─────────────────────────
  // 로깅 실패 시나리오 (핵심 요구사항)
  // ─────────────────────────

  it('TC-SHXK-06: 로그 insert 실패 → logger.error 호출 + callShxk 정상 응답', async () => {
    vi.stubEnv('SHXK_TEST_MOCK', 'true');

    // 로깅 insert가 실패해도 원래 흐름은 유지되어야 함
    mockInsert.mockRejectedValue(new Error('DB connection failed'));

    const result = await callShxk('getnewlabel', { reference_no: 'FAIL-LOG' });

    // callShxk는 정상 응답 반환
    expect(result.success).toBe(1);
    expect((result.data as Record<string, unknown>)?.label_url).toContain('FAIL-LOG');

    // logger.error가 호출되었는지 확인
    expect(mockLoggerError).toHaveBeenCalledOnce();
    expect(mockLoggerError.mock.calls[0][1]?.message).toBe('DB connection failed');

    vi.unstubAllEnvs();
  });

  it('TC-SHXK-07: 로그 insert 실패 + 실제 호출 성공 → logger.error + 응답 정상', async () => {
    vi.stubEnv('SHXK_TEST_MOCK', 'false');
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ success: 1, enmessage: 'OK', data: {} })),
    });

    mockInsert.mockRejectedValue(new Error('timeout'));

    const result = await callShxk('createorder');

    expect(result.success).toBe(1);
    expect(mockLoggerError).toHaveBeenCalledOnce();

    vi.unstubAllEnvs();
  });

  it('TC-SHXK-08: 로그 insert 실패 + HTTP 오류 → logger.error + 원래 예외 throw', async () => {
    vi.stubEnv('SHXK_TEST_MOCK', 'false');
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: () => Promise.resolve(''),
    });

    mockInsert.mockRejectedValue(new Error('timeout'));

    await expect(callShxk('createorder')).rejects.toThrow('shxk API HTTP 503');
    expect(mockLoggerError).toHaveBeenCalledOnce();

    vi.unstubAllEnvs();
  });

  // ─────────────────────────
  // extractReferenceNo (내부 로직)
  // ─────────────────────────

  it('TC-SHXK-09: params 없음 → reference_no null', async () => {
    vi.stubEnv('SHXK_TEST_MOCK', 'true');
    mockInsert.mockRejectedValue(new Error('ignore'));
    mockLoggerError.mockReset();

    await callShxk('createorder');

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.reference_no).toBeNull();
    expect(mockLoggerError).toHaveBeenCalledOnce();

    vi.unstubAllEnvs();
  });
});
