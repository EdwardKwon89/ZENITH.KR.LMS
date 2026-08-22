import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enqueueAxiomLog,
  flushAxiomLogs,
  resetAxiomTransportForTests,
} from '@/lib/logging/axiom-transport';

// TASK-1138 (Issue #1178): Axiom ingest transport 단위 테스트
// - 실제 네트워크 호출 없이 global.fetch를 mock하여 URL/인증/페이로드 검증
// - env 미설정 시 완전 no-op(클라이언트 번들 안전성) 및 예외 비전파 보장 검증

const fetchMock = vi.fn();

describe('Axiom Transport', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    process.env.AXIOM_TOKEN = 'test-token';
    process.env.AXIOM_DATASET = 'test-dataset';
    resetAxiomTransportForTests();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    resetAxiomTransportForTests();
    delete process.env.AXIOM_TOKEN;
    delete process.env.AXIOM_DATASET;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('TC-AXM-01: [Success] flush 시 Axiom ingest 엔드포인트로 배치를 전송해야 함', async () => {
    // Given
    const entry = { level: 'info', message: 'hello axiom', requestId: 'req-1' };

    // When
    enqueueAxiomLog(entry);
    await flushAxiomLogs();

    // Then
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.axiom.co/v1/datasets/test-dataset/ingest');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual([entry]);
  });

  it('TC-AXM-02: [Guard] env 미설정 시 어떤 전송도 하지 않아야 함(클라이언트 no-op)', async () => {
    // Given
    delete process.env.AXIOM_TOKEN;
    delete process.env.AXIOM_DATASET;

    // When
    enqueueAxiomLog({ level: 'info', message: 'dropped' });
    await flushAxiomLogs();

    // Then
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('TC-AXM-03: [Guard] 네트워크 실패 시 예외를 전파하지 않아야 함(fire-and-forget)', async () => {
    // Given
    fetchMock.mockRejectedValue(new Error('network down'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // When
    enqueueAxiomLog({ level: 'error', message: 'will fail to ship' });

    // Then — 절대 throw 하지 않는다
    await expect(flushAxiomLogs()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('[axiom-transport] ingest error:', 'network down');
  });

  it('TC-AXM-04: [Guard] HTTP 오류 응답 시 경고 후 정상 종료해야 함', async () => {
    // Given
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // When
    enqueueAxiomLog({ level: 'info', message: 'auth fail case' });
    await flushAxiomLogs();

    // Then
    expect(warnSpy).toHaveBeenCalledWith('[axiom-transport] ingest failed: HTTP 403');
  });

  it('TC-AXM-05: [Batch] 임계치(25건) 도달 시 명시적 flush 없이 자동 전송되어야 함', async () => {
    // When
    for (let i = 0; i < 25; i++) {
      enqueueAxiomLog({ level: 'info', message: `bulk-${i}` });
    }

    // Then — void flush가 fire-and-forget이므로 마이크로태스크 드레인 후 확인
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toHaveLength(25);

    // 버퍼는 비워졌으므로 이후 flush에서 중복 전송 없음
    await flushAxiomLogs();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('TC-AXM-06: [Batch] coalesce 타이머 경과 시 자동 flush되어야 함', async () => {
    // Given
    vi.useFakeTimers();

    try {
      // When — enqueue만으로 타이머 스케줄
      enqueueAxiomLog({ level: 'info', message: 'timer flush case' });
      expect(fetchMock).not.toHaveBeenCalled();

      vi.advanceTimersByTime(10); // COALESCE_MS
      await Promise.resolve();
      await Promise.resolve();

      // Then
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
