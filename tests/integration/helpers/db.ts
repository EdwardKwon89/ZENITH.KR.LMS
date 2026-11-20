/**
 * TASK-1161 / Issue #1347 — 실DB 테스트 공용 fixture 헬퍼 (B_Kai, 2026-11-18)
 *
 * 사용 규칙 (상세: docs/08_Self_Audit/TestCoverage_231/231_실DB_헬퍼_사용가이드.md):
 *  1. 이 헬퍼는 로컬 Supabase 전용이다. 원격 URL이면 모든 진입점에서 throw 한다(R-14).
 *  2. 조직·사용자·프로필은 createTestOrg()로 만든다. 시드 데이터에 의존하지 않는다.
 *  3. service_role은 픽스처 셋업/정리에만 쓴다. RLS 동작 검증은 anon + makeJwt() 클라이언트를 쓴다.
 *  4. makeJwt()는 app_metadata.org_id를 반드시 포함한다(시드 계정 null 함정 방지).
 *  5. 테스트가 추가로 만든 행은 identity.addCleanup(fn)으로 등록하고, identity.cleanup()으로 정리한다.
 */

import { execFileSync } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
const DEFAULT_LOCAL_URL = 'http://127.0.0.1:54321';
const DEFAULT_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

// ── 로컬 전용 가드 (R-14 / Aiden 조건 ①) ────────────────────────────────────

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_LOCAL_URL;
}

/** 원격 Supabase를 가리키면 즉시 throw — tracking QA처럼 고정 ID를 delete하는 사고를 구조적으로 차단. */
export function assertLocalSupabaseUrl(url: string): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`[TASK-1161] 유효하지 않은 Supabase URL: ${url}`);
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `[TASK-1161] 원격 Supabase(${host})는 실DB 테스트에서 사용 금지(R-14). 로컬(127.0.0.1/localhost)만 허용.`
    );
  }
}

function guardedUrl(): string {
  const url = getSupabaseUrl();
  assertLocalSupabaseUrl(url);
  return url;
}

// ── psql: 실행 경로 단일화 (Aiden 결정 2) ──────────────────────────────────

/**
 * 컨테이너명을 env override → supabase/config.toml project_id → 단일 docker ps 매칭 순으로 결정.
 * 0개 또는 2개 이상이면 추측하지 않고 throw(Aiden 조건 2).
 */
export function selectDbContainer(
  names: string[],
  projectId?: string | null,
  envOverride?: string | null
): string {
  const candidates = envOverride
    ? names.filter((name) => name === envOverride)
    : projectId
      ? names.filter((name) => name === `supabase_db_${projectId}`)
      : names.filter((name) => name.startsWith('supabase_db_'));

  if (candidates.length === 0) {
    throw new Error(
      `[TASK-1161] Supabase DB 컨테이너를 찾지 못함(env=${envOverride ?? '-'}, project_id=${projectId ?? '-'}). 추측 실행 금지.`
    );
  }
  if (candidates.length > 1) {
    throw new Error(`[TASK-1161] DB 컨테이너가 모호함(${candidates.join(', ')}). SUPABASE_DB_CONTAINER로 지정하세요.`);
  }
  return candidates[0];
}

let cachedContainer: string | null = null;

function resolveDbContainer(): string {
  if (cachedContainer) return cachedContainer;
  const configPath = path.resolve(process.cwd(), 'supabase/config.toml');
  let projectId: string | null = null;
  if (existsSync(configPath)) {
    const match = readFileSync(configPath, 'utf-8').match(/^\s*project_id\s*=\s*"([^"]+)"/m);
    projectId = match?.[1] ?? null;
  }
  const names = execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf-8' })
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean);
  cachedContainer = selectDbContainer(names, projectId, process.env.SUPABASE_DB_CONTAINER);
  return cachedContainer;
}

