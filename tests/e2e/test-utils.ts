import { createClient } from '@supabase/supabase-js';

let _client: any = null;

export function getServiceClient(): any {
  if (_client) return _client;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var required');
  _client = createClient('http://127.0.0.1:54321', key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

export function resetClient(): void {
  _client = null;
}
