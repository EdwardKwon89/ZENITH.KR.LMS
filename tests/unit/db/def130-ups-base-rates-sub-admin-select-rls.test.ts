import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

// DEF-130 (Issue #895, TASK-1135): zen_ups_base_rates SUB_ADMIN SELECT RLS 회귀 테스트.
//
// 마이그레이션 20260819130000_def130_sub_admin_base_rates_select.sql 적용된 fresh DB
// 기준, 실제 authenticated 롤(RLS) 시뮬레이션으로 검증한다:
//   1) 하위 Sub-Agency를 관리 중인 SUB_ADMIN은 활성 기준요금(base_rates)을 SELECT 가능
//   2) 비활성(is_active=false) 요율은 SUB_ADMIN에게도 보이지 않음(is_active=TRUE 조건 유지)
//   3) 하위 Sub-Agency가 없는(고아) SUB_ADMIN은 조회 차단(0행) — has_managed_sub_agency 스코프
//   4) [설계 확정 기록] zen_ups_base_rates는 특정 조직에 귀속되는 컬럼이 없는 플랫폼 공용
//      판매가 카탈로그(AGENCY 역할도 동일)이므로, 서로 다른 Master Agency 소속 SUB_ADMIN도
//      동일하게 조회 가능함 — 이는 테이블 구조상 의도된 동작이며 버그가 아님을 명시적으로 확인
//   5) SUB_ADMIN은 base_rates를 SELECT만 가능하고 UPDATE는 여전히 차단(0행 영향) — 판매가
//      수정 권한은 부여하지 않음(cost_price 관리 경로는 zen_agency_pricing_policies로 유지)
//   6) 되돌리기 검증: SELECT 정책 제거 시 SUB_ADMIN 조회가 0행으로 재현

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

const MASTER_ORG = '13500000-0000-4000-8000-000000000001';
const SUB_ORG = '13500000-0000-4000-8000-000000000002';
const ORPHAN_MASTER_ORG = '13500000-0000-4000-8000-000000000003'; // 하위 Sub-Agency 없음
const OTHER_MASTER_ORG = '13500000-0000-4000-8000-000000000004';
const OTHER_SUB_ORG = '13500000-0000-4000-8000-000000000005';

const SUB_ADMIN_USER = '13500000-0000-4000-8000-000000000011';
const ORPHAN_SUB_ADMIN_USER = '13500000-0000-4000-8000-000000000012';
const OTHER_SUB_ADMIN_USER = '13500000-0000-4000-8000-000000000013';

const TEST_PRODUCT = '13500000-0000-4000-8000-000000000021';
const TEST_ZONE = '13500000-0000-4000-8000-000000000022';
const ACTIVE_RATE = '13500000-0000-4000-8000-000000000031';
const INACTIVE_RATE = '13500000-0000-4000-8000-000000000032';

const LATEST_POLICY_SQL = `
  DROP POLICY IF EXISTS "ups_base_rates_sub_admin_select" ON public.zen_ups_base_rates;
  CREATE POLICY "ups_base_rates_sub_admin_select"
    ON public.zen_ups_base_rates FOR SELECT
    TO authenticated
    USING (
      is_active = TRUE
      AND public.has_managed_sub_agency(auth.uid())
    );
`;

function cleanupFixture() {
  psql(`
    DELETE FROM public.zen_ups_base_rates WHERE id IN ('${ACTIVE_RATE}','${INACTIVE_RATE}');
    DELETE FROM public.zen_ups_products WHERE id = '${TEST_PRODUCT}';
    DELETE FROM public.zen_ups_zones WHERE id = '${TEST_ZONE}';
    DELETE FROM public.zen_profiles WHERE id IN ('${SUB_ADMIN_USER}','${ORPHAN_SUB_ADMIN_USER}','${OTHER_SUB_ADMIN_USER}');
    DELETE FROM auth.users WHERE id IN ('${SUB_ADMIN_USER}','${ORPHAN_SUB_ADMIN_USER}','${OTHER_SUB_ADMIN_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${MASTER_ORG}','${SUB_ORG}','${ORPHAN_MASTER_ORG}','${OTHER_MASTER_ORG}','${OTHER_SUB_ORG}');
  `);
}