/** SQL을 셸 보간 없이 stdin으로 전달(기존 psql()의 따옴표·$ 이스케이프 결함 해소). */
export function psql(sql: string): string {
  const container = resolveDbContainer();
  return execFileSync(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-q', '-t', '-A', '-f', '-'],
    { input: sql, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
  ).trim();
}

// ── 클라이언트 (service_role은 셋업 전용) ──────────────────────────────────

/** service_role 클라이언트 — createTestOrg 셋업/정리 내부에서만 사용. */
export function getServiceClient(): SupabaseClient {
  const url = guardedUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('[TASK-1161] SUPABASE_SERVICE_ROLE_KEY env var required');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** RLS 동작 검증용 anon + 사용자 JWT 클라이언트. */
export function getUserClient(jwt: string): SupabaseClient {
  const url = guardedUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('[TASK-1161] NEXT_PUBLIC_SUPABASE_ANON_KEY env var required');
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── makeJwt + org_id 단언 (Aiden 조건 ③) ──────────────────────────────────

export interface JwtOptions {
  sub: string;
  email: string;
  role: string;
  orgId?: string | null;
  /** 음성 테스트(RLS가 조용히 실패하는 케이스 재현)에서만 true. */
  allowMissingOrgId?: boolean;
  ttlSeconds?: number;
}

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** HS256 서명 JWT. app_metadata.org_id를 기본 포함 — 시드 계정 null 함정 차단. */
export function makeJwt(options: JwtOptions): string {
  if (!options.allowMissingOrgId && !options.orgId) {
    throw new Error('[TASK-1161] makeJwt: orgId 필수 (app_metadata.org_id null이면 RLS가 조용히 실패)');
  }
  const secret = process.env.SUPABASE_JWT_SECRET || DEFAULT_JWT_SECRET;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub: options.sub,
    role: 'authenticated',
    email: options.email,
    iat: now,
    exp: now + (options.ttlSeconds ?? 3600),
    aud: 'authenticated',
    iss: 'supabase',
    app_metadata: { provider: 'email', role: options.role, org_id: options.orgId ?? null },
    user_metadata: {},
  });
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export interface JwtPayload {
  sub?: string;
  role?: string;
  email?: string;
  app_metadata?: { provider?: string; role?: string; org_id?: string | null; [key: string]: unknown };
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string): JwtPayload {
  const part = token.split('.')[1];
  if (!part) throw new Error('[TASK-1161] JWT payload가 없음');
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf-8')) as JwtPayload;
}

/** JWT 클레임의 org_id가 기대값(DB zen_profiles.org_id)과 일치하는지 검증. */
export function assertOrgIdClaim(token: string, expectedOrgId: string): void {
  const claim = decodeJwtPayload(token).app_metadata?.org_id;
  if (!claim) {
    throw new Error('[TASK-1161] app_metadata.org_id가 null — RLS가 조용히 실패하는 시드 계정 함정');
  }
  if (claim !== expectedOrgId) {
    throw new Error(`[TASK-1161] org_id 불일치: JWT=${claim}, DB=${expectedOrgId}`);
  }
}

// ── createTestOrg + addCleanup (자기완결, Aiden 조건 ②④) ──────────────────

export interface TestIdentity {
  prefix: string;
  orgId: string;
  userId: string;
  email: string;
  role: string;
  jwt: string;
  /** 테스트가 추가로 만든 행의 정리 fn 등록 — 실행은 등록 역순(LIFO). */
  addCleanup(fn: () => void | Promise<void>): void;
  /** 멱등. 헬퍼가 만든 3종 + 등록된 cleanup을 전량 제거. */
  cleanup(): Promise<void>;
}

export interface CreateTestOrgOptions {
  prefix?: string;
  role?: string;
  orgType?: string;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export async function createTestOrg(options: CreateTestOrgOptions = {}): Promise<TestIdentity> {
  guardedUrl(); // 로컬 전용 가드 — 원격 URL이면 셋업 전에 throw

  const prefix = options.prefix ?? `test_${randomBytes(4).toString('hex')}`;
  const orgId = randomUUID();
  const userId = randomUUID();
  const email = `${prefix}@test.kr`;
  const role = options.role ?? 'SHIPPER';
  const orgType = options.orgType ?? 'SHIPPER';
  const jwt = makeJwt({ sub: userId, email, role, orgId });

  // on_auth_user_created 트리거(Aiden 조건 ②): raw_user_meta_data.org_id로
  // zen_profiles를 자동 INSERT한다. 트리거를 억제하지 않고, 생성된 프로필을
  // 원하는 role/status로 정정한다(이중 INSERT 방지).
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status)
    VALUES (${quote(orgId)}, ${quote(prefix)}, ${quote(orgType)}, 'ACTIVE');

    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (${quote(userId)}, ${quote(email)}, jsonb_build_object(
      'org_id', ${quote(orgId)},
      'full_name', ${quote(prefix)},
      'role', ${quote(role)},
      'is_new_org', false
    ));

    UPDATE public.zen_profiles
       SET role = ${quote(role)}, status = 'ACTIVE', org_id = ${quote(orgId)}
     WHERE id = ${quote(userId)};

    UPDATE auth.users
       SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
         'org_id', ${quote(orgId)}, 'role', ${quote(role)},
         'org_type', ${quote(orgType)}, 'status', 'ACTIVE'
       )
     WHERE id = ${quote(userId)};
  `);

  // Aiden 조건 ③: JWT 클레임과 DB 프로필 값이 항상 일치함을 실측으로 확인.
  const profileOrgId = psql(`SELECT org_id::text FROM public.zen_profiles WHERE id = ${quote(userId)};`);
  if (profileOrgId !== orgId) {
    throw new Error(`[TASK-1161] 프로필 org_id 불일치: DB=${profileOrgId}, expected=${orgId}`);
  }
  assertOrgIdClaim(jwt, orgId);

  const cleanups: Array<() => void | Promise<void>> = [];
  let done = false;

  const identity: TestIdentity = {
    prefix,
    orgId,
    userId,
    email,
    role,
    jwt,
    addCleanup(fn) {
      cleanups.push(fn);
    },
    async cleanup() {
      if (done) return; // 멱등
      done = true;
      for (let i = cleanups.length - 1; i >= 0; i -= 1) {
        await cleanups[i]();
      }

      // order_id를 가진 모든 base table을 먼저 지우고(FO), 오더·프로필·유저·조직 순으로 정리.
      psql(`
        DO $$
        DECLARE t text;
        BEGIN
          FOR t IN
            SELECT c.table_name
              FROM information_schema.columns c
              JOIN information_schema.tables tb
                ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
             WHERE c.table_schema = 'public' AND c.column_name = 'order_id'
               AND tb.table_type = 'BASE TABLE'
          LOOP
            EXECUTE format(
              'DELETE FROM public.%I WHERE order_id IN (SELECT id FROM public.zen_orders WHERE shipper_id = %L)',
              t, ${quote(orgId)}
            );
          END LOOP;
        END $$;

        DELETE FROM public.zen_orders WHERE shipper_id = ${quote(orgId)};
        DELETE FROM public.zen_profiles WHERE id = ${quote(userId)};
        DELETE FROM auth.users WHERE id = ${quote(userId)};
        DELETE FROM public.zen_organizations WHERE id = ${quote(orgId)};
      `);
    },
  };

  return identity;
}
