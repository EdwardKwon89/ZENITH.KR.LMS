import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are required');
}

describe('TASK-1167 (Issue #1389 / DEF-156): calculate_order_costs 권한 구성 및 재발 방지', () => {
  let serviceClient: SupabaseClient;
  let anonClient: SupabaseClient;
  let authClient: SupabaseClient;
  let testUserId: string | null = null;
  const dummyOrderId = '00000000-0000-4000-8000-000000000001';

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = `task1167-test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'CORPORATE' },
    });
    if (createErr || !created.user) {
      throw new Error(`Failed to create temp auth user: ${createErr?.message}`);
    }
    testUserId = created.user.id;

    authClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInErr } = await authClient.auth.signInWithPassword({ email, password });
    if (signInErr) {
      throw new Error(`Failed to sign in temp auth user: ${signInErr.message}`);
    }
  });

  afterAll(async () => {
    if (testUserId) {
      await serviceClient.auth.admin.deleteUser(testUserId);
    }
  });

  it('TC-1167-01: anon 세션으로 calculate_order_costs RPC 호출 시 권한 오류가 반환된다', async () => {
    const { data, error } = await anonClient.rpc('calculate_order_costs', { p_order_id: dummyOrderId });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.code === '42501' || /permission denied/i.test(error?.message ?? '')).toBe(true);
  });

  it('TC-1167-02: authenticated 세션으로 calculate_order_costs RPC 호출 시 권한 오류가 반환된다', async () => {
    const { data, error } = await authClient.rpc('calculate_order_costs', { p_order_id: dummyOrderId });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.code === '42501' || /permission denied/i.test(error?.message ?? '')).toBe(true);
  });

  it('TC-1167-03: service_role 세션으로 calculate_order_costs RPC 호출은 정상 동작한다', async () => {
    const { data, error } = await serviceClient.rpc('calculate_order_costs', { p_order_id: dummyOrderId });
    expect(error).toBeNull();
    expect(data).toEqual({ success: false, message: '오더를 찾을 수 없습니다.' });
  });

  it('TC-1167-04: 마이그레이션 최종 상태가 SECURITY INVOKER·search_path=public·service_role 전용 권한을 유지한다', () => {
    const migDir = join(process.cwd(), 'supabase/migrations');
    const files = readdirSync(migDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let lastCreateIdx = -1;
    let lastHardeningIdx = -1;

    files.forEach((f, idx) => {
      const sql = readFileSync(join(migDir, f), 'utf8');
      if (/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.calculate_order_costs\s*\(/i.test(sql)) {
        lastCreateIdx = idx;
      }
      const hasInvoker = /calculate_order_costs\s*\([\s\S]{0,120}?SECURITY\s+INVOKER/i.test(sql);
      const hasSearchPath = /calculate_order_costs\s*\([\s\S]{0,150}?SET\s+search_path\s*=\s*public/i.test(sql);
      const hasRevokePublic = /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.calculate_order_costs[\s\S]{0,80}?FROM\s+PUBLIC/i.test(sql);
      const hasRevokeAuth = /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.calculate_order_costs[\s\S]{0,80}?FROM\s+authenticated/i.test(sql);
      const hasGrantService = /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.calculate_order_costs[\s\S]{0,80}?TO\s+service_role/i.test(sql);
      if (hasInvoker && hasSearchPath && hasRevokePublic && hasRevokeAuth && hasGrantService) {
        lastHardeningIdx = idx;
      }
    });

    expect(lastHardeningIdx).toBeGreaterThan(-1);
    expect(lastHardeningIdx).toBeGreaterThan(lastCreateIdx);
  });
});