function setupFixture() {
  // 최신 마이그레이션 정책을 항상 보장 — 이전 실행/되돌리기 테스트가 원복 상태로 남겨놓았을 수 있음
  psql(LATEST_POLICY_SQL);
  cleanupFixture();
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${MASTER_ORG}', '135 Master Agency', 'AGENCY', 'ACTIVE'),
      ('${SUB_ORG}', '135 Sub Agency', 'AGENCY', 'ACTIVE'),
      ('${ORPHAN_MASTER_ORG}', '135 Orphan Master Agency', 'AGENCY', 'ACTIVE'),
      ('${OTHER_MASTER_ORG}', '135 Other Master Agency', 'AGENCY', 'ACTIVE'),
      ('${OTHER_SUB_ORG}', '135 Other Sub Agency', 'AGENCY', 'ACTIVE');
    UPDATE public.zen_organizations SET parent_id = '${MASTER_ORG}' WHERE id = '${SUB_ORG}';
    UPDATE public.zen_organizations SET parent_id = '${OTHER_MASTER_ORG}' WHERE id = '${OTHER_SUB_ORG}';

    INSERT INTO auth.users (id, email) VALUES
      ('${SUB_ADMIN_USER}', '135-subadmin@test.kr'),
      ('${ORPHAN_SUB_ADMIN_USER}', '135-orphan-subadmin@test.kr'),
      ('${OTHER_SUB_ADMIN_USER}', '135-other-subadmin@test.kr');
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${SUB_ADMIN_USER}', '${MASTER_ORG}', '135-subadmin@test.kr', 'SUB_ADMIN', 'ACTIVE'),
      ('${ORPHAN_SUB_ADMIN_USER}', '${ORPHAN_MASTER_ORG}', '135-orphan-subadmin@test.kr', 'SUB_ADMIN', 'ACTIVE'),
      ('${OTHER_SUB_ADMIN_USER}', '${OTHER_MASTER_ORG}', '135-other-subadmin@test.kr', 'SUB_ADMIN', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;

    INSERT INTO public.zen_ups_products (id, product_code, product_name, cargo_type, is_active) VALUES
      ('${TEST_PRODUCT}', 'DEF130_TEST_PRODUCT', 'DEF-130 테스트 상품', 'BOTH', TRUE);
    INSERT INTO public.zen_ups_zones (id, zone_code, zone_name, is_active) VALUES
      ('${TEST_ZONE}', 'D130Z', 'DEF-130 테스트 구간', TRUE);
    INSERT INTO public.zen_ups_base_rates (id, product_id, zone_id, weight_kg, selling_price, cost_price, valid_from, is_active) VALUES
      ('${ACTIVE_RATE}', '${TEST_PRODUCT}', '${TEST_ZONE}', 1.0, 30000, 20000, '2026-01-01', TRUE),
      ('${INACTIVE_RATE}', '${TEST_PRODUCT}', '${TEST_ZONE}', 2.0, 40000, 25000, '2026-01-01', FALSE);
  `);
}

// authenticated 롤 + JWT sub 시뮬레이션으로 SELECT 결과 개수 반환.
function countAsAuthenticated(userId: string, rateId: string): number {
  const out = psql(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', jsonb_build_object('sub', '${userId}', 'role', 'authenticated')::text, false);
    SELECT count(*) FROM public.zen_ups_base_rates WHERE id = '${rateId}';
    RESET ROLE;
  `);
  const lines = out.split('\n').filter((l) => /^\d+$/.test(l.trim()));
  return lines.length ? parseInt(lines[lines.length - 1], 10) : 0;
}

