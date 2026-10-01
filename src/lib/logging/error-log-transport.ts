// TASK-1141 (Issue #1208, IMP-169): logger.error() → zen_error_logs 자동 적재 transport (Option C)
//
// 배경: logger.error()는 Sentry/Axiom/Vercel 콘솔로 항상 전송되지만,
// /admin/error-logs 화면이 조회하는 zen_error_logs에는 logClientError()를
// 명시 호출한 지점만 기록되는 이중 파이프라인이었다. 본 모듈이 그 흡수 경로다.
//
// 설계 원칙:
// - fire-and-forget: 어떤 경우에도 호출자에게 예외를 던지지 않는다 (로깅 실패가 앱 로직 방해 금지).
// - 재귀 없음: 실패 경로는 console.warn만 사용한다. console.error/logger를 호출하면
//   다시 emit('error') → enqueueErrorLog 순환이 발생하므로 절대 금지.
// - 정적 import 금지: '@/utils/supabase/server'는 'next/headers'(cookies)를
//   파일 최상단에서 import하므로, 본 파일(logger 경유로 클라이언트 컴포넌트에도
//   번들됨)이 이를 참조하면 Turbopack이 server.ts를 클라이언트 번들에 포함시켜
//   빌드가 깨진다. 또한 server.ts가 '@/lib/logger'를 import하므로 정적 연결 시
//   순환참조도 발생한다. 따라서 @supabase/supabase-js를 직접 사용한다 —
//   next/headers 의존성이 없어 클라이언트 번들에 포함돼도 빌드가 깨지지 않으며,
//   logger 의존성이 없어 순환참조도 없다 (Axiom transport와 동일한 논리).
// - SUPABASE_SERVICE_ROLE_KEY는 NEXT_PUBLIC_ 접두사가 없어 클라이언트 번들에서
//   undefined이며, 서버 분기는 `typeof window === 'undefined'` 가드 안에서만
//   실행되므로 서비스 키가 브라우저로 유출되는 경로가 없다
//   (axiom-transport.ts의 AXIOM_TOKEN 가드와 동일한 논리).
// - Edge 런타임(middleware)에서는 DB 적재를 스킵한다: next/headers 쿠키 API가
//   middleware 컨텍스트에서 동작하지 않기 때문. Sentry/Axiom/console 경로는
//   그대로 전송되므로 관측이 완전히 끊기지는 않는다.

export interface ErrorLogEnqueueEntry {
  message: unknown;
  data?: unknown[];
  requestId?: unknown;
  userId?: unknown;
  orgId?: unknown;
  route?: unknown;
  sentryId?: string;
}

const MESSAGE_MAX = 2000;
const STACK_MAX = 4000;
const URL_MAX = 1000;
// DB 장애 시 무한 적재 시도 폭증을 막기 위한 pending 상한
const MAX_PENDING = 100;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pending = new Set<Promise<void>>();

function truncate(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value);
  if (!str) return undefined;
  return str.length > max ? str.slice(0, max) : str;
}

function asUuidOrNull(value: unknown): string | null {
  return typeof value === 'string' && UUID_RE.test(value) ? value : null;
}

// buildEntry()가 Error를 data 배열에 { name, message, stack } 형태로 직렬화하므로
// 첫 번째 stack 문자열을 stack 컬럼에 승격시킨다.
function extractStack(data: unknown[] | undefined): string | undefined {
  if (!Array.isArray(data)) return undefined;
  for (const item of data) {
    if (item && typeof item === 'object' && 'stack' in item) {
      const stack = (item as Record<string, unknown>).stack;
      if (typeof stack === 'string' && stack) return truncate(stack, STACK_MAX);
    }
  }
  return undefined;
}

function isEdgeRuntime(): boolean {
  return process.env.NEXT_RUNTIME === 'edge';
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

async function persistServerSide(entry: ErrorLogEnqueueEntry): Promise<void> {
  // @supabase/supabase-js 직접 사용: '@/utils/supabase/server'는 next/headers를
  // 최상단 import하므로 클라이언트 번들 포함 시 빌드 실패 (TASK-1141 빌드 수정).
  // service-role 키로 RLS 우회 + 세션 무관 적재 (cron 등 무세션 경로 포함).
  // SUPABASE_SERVICE_ROLE_KEY에 NEXT_PUBLIC_ 접두사가 없어 클라이언트 번들에서는
  // undefined로 대체되므로 키 유출 경로가 없다 (Axiom 토큰 가드와 동일 논리).
  // 서버 분기는 `typeof window === 'undefined'` 가드 안에서만 실행된다.
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn('[error-log-transport] Supabase env missing, skip persist');
    return;
  }
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from('zen_error_logs').insert({
    message: truncate(entry.message, MESSAGE_MAX) || 'logger.error',
    stack: extractStack(entry.data),
    url: truncate(entry.route, URL_MAX),
    severity: 'ERROR',
    error_type: 'SERVER',
    sentry_id: entry.sentryId,
    user_id: asUuidOrNull(entry.userId),
    org_id: asUuidOrNull(entry.orgId),
  });

  if (error) {
    console.warn('[error-log-transport] zen_error_logs insert failed:', error.message);
  }
}

async function persistBrowserSide(entry: ErrorLogEnqueueEntry): Promise<void> {
  const res = await fetch('/api/error-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      message: truncate(entry.message, MESSAGE_MAX) || 'logger.error',
      stack: extractStack(entry.data),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      severity: 'ERROR',
      sentry_id: entry.sentryId,
    }),
  });
  if (!res.ok) {
    console.warn(`[error-log-transport] POST /api/error-logs failed: HTTP ${res.status}`);
  }
}

function runPersist(entry: ErrorLogEnqueueEntry): Promise<void> {
  if (isEdgeRuntime()) return Promise.resolve();
  const task = (isBrowser() ? persistBrowserSide(entry) : persistServerSide(entry)).catch(
    (err: unknown) => {
      // console.error 금지 (emit 재귀 + logger-saas 테스트의 errorSpy 최종호출 파싱 보호)
      console.warn(
        '[error-log-transport] persist error:',
        err instanceof Error ? err.message : err,
      );
    },
  );
  return task;
}

/**
 * logger.error() 호출 1건을 zen_error_logs 적재 큐에 넣는다.
 * 동기 예외를 절대 던지지 않는다.
 */
export function enqueueErrorLog(entry: ErrorLogEnqueueEntry): void {
  try {
    if (isEdgeRuntime()) return;
    if (pending.size >= MAX_PENDING) return;
    const task = runPersist(entry);
    pending.add(task);
    task.then(
      () => pending.delete(task),
      () => pending.delete(task),
    );
  } catch (err: unknown) {
    console.warn(
      '[error-log-transport] enqueue error:',
      err instanceof Error ? err.message : err,
    );
  }
}

/** 테스트용: 진행 중 적재가 모두 끝날 때까지 대기한다. */
export function flushErrorLogs(): Promise<void> {
  return Promise.allSettled([...pending]).then(() => undefined);
}

/** 테스트 간 pending 상태 오염 제거용 */
export function resetErrorLogTransportForTests(): void {
  pending.clear();
}
