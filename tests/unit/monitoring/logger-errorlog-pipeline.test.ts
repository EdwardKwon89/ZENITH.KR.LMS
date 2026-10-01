import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// TASK-1141 (Issue #1208, IMP-169 Option C): logger.error() → zen_error_logs 자동 적재
// - 실제 logger.error()를 호출하고 supabase insert / fetch 호출 여부를 검증하는
//   behavioral 테스트다 (소스 문자열 검사가 아님).
// - vitest env가 jsdom이므로 서버 경로 테스트에서는 window를 stub으로 제거한다.

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/app/actions/notifications', () => ({
  sendInAppNotification: vi.fn(),
}));

import { logger } from '@/lib/logger';
import { flushErrorLogs, resetErrorLogTransportForTests } from '@/lib/logging/error-log-transport';
import { createClient } from '@supabase/supabase-js';
import { sendInAppNotification } from '@/app/actions/notifications';
import * as Sentry from '@sentry/nextjs';
import { setRequestContextStore, runWithRequestContext } from '@/lib/logging/request-context';
import { AsyncLocalStorage } from 'node:async_hooks';

describe('Logger → zen_error_logs auto-persist (TASK-1141 Option C)', () => {
  let errorSpy: any;
  let warnSpy: any;
  let insertMock: any;
  let fromMock: any;

  beforeEach(() => {
    setRequestContextStore(new AsyncLocalStorage());
    resetErrorLogTransportForTests();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(Sentry.captureMessage).mockReset().mockReturnValue('evt-1' as any);
    vi.mocked(sendInAppNotification).mockClear();

    insertMock = vi.fn(async () => ({ error: null }));
    fromMock = vi.fn(() => ({ insert: insertMock }));
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
    vi.mocked(createClient).mockReset().mockReturnValue({ from: fromMock } as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function serverMode() {
    // jsdom window 제거 → transport가 서버 분기로 동작
    vi.stubGlobal('window', undefined);
  }

  it('TC-ELP-01: [Success] logger.error 호출 시 zen_error_logs에 ERROR 행이 실제로 적재되어야 함', async () => {
    // Given
    serverMode();

    // When — 실제 함수 호출
    logger.error('UPS pipeline failed');
    await flushErrorLogs();

    // Then — supabase insert가 ERROR/SEVERITY 행으로 호출됨
    expect(fromMock).toHaveBeenCalledWith('zen_error_logs');
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'UPS pipeline failed',
        severity: 'ERROR',
        error_type: 'SERVER',
        sentry_id: 'evt-1',
      }),
    );
    // 기존 파이프라인 유지: 콘솔 + Sentry
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
  });

  it('TC-ELP-02: [Guard] logger.warn/info는 zen_error_logs에 적재하지 않아야 함', async () => {
    // Given
    serverMode();

    // When
    logger.warn('just warn');
    logger.info('just info');
    await flushErrorLogs();

    // Then
    expect(insertMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('TC-ELP-03: [Guard] DB 적재 실패 시 예외 없이 종료되고 재귀 호출이 없어야 함', async () => {
    // Given — DB 장애 시뮬레이션
    serverMode();
    insertMock.mockResolvedValueOnce({ error: { message: 'db down' } });

    // When + Then — 호출자 예외 없음
    expect(() => logger.error('resilience check')).not.toThrow();
    await flushErrorLogs();

    // Then — insert 시도는 정확히 1회 (실패 경로가 logger.error를 다시 타면 무한 재귀)
    expect(insertMock).toHaveBeenCalledTimes(1);
    // logger 본연의 console.error는 정확히 1회 (transport는 console.error 사용 금지)
    expect(errorSpy).toHaveBeenCalledTimes(1);
    // 대신 warn으로 우아하게 기록
    expect(warnSpy).toHaveBeenCalled();
  });

  it('TC-ELP-04: [Guard] Edge 런타임에서는 DB 적재를 스킵하고 나머지 파이프라인은 유지해야 함', async () => {
    // Given
    serverMode();
    vi.stubEnv('NEXT_RUNTIME', 'edge');

    // When
    logger.error('middleware failure');
    await flushErrorLogs();

    // Then
    expect(insertMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
  });

  it('TC-ELP-05: [Success] 브라우저에서는 POST /api/error-logs로 적재 요청해야 함', async () => {
    // Given — jsdom window 유지(브라우저 모드) + fetch 목
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    // When
    logger.error('client boom');
    await flushErrorLogs();

    // Then — supabase 직접 insert가 아니라 API 채널 사용
    expect(insertMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/error-logs');
    expect(init.method).toBe('POST');
    const payload = JSON.parse(init.body);
    expect(payload).toEqual(
      expect.objectContaining({ message: 'client boom', severity: 'ERROR' }),
    );
  });

  it('TC-ELP-06: [Success] request-context의 UUID user/org는 행에 포함되고 비-UUID는 제외되어야 함', async () => {
    // Given
    serverMode();
    const userId = '11111111-1111-4111-8111-111111111111';
    const orgId = '22222222-2222-4222-8222-222222222222';

    // When — 유효 UUID 컨텍스트
    runWithRequestContext(
      { requestId: 'req-1', userId, orgId, route: '/api/orders', startedAt: Date.now() },
      () => logger.error('attributed failure'),
    );
    await flushErrorLogs();

    // Then
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: userId, org_id: orgId, url: '/api/orders' }),
    );

    // When — 비-UUID 컨텍스트 (FK 위반 방지: NULL 적재)
    insertMock.mockClear();
    runWithRequestContext(
      { requestId: 'req-2', userId: 'not-a-uuid', startedAt: Date.now() },
      () => logger.error('unattributed failure'),
    );
    await flushErrorLogs();

    // Then
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: null, org_id: null }),
    );
  });

  it('TC-ELP-07: [Guard] 자동 적재(ERROR)는 CRITICAL 알림을 발송하지 않아야 함', async () => {
    // Given
    serverMode();

    // When
    logger.error('ordinary error, not critical');
    await flushErrorLogs();

    // Then — 적재는 되지만 인앱 알림은 발송되지 않음 (알림은 logClientError CRITICAL 전용)
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'ERROR' }),
    );
    expect(sendInAppNotification).not.toHaveBeenCalled();
  });

  it('TC-ELP-08: [Success] Error 객체의 stack이 stack 컬럼에 승격되어야 함', async () => {
    // Given
    serverMode();
    const err = new Error('boom-stack-marker');

    // When
    logger.error('op failed', err);
    await flushErrorLogs();

    // Then
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0];
    expect(row.message).toBe('op failed');
    expect(typeof row.stack).toBe('string');
    expect(row.stack).toContain('boom-stack-marker');
  });
});
