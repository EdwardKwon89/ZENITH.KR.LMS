import { getRequestContext } from '@/lib/logging/request-context';
import { enqueueAxiomLog } from '@/lib/logging/axiom-transport';
import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// TASK-B-314 (Issue #1152): 순환참조 안전 stringify — WeakSet 기반 + try/catch 이중 방어
function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      if (value instanceof Error) {
        return { name: value.name, message: value.message };
      }
      if (typeof value === 'bigint') return value.toString();
      return value;
    });
  } catch {
    return '{"error": "Failed to serialize log entry"}';
  }
}

function serializeArg(arg: unknown): unknown {
  if (arg instanceof Error) {
    return { name: arg.name, message: arg.message, stack: arg.stack };
  }
  if (typeof arg === 'bigint') return arg.toString();
  return arg;
}

function buildEntry(level: LogLevel, args: unknown[]): Record<string, unknown> {
  const ctx = getRequestContext();
  const entry: Record<string, unknown> = {
    level,
    timestamp: new Date().toISOString(),
  };

  if (ctx) {
    if (ctx.requestId) entry.requestId = ctx.requestId;
    if (ctx.userId) entry.userId = ctx.userId;
    if (ctx.orgId) entry.orgId = ctx.orgId;
    if (ctx.route) entry.route = ctx.route;
  }

  if (args.length === 1 && typeof args[0] === 'string') {
    entry.message = args[0];
  } else if (args.length > 0) {
    const first = args[0];
    if (typeof first === 'string') {
      entry.message = first;
      entry.data = args.slice(1).map(serializeArg);
    } else {
      entry.message = '';
      entry.data = args.map(serializeArg);
    }
  } else {
    entry.message = '';
  }

  return entry;
}

// TASK-1138 (Issue #1178): 에러성 로그는 설계 확정에 따라 Sentry 이슈로도 그룹핑 전송한다.
// 어떤 경우에도 로깅 자체가 앱 로직을 방해하지 않도록 예외를 흡수한다.
function captureErrorToSentry(entry: Record<string, unknown>) {
  try {
    Sentry.captureMessage(String(entry.message || 'logger.error'), {
      level: 'error',
      contexts: {
        log_entry: {
          level: entry.level,
          requestId: entry.requestId,
          userId: entry.userId,
          orgId: entry.orgId,
          route: entry.route,
        },
      },
    });
  } catch {
    // no-op — Sentry 장애가 콘솔/Axiom 로깅 경로를 막지 않는다
  }
}

function emit(level: LogLevel, args: unknown[]) {
  const entry = buildEntry(level, args);
  const line = safeStringify(entry);
  if (level === 'error') {
    console.error(line);
    captureErrorToSentry(entry);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
  enqueueAxiomLog(entry);
}

export const logger = {
  info: (...args: any[]) => emit('info', args),
  warn: (...args: any[]) => emit('warn', args),
  error: (...args: any[]) => emit('error', args),
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      emit('debug', args);
    }
  },
};