// authenticated 롤 + JWT sub 시뮬레이션으로 UPDATE 시도 후 영향받은 행 수 반환.
function updateAttemptAsAuthenticated(userId: string, rateId: string): number {
  const out = psql(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', jsonb_build_object('sub', '${userId}', 'role', 'authenticated')::text, false);
    WITH updated AS (
      UPDATE public.zen_ups_base_rates SET selling_price = selling_price + 1
      WHERE id = '${rateId}'
      RETURNING id
    )
    SELECT count(*) FROM updated;
    RESET ROLE;
  `);
  const lines = out.split('\n').filter((l) => /^\d+$/.test(l.trim()));
  return lines.length ? parseInt(lines[lines.length - 1], 10) : 0;
}

describe('DEF-130 (Issue #895): zen_ups_base_rates SUB_ADMIN SELECT RLS', () => {
  beforeAll(() => {
    setupFixture();
  });
  afterAll(() => {
    cleanupFixture();
  });

  it('TC-DEF130-01: 하위 Sub-Agency를 관리하는 SUB_ADMIN은 활성 기준요금을 SELECT 가능', () => {
    const cnt = countAsAuthenticated(SUB_ADMIN_USER, ACTIVE_RATE);
    expect(cnt).toBe(1);
  });

  it('TC-DEF130-02: 비활성(is_active=false) 요율은 SUB_ADMIN에게도 보이지 않음', () => {
    const cnt = countAsAuthenticated(SUB_ADMIN_USER, INACTIVE_RATE);
    expect(cnt).toBe(0);
  });

  it('TC-DEF130-03: 하위 Sub-Agency가 없는(고아) SUB_ADMIN은 조회 차단(0행) — has_managed_sub_agency 스코프', () => {
    const cnt = countAsAuthenticated(ORPHAN_SUB_ADMIN_USER, ACTIVE_RATE);
    expect(cnt).toBe(0);
  });

  it('TC-DEF130-04: [설계 확정] 다른 Master Agency 소속 SUB_ADMIN도 동일한 공용 판매가 카탈로그를 조회 가능 — base_rates는 조직 귀속 컬럼이 없는 플랫폼 공용 테이블이므로 의도된 동작', () => {
    const cnt = countAsAuthenticated(OTHER_SUB_ADMIN_USER, ACTIVE_RATE);
    expect(cnt).toBe(1);
  });

  it('TC-DEF130-05: SUB_ADMIN은 base_rates를 SELECT만 가능하고 UPDATE(판매가 수정)는 여전히 차단(0행 영향)', () => {
    const affected = updateAttemptAsAuthenticated(SUB_ADMIN_USER, ACTIVE_RATE);
    expect(affected).toBe(0);
    // 실제로 값이 바뀌지 않았는지 service_role로 재확인
    const price = psql(`SELECT selling_price FROM public.zen_ups_base_rates WHERE id = '${ACTIVE_RATE}';`);
    expect(price).toBe('30000.00');
  });
});

describe('DEF-130: 되돌리기 검증 — SELECT 정책 제거 시 SUB_ADMIN 조회 재차단', () => {
  beforeAll(() => {
    setupFixture();
  });
  afterAll(() => {
    cleanupFixture();
  });

  it('TC-DEF130-06: "ups_base_rates_sub_admin_select" 정책 제거 → SUB_ADMIN 조회 0행 재현, 복원 후 1행', () => {
    psql(`DROP POLICY IF EXISTS "ups_base_rates_sub_admin_select" ON public.zen_ups_base_rates;`);

    const blocked = countAsAuthenticated(SUB_ADMIN_USER, ACTIVE_RATE);
    expect(blocked).toBe(0);

    psql(LATEST_POLICY_SQL);

    const restored = countAsAuthenticated(SUB_ADMIN_USER, ACTIVE_RATE);
    expect(restored).toBe(1);
  });
});
