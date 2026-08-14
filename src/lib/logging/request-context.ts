export interface RequestContext {
  requestId: string;
  userId?: string;
  orgId?: string;
  route?: string;
  startedAt: number;
}

export interface RequestContextStore {
  run<T>(ctx: RequestContext, fn: () => T): T;
  getStore(): RequestContext | undefined;
}

let activeStore: RequestContextStore | null = null;

export function setRequestContextStore(store: RequestContextStore | null) {
  activeStore = store;
}

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  if (activeStore) return activeStore.run(ctx, fn);
  return fn();
}

export function getRequestContext(): RequestContext | undefined {
  return activeStore?.getStore();
}

export function getRequestId(): string | undefined {
  return getRequestContext()?.requestId;
}
