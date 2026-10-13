import { describe, it, expect } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { assertActiveUpsProduct } from '@/lib/orders/ups-product-guard';

dotenv.config({ path: '.env.local' });

// ─── TASK-B-336 / Issue #1247 / DEF-B-151 (통합, R-14 로컬 Supabase) ─────────
//
// 목적: `assertActiveUpsProduct`가 **화주(authenticated) 세션**으로 실제
// `zen_ups_products`(RLS: `is_active = true`)를 조회했을 때 정상 동작하는지 실측.
// RLS로 화주 세션 조회가 막히면 이 가드가 실존 코드까지 거부하는 사고가 되므로
// 실제 로컬 DB + RLS 평가 클라이언트로 반드시 확인해야 한다(작업 지시 5).
//
// 조회(zen_ups_products)는 auth.uid()/profile에 의존하지 않으므로 별도 fixture 없이
// 로컬 JWT(role=authenticated) 세션 클라이언트만으로 실제 RLS(SELECT, is_active=true)를 평가한다.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

const SHIPPER_USER = '33600000-0000-4000-8000-000000000001';
const ACTIVE_CODE = 'WW_SAVER_NONDOC'; // DB 실존 + is_active=true
const MISSING_CODE = 'WWE'; // DB 미존재

function b64url(o: unknown): string {
  return Buffer.from(JSON.stringify(o)).toString('base64url');
}
function b64urlBytes(b: Buffer): string {
  return Buffer.from(b).toString('base64url');
}
function makeJwt(sub: string, email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub, role: 'authenticated', email, iat: now, exp: now + 3600,
    aud: 'authenticated', iss: 'supabase',
    app_metadata: { provider: 'email', role: 'SHIPPER' },
    user_metadata: {},
  });
  const sig = b64urlBytes(crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

function makeShipperClient(): SupabaseClient {
  if (!ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required in env');
  const jwt = makeJwt(SHIPPER_USER, '336-shipper@test.kr');
  return createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

describe('TASK-B-336 / DEF-B-151: 화주 세션(RLS)에서 UPS 상품코드 가드 실측', () => {
  it('TC-336-RLS-01: 실존 활성 코드(WW_SAVER_NONDOC) → 통과', async () => {
    const client = makeShipperClient();
    await expect(assertActiveUpsProduct(client, ACTIVE_CODE)).resolves.toBeUndefined();
  });

  it('TC-336-RLS-02: 미존재 코드(WWE) → 거부 메시지로 throw', async () => {
    const client = makeShipperClient();
    await expect(assertActiveUpsProduct(client, MISSING_CODE)).rejects.toThrow(
      '존재하지 않거나 비활성화된 UPS 상품 코드입니다: WWE'
    );
  });
});
