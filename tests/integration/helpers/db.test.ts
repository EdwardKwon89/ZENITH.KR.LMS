import { describe, it, expect, afterEach } from 'vitest';
import {
  assertLocalSupabaseUrl,
  assertOrgIdClaim,
  createTestOrg,
  decodeJwtPayload,
  getServiceClient,
  makeJwt,
  psql,
  selectDbContainer,
} from './db';

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  if (ORIGINAL_JWT_SECRET === undefined) delete process.env.SUPABASE_JWT_SECRET;
  else process.env.SUPABASE_JWT_SECRET = ORIGINAL_JWT_SECRET;
});

describe('TASK-1161 — 실DB fixture 헬퍼 단위 동작', () => {
  it('TC-HELPER-01: selectDbContainer — 0개/2개 매칭은 throw, 1개만 반환', () => {
    expect(() => selectDbContainer([], 'ZENITH_LMS_001')).toThrow(/찾지 못함/);
    expect(() =>
      selectDbContainer(['supabase_db_ZENITH', 'supabase_db_ZENITH'], 'ZENITH')
    ).toThrow(/모호함/);
    expect(selectDbContainer(['supabase_db_ZENITH_LMS_001'], 'ZENITH_LMS_001')).toBe(
      'supabase_db_ZENITH_LMS_001'
    );
    expect(
      selectDbContainer(['supabase_db_A', 'supabase_db_B'], 'ZENITH_LMS_001', 'supabase_db_B')
    ).toBe('supabase_db_B');
  });

  it('TC-HELPER-02: makeJwt — app_metadata.org_id 클레임 포함, 누락 시 throw', () => {
    const orgId = '11111111-1111-4111-8111-111111111111';
    const token = makeJwt({ sub: 'u1', email: 'u1@test.kr', role: 'SHIPPER', orgId });
    expect(decodeJwtPayload(token).app_metadata?.org_id).toBe(orgId);
    expect(() => makeJwt({ sub: 'u1', email: 'u1@test.kr', role: 'SHIPPER' })).toThrow(/orgId 필수/);
    const negative = makeJwt({
      sub: 'u1',
      email: 'u1@test.kr',
      role: 'SHIPPER',
      allowMissingOrgId: true,
    });
    expect(decodeJwtPayload(negative).app_metadata?.org_id).toBeNull();
  });

  it('TC-HELPER-03: assertOrgIdClaim — 일치 통과, 불일치·null 거부', () => {
    const orgId = '22222222-2222-4222-8222-222222222222';
    const token = makeJwt({ sub: 'u2', email: 'u2@test.kr', role: 'SHIPPER', orgId });
    expect(() => assertOrgIdClaim(token, orgId)).not.toThrow();
    expect(() => assertOrgIdClaim(token, '33333333-3333-4333-8333-333333333333')).toThrow(/불일치/);
    const nullToken = makeJwt({
      sub: 'u2',
      email: 'u2@test.kr',
      role: 'SHIPPER',
      allowMissingOrgId: true,
    });
    expect(() => assertOrgIdClaim(nullToken, orgId)).toThrow(/null/);
  });

  it('TC-HELPER-04: 로컬 전용 가드 — 원격 URL은 getServiceClient에서 즉시 throw', () => {
    expect(() => assertLocalSupabaseUrl('http://127.0.0.1:54321')).not.toThrow();
    expect(() => assertLocalSupabaseUrl('http://localhost:54321')).not.toThrow();
    expect(() => assertLocalSupabaseUrl('https://supabase.example.co.kr')).toThrow(/원격 Supabase/);
    expect(() => assertLocalSupabaseUrl('not-a-url')).toThrow(/유효하지 않은/);

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://remote.example.supabase.co';
    expect(() => getServiceClient()).toThrow(/원격 Supabase/);
  });

  it('TC-HELPER-05: createTestOrg — 트리거가 만든 프로필과 JWT org_id 일치 + 멱등 정리', async () => {
    const identity = await createTestOrg({ prefix: 'helper_unit' });

    const profile = psql(
      `SELECT org_id::text || '|' || role FROM public.zen_profiles WHERE id = '${identity.userId}';`
    );
    expect(profile).toBe(`${identity.orgId}|SHIPPER`);
    assertOrgIdClaim(identity.jwt, identity.orgId);

    const order = psql(
      `SELECT id::text FROM public.zen_orders WHERE shipper_id = '${identity.orgId}' LIMIT 1;`
    );
    expect(order).toBe(''); // 시드 의존 0 — 생성 시점에는 오더 없음

    const calls: string[] = [];
    identity.addCleanup(() => {
      calls.push('first');
    });
    identity.addCleanup(async () => {
      calls.push('second');
    });

    await identity.cleanup();
    expect(calls).toEqual(['second', 'first']); // LIFO
    await identity.cleanup(); // 멱등 — 두 번째 호출은 no-op
    expect(calls).toEqual(['second', 'first']);

    expect(psql(`SELECT count(*)::text FROM public.zen_profiles WHERE id = '${identity.userId}';`)).toBe('0');
    expect(psql(`SELECT count(*)::text FROM auth.users WHERE id = '${identity.userId}';`)).toBe('0');
    expect(
      psql(`SELECT count(*)::text FROM public.zen_organizations WHERE id = '${identity.orgId}';`)
    ).toBe('0');
  });
});
