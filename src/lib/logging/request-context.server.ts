import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { headers } from 'next/headers';
import { setRequestContextStore, type RequestContext, type RequestContextStore } from './request-context';

const storage: RequestContextStore = new AsyncLocalStorage<RequestContext>();
setRequestContextStore(storage);

export async function withRequestContext<T>(fn: () => Promise<T>): Promise<T> {
  const headersList = await headers();
  const requestId = headersList.get('x-request-id') || crypto.randomUUID();
  const ctx: RequestContext = {
    requestId,
    startedAt: Date.now(),
  };
  return storage.run(ctx, fn);
}
