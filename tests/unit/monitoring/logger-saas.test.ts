import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// TASK-1138 (Issue #1178): logger → SaaS(Axiom/Sentry) 전달 계층 테스트
// - 기존 logger.test.ts가 콘솔 출력 형식 회귀를 담당하므로 본 파일은 SaaS 전달만 검증한다.
// - axiom-transport는 별도 axiom-transport.test.ts에서 실제 fetch 레벨을 검증한다.

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/logging/axiom-transport', () => ({
  enqueueAxiomLog: vi.fn(),
}));

import { logger } from '@/lib/logger';
import { enqueueAxiomLog } from '@/lib/logging/axiom-transport';
import * as Sentry from '@sentry/nextjs';
import { setRequestContextStore, runWithRequestContext } from '@/lib/logging/request-context';
import { AsyncLocalStorage } from 'node:async_hooks';

describe('Logger → SaaS Forwarding (Axiom + Sentry)', () => {
  let logSpy: any;
  let warnSpy: any;
  let errorSpy: any;

  beforeEach(() => {
    setRequestContextStore(new AsyncLocalStorage());
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(Sentry.captureMessage).mockClear();
    vi.mocked(enqueueAxiomLog).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function parseEntry(spy: any) {
    const line = spy.mock.calls.at(-1)?.[0];
    expect(typeof line).toBe('string');
    return JSON.parse(line);
  }

  it('TC-SLS-01: [Success] logger.info는 콘솔 출력과 함께 Axiom transport에 entry를 전달해야 함', () => {
    // When
    logger.info('Order created', { orderId: 'O-1' });

    // Then — 콘솔(기존 회귀) + Axiom 전달 모두 확인
    const entry = parseEntry(logSpy);
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('Order created');
    expect(entry.data).toEqual([{ orderId: 'O-1' }]);

    expect(enqueueAxiomLog).toHaveBeenCalledTimes(1);
    expect(enqueueAxiomLog).toHaveBeenCalledWith(expect.objectContaining({
      level: 'info',
      message: 'Order created',
      data: [{ orderId: 'O-1' }],
    }));
  });

  it('TC-SLS-02: [Success] logger.error는 Sentry.captureMessage로 이슈 그룹핑 전송해야 함', () => {
    // When
    logger.error('UPS pipeline failed');

    // Then
    parseEntry(errorSpy); // 콘솔 에러 출력 유지
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    const [message, options] = vi.mocked(Sentry.captureMessage).mock.calls[0];
    expect(message).toBe('UPS pipeline failed');
    expect(options.level).toBe('error');
    expect(enqueueAxiomLog).toHaveBeenCalledWith(expect.objectContaining({ level: 'error' }));
  });

  it('TC-SLS-03: [Guard] info/warn 레벨은 Sentry 이슈를 생성하지 않아야 함', () => {
    // When
    logger.info('just info');
    logger.warn('just warn');

    // Then
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(enqueueAxiomLog).toHaveBeenCalledTimes(2);
  });

  it('TC-SLS-04: [Success] requestId/userId/route 컨텍스트가 Axiom entry에 그대로 유지되어야 함', () => {
    // Given
    const ctx = {
      requestId: 'req-abc',
      userId: 'user-1',
      orgId: 'org-1',
      route: '/api/orders',
      startedAt: Date.now(),
    };

    // When
    runWithRequestContext(ctx, () => {
      logger.warn('context propagation check');
    });

    // Then
    expect(enqueueAxiomLog).toHaveBeenCalledWith(expect.objectContaining({
      level: 'warn',
      requestId: 'req-abc',
      userId: 'user-1',
      orgId: 'org-1',
      route: '/api/orders',
    }));
  });

  it('TC-SLS-05: [Guard] Sentry 장애 시에도 콘솔 로깅은 정상 동작해야 함', () => {
    // Given
    vi.mocked(Sentry.captureMessage).mockImplementation(() => {
      throw new Error('sentry down');
    });

    // When + Then — 예외가 호출자로 전파되지 않고 콘솔 출력은 유지된다
    expect(() => logger.error('resilience check')).not.toThrow();
    const entry = parseEntry(errorSpy);
    expect(entry.message).toBe('resilience check');
  });
});
