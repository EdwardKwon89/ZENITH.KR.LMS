import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

// SQL은 $do$ 달러-쿼트 태그 사용 — '$$'는 sh가 PID로 해석하므로 금지
const NEW_USER_INSERT = `
DO $do$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
  VALUES (
    new_user_id,
    '__EMAIL__',
    __METADATA__,
    now(), now()
  );
END $do$;
`;

// DEF-B-039 (Issue #1026): handle_new_user() 트리거 role 폴백 안전성 검증.
// 트리거 실행은 auth.users INSERT로만 발생하므로, 함수 본문의 COALESCE 동작을
// auth.schema에 삽입해 실제 트리거 경로로 검증한다.
describe('DEF-B-039: handle_new_user() 트리거 role 안전 폴백 (Issue #1026)', () => {
  beforeAll(() => {
    // 마이그레이션 20260810120000_fix_handle_new_user_secure_role_fallback.sql이
    // fresh DB(supabase db reset)에 적용된 상태에서 검증
  });

  it('TC-265-07: role 메타데이터 누락 시 ADMIN이 아닌 CORPORATE로 폴백', () => {
    const email = `secure-fallback-${Date.now()}@test.com`;
    const meta = `jsonb_build_object('is_new_org', 'true', 'org_name', '폴백검증', 'org_type', 'AGENCY')`;
    psql(NEW_USER_INSERT.replace('__EMAIL__', email).replace('__METADATA__', meta));

    const profileRole = psql(`
      SELECT role FROM public.zen_profiles WHERE email = '${email}'
    `);
    expect(profileRole).toBe('CORPORATE');
    expect(profileRole).not.toBe('ADMIN');
  });

  it('TC-265-08: role 메타데이터 명시(AGENCY) 시 그대로 부여', () => {
    const email = `secure-role-${Date.now()}@test.com`;
    const meta = `jsonb_build_object('is_new_org', 'true', 'org_name', '역할검증', 'org_type', 'AGENCY', 'role', 'AGENCY')`;
    psql(NEW_USER_INSERT.replace('__EMAIL__', email).replace('__METADATA__', meta));

    const role = psql(`
      SELECT role FROM public.zen_profiles WHERE email = '${email}'
    `);
    expect(role).toBe('AGENCY');
  });
});

describe('DEF-B-039: approve_organization() 방어 하드닝 (Issue #1026)', () => {
  beforeAll(() => {
    // 마이그레이션 20260810130000_harden_approve_organization_rbac.sql이
    // fresh DB(supabase db reset)에 적용된 상태에서 검증
  });

  it('TC-265-09: 조직 내 ADMIN/권한 프로필이 있으면 승인 차단 (RAISE EXCEPTION)', () => {
    const stamp = Date.now();
    // 성공(차단됨)이면 'DO' 반환, 차단되지 않으면 FAIL RAISE → execSync throw → 테스트 실패
    const output = psql(`
      DO $do$
      DECLARE
        v_org_id UUID;
        admin_uid UUID := gen_random_uuid();
        caller_uid UUID := gen_random_uuid();
        result TEXT;
        denied BOOLEAN := FALSE;
      BEGIN
        INSERT INTO public.zen_organizations (name, type, status) VALUES ('테스트조직', 'AGENCY', 'PENDING') RETURNING id INTO v_org_id;
        INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at) VALUES (admin_uid, 'org-admin-${stamp}@test.com', '{}', now(), now());
        UPDATE public.zen_profiles SET role='ADMIN', status='PENDING', org_id=v_org_id WHERE id=admin_uid;
        INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at) VALUES (caller_uid, 'caller-${stamp}@test.com', '{}', now(), now());
        UPDATE public.zen_profiles SET role='ADMIN', status='ACTIVE', org_id=NULL WHERE id=caller_uid;
        PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', caller_uid::text, 'role', 'authenticated')::text, true);
        BEGIN
          result := public.approve_organization(v_org_id);
        EXCEPTION WHEN OTHERS THEN
          denied := TRUE;
        END;
        IF NOT denied THEN
          RAISE EXCEPTION 'FAIL: approve_organization 이 ADMIN 프로필 조직을 승인함';
        END IF;
      END $do$;
    `);
    expect(output).toBe('DO');
  });
});
