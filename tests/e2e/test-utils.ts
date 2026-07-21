import { createClient, SupabaseClient } from '@supabase/supabase-js';

type AnyRecord = { [key: string]: any };
type AnyTable = { Row: AnyRecord; Insert: AnyRecord; Update: AnyRecord; Relationships: [] };
type AnySchema = { Tables: Record<string, AnyTable>; Views: Record<string, AnyTable>; Functions: Record<string, { Args: Record<string, unknown> | never; Returns: unknown }> };
type Database = { public: AnySchema };

let _client: SupabaseClient<Database> | null = null;

export function getServiceClient(): SupabaseClient<Database> {
  if (_client) return _client;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var required');
  _client = createClient<Database>('http://127.0.0.1:54321', key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

export function resetClient(): void {
  _client = null;
}
