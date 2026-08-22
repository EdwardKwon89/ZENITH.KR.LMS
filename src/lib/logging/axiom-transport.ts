// TASK-1138 (Issue #1178): logger → Axiom 전체 로그 전송 transport
//
// - 엔드포인트: POST https://api.axiom.co/v1/datasets/{AXIOM_DATASET}/ingest
//   (Bearer AXIOM_TOKEN, JSON 배열 본문 — 2026-08-22 실측 200 OK)
// - AXIOM_TOKEN/NEXT_PUBLIC_ 접두사 없음 → 클라이언트 번들에서 undefined → 자동 no-op.
//   별도 window 가드 없이 토큰이 브라우저로 유출되는 경로가 없다.
// - fire-and-forget: 어떤 경우에도 호출자에게 예외를 던지지 않는다(로깅 실패가 앱 로직 방해 금지).
// - 서버리스(Vercel) 함수 freeze 대비 타이머 배치 대신 즉시 flush + 동일 tick coalesce.

const AXIOM_INGEST_BASE = 'https://api.axiom.co/v1/datasets';
const FLUSH_THRESHOLD = 25;
const COALESCE_MS = 10;

export type AxiomLogEntry = Record<string, unknown>;

let buffer: AxiomLogEntry[] = [];
let flushScheduled = false;

function isConfigured(): boolean {
  return Boolean(process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET);
}

export function enqueueAxiomLog(entry: AxiomLogEntry): void {
  if (!isConfigured()) return;

  buffer.push(entry);
  if (buffer.length >= FLUSH_THRESHOLD) {
    void flushAxiomLogs();
    return;
  }
  if (!flushScheduled) {
    flushScheduled = true;
    const timer = setTimeout(() => {
      flushScheduled = false;
      void flushAxiomLogs();
    }, COALESCE_MS);
    // Node 환경에서 이 타이머가 프로세스/vitest 종료를 붙잡지 않도록 한다.
    timer.unref?.();
  }
}

export function flushAxiomLogs(): Promise<void> {
  if (!isConfigured() || buffer.length === 0) return Promise.resolve();

  const batch = buffer.splice(0, buffer.length);
  const token = process.env.AXIOM_TOKEN as string;
  const dataset = process.env.AXIOM_DATASET as string;

  return fetch(`${AXIOM_INGEST_BASE}/${dataset}/ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(batch),
  })
    .then((res) => {
      if (!res.ok) {
        console.warn(`[axiom-transport] ingest failed: HTTP ${res.status}`);
      }
    })
    .catch((err: unknown) => {
      console.warn('[axiom-transport] ingest error:', err instanceof Error ? err.message : err);
    });
}

/** 테스트 간 버퍼/타이머 상태 오염 제거용 */
export function resetAxiomTransportForTests(): void {
  buffer = [];
  flushScheduled = false;
}
