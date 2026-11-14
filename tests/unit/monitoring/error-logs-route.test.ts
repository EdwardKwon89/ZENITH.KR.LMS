import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// TASK-1141 (Issue #1208): POST /api/error-logs — 브라우저 채널 적재 핸들러
// - 실제 POST() 핸들러를 호출하고 supabase insert 호출 여부를 검증하는 behavioral 테스트다.

vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
}));

import { POST } from '@/app/api/error-logs/route';
import { createAdminClient } from '@/utils/supabase/server';

describe('POST /api/error-logs (TASK-1141 client channel)', () => {
  let insertMock: any;
  let singleMock: any;
  let warnSpy: any;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    singleMock = vi.fn(async () => ({ data: { id: 'row-1' }, error: null }));
    insertMock = vi.fn(() => ({ select: () => ({ single: singleMock }) }));
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    vi.mocked(createAdminClient).mockReset().mockResolvedValue({ from: fromMock } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function postRequest(body: unknown) {
    return new Request('http://localhost/api/error-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('TC-ELR-01: [Success] 유효한 ERROR 로그는 200과 함께 CLIENT 행으로 적재되어야 함', async () => {
    // When — 실제 핸들러 호출
    const res = await POST(postRequest({ message: 'client boom', stack: 'at foo' }));

    // Then
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, id: 'row-1' });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'client boom',
        stack: 'at foo',
        severity: 'ERROR',
        error_type: 'CLIENT',
      }),
    );
  });

  it('TC-ELR-02: [Guard] CRITICAL은 400으로 거부되고 적재되지 않아야 함 (조용한 CRITICAL 방지)', async () => {
    // When
    const res = await POST(postRequest({ message: 'fake critical', severity: 'CRITICAL' }));

    // Then
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('TC-ELR-03: [Guard] message 없이 400을 반환해야 함', async () => {
    // When
    const res = await POST(postRequest({ severity: 'ERROR' }));

    // Then
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('TC-ELR-04: [Guard] 2000자 초과 메시지는 잘라서 적재해야 함', async () => {
    // When
    const res = await POST(postRequest({ message: 'x'.repeat(5000) }));

    // Then
    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0];
    expect(row.message.length).toBeLessThanOrEqual(2000);
  });

  it('TC-ELR-05: [Guard] DB 실패 시 500을 반환하고 logger 재귀 없이 warn으로 끝나야 함', async () => {
    // Given
    singleMock.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });

    // When
    const res = await POST(postRequest({ message: 'persist me' }));

    // Then
    expect(res.status).toBe(500);
    expect(warnSpy).toHaveBeenCalled();
  });
});
