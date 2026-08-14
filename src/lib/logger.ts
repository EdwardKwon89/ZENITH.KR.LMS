import { getRequestContext } from '@/lib/logging/request-context';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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

function emit(level: LogLevel, args: unknown[]) {
  const entry = buildEntry(level, args);
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
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
