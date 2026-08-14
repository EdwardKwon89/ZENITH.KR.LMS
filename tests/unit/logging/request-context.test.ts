import { describe, it, expect, beforeEach } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  runWithRequestContext,
  getRequestId,
  getRequestContext,
  setRequestContextStore,
} from '@/lib/logging/request-context';

describe('request-context (TASK-1130)', () => {
  beforeEach(() => {
    setRequestContextStore(new AsyncLocalStorage());
  });

  it('async 경계에서 requestId가 유지된다', async () => {
    let rid: string | undefined;
    await runWithRequestContext({ requestId: 'req-123', startedAt: Date.now() }, async () => {
      await new Promise((r) => setTimeout(r, 5));
      rid = getRequestId();
    });
    expect(rid).toBe('req-123');
  });

  it('getRequestContext가 전체 컨텍스트를 반환한다', () => {
    runWithRequestContext(
      { requestId: 'r1', userId: 'u1', orgId: 'o1', route: '/api/x', startedAt: 1 },
      () => {
        const ctx = getRequestContext();
        expect(ctx).toMatchObject({ requestId: 'r1', userId: 'u1', orgId: 'o1', route: '/api/x' });
      }
    );
  });

  it('컨텍스트 밖에서는 undefined', () => {
    expect(getRequestId()).toBeUndefined();
    expect(getRequestContext()).toBeUndefined();
  });

  it('store 미주입 상태에서는 no-op으로 동작한다', () => {
    setRequestContextStore(null);
    const result = runWithRequestContext({ requestId: 'noop', startedAt: 1 }, () => getRequestId());
    expect(result).toBeUndefined();
  });

  it('중첩 runWithRequestContext는 내부가 우선한다', () => {
    runWithRequestContext({ requestId: 'outer', startedAt: 1 }, () => {
      runWithRequestContext({ requestId: 'inner', startedAt: 2 }, () => {
        expect(getRequestId()).toBe('inner');
      });
      expect(getRequestId()).toBe('outer');
    });
  });
});
