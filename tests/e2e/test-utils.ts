import { createClient, SupabaseClient } from '@supabase/supabase-js';

type AnyRecord = { [key: string]: unknown };
type AnyTable = { Row: AnyRecord; Insert: AnyRecord; Update: AnyRecord };
export type AnySchema = { Tables: Record<string, AnyTable>; Views: Record<string, AnyTable>; Functions: Record<string, unknown> };

let _client: SupabaseClient<AnySchema> | null = null;

export function getServiceClient(): SupabaseClient<AnySchema> {
  if (_client) return _client;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var required');
  _client = createClient<AnySchema>('http://127.0.0.1:54321', key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

export function resetClient(): void {
  _client = null;
}
