import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

// TASK-B-285 (Issue #1071): zen_ups_label_errors AGENCY SELECT RLS 회귀 테스트.
//
// 마이그레이션 20260811030000_iss1071_ups_label_errors_agency_select_rls.sql의 정책이
// 적용된 fresh DB 기준, 실제 authenticated 롤(RLS) 시뮬레이션으로 검증한다:
//   1) AGENCY(하위 화주 관리자)는 본인 소속 오더의 에러를 SELECT 가능
//   2) 자가화주 AGENCY(TASK-B-274/DEF-B-046 패턴)도 본인 오더 에러 SELECT 가능
//   3) 무관 AGENCY는 조회 차단(0행) — 보안 회귀 방지
//   4) 되돌리기 검증: SELECT 정책 제거 시 AGENCY 조회가 0행으로 재현
//
// SQL은 $do$ 달러-쿼트 사용(환경변수 충돌 방지). 테스트 전용 데이터는 cleanup에서 삭제한다.

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

const AGENCY_USER = '28500000-0000-4000-8000-000000000001';
const AGENCY_ORG = '28500000-0000-4000-8000-000000000002';
const OTHER_USER = '28500000-0000-4000-8000-000000000003';
const OTHER_ORG = '28500000-0000-4000-8000-000000000004';
const DOWNSTREAM_ORG = '28500000-0000-4000-8000-000000000005';
const SELF_ORDER = '28500000-0000-4000-8000-000000000010';
const OTHER_ORDER = '28500000-0000-4000-8000-000000000011';
const SELF_ERROR = '28500000-0000-4000-8000-000000000020';
const OTHER_ERROR = '28500000-0000-4000-8000-000000000021';

function setupFixture() {
  // 최신 마이그레이션 정책(AGENCY SELECT)을 항상 보장 — 이전 실행의 되돌리기 테스트가
  // 정책을 원복 상태로 남겨놓았을 수 있음
  psql(`
    DROP POLICY IF EXISTS "Agency can view shipper ups label errors" ON public.zen_ups_label_errors;
    CREATE POLICY "Agency can view shipper ups label errors"
    ON public.zen_ups_label_errors FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.zen_orders
        WHERE zen_orders.id = zen_ups_label_errors.order_id
          AND (
            zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
            OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
          )
      )
    );
  `);
  // 잔여 데이터 정리 (auth.users 트리거가 프로필을 만들 수 있어 반드시 선행)
  psql(`
    DELETE FROM public.zen_ups_label_errors WHERE id IN ('${SELF_ERROR}','${OTHER_ERROR}')
      OR order_id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_orders WHERE id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_profiles WHERE id IN ('${AGENCY_USER}','${OTHER_USER}');
    DELETE FROM auth.users WHERE id IN ('${AGENCY_USER}','${OTHER_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${AGENCY_ORG}','${OTHER_ORG}','${DOWNSTREAM_ORG}');
  `);
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${AGENCY_ORG}', '285 Agency', 'AGENCY', 'ACTIVE'),
      ('${OTHER_ORG}', '285 Other Agency', 'AGENCY', 'ACTIVE'),
      ('${DOWNSTREAM_ORG}', '285 Downstream Shipper', 'SHIPPER', 'ACTIVE');
    INSERT INTO auth.users (id, email) VALUES
      ('${AGENCY_USER}', '285-agency@test.kr'),
      ('${OTHER_USER}', '285-other@test.kr');
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${AGENCY_USER}', '${AGENCY_ORG}', '285-agency@test.kr', 'AGENCY', 'ACTIVE'),
      ('${OTHER_USER}', '${OTHER_ORG}', '285-other@test.kr', 'AGENCY', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
    -- 하위 화주 오더: agency_org_id = AGENCY_ORG
    INSERT INTO public.zen_orders (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, cargo_details) VALUES
      ('${SELF_ORDER}', 'ZEN-285-SELF', '${DOWNSTREAM_ORG}', '${AGENCY_ORG}', 'UPS', 'WAREHOUSED', 'Self', '010-1', '{}'::jsonb),
      -- 무관 AGENCY가 관리하는 오더
      ('${OTHER_ORDER}', 'ZEN-285-OTHER', '${DOWNSTREAM_ORG}', '${OTHER_ORG}', 'UPS', 'WAREHOUSED', 'Other', '010-2', '{}'::jsonb);
    INSERT INTO public.zen_ups_label_errors (id, order_id, shxk_code, error_message) VALUES
      ('${SELF_ERROR}', '${SELF_ORDER}', 'A', '收件人城市不能为空'),
      ('${OTHER_ERROR}', '${OTHER_ORDER}', 'B', '收件人邮编不能为空');
  `);
}

function cleanupFixture() {
  psql(`
    DELETE FROM public.zen_ups_label_errors WHERE id IN ('${SELF_ERROR}','${OTHER_ERROR}')
      OR order_id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_orders WHERE id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_profiles WHERE id IN ('${AGENCY_USER}','${OTHER_USER}');
    DELETE FROM auth.users WHERE id IN ('${AGENCY_USER}','${OTHER_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${AGENCY_ORG}','${OTHER_ORG}','${DOWNSTREAM_ORG}');
  `);
}

// authenticated 롤 + JWT sub 시뮬레이션으로 SELECT 결과 개수 반환. 실패 시 throw.
function countAsAuthenticated(userId: string, orderId: string): number {
  const out = psql(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', jsonb_build_object('sub', '${userId}', 'role', 'authenticated')::text, false);
    SELECT count(*) FROM public.zen_ups_label_errors WHERE order_id = '${orderId}';
    RESET ROLE;
  `);
  // 마지막 SELECT 결과 행만 취함
  const lines = out.split('\n').filter((l) => /^\d+$/.test(l.trim()));
  return lines.length ? parseInt(lines[lines.length - 1], 10) : 0;
}

describe('TASK-B-285 (Issue #1071): zen_ups_label_errors AGENCY SELECT RLS', () => {
  beforeAll(() => {
    setupFixture();
  });
  afterAll(() => {
    cleanupFixture();
  });

  it('TC-285-11: 하위 화주 오더 에러는 AGENCY가 조회 가능 (본인 소속)', () => {
    const cnt = countAsAuthenticated(AGENCY_USER, SELF_ORDER);
    expect(cnt).toBe(1);
  });

  it('TC-285-12: 무관 AGENCY는 타 소속 오더 에러 조회 차단 (0행) — 보안 회귀 방지', () => {
    const cnt = countAsAuthenticated(OTHER_USER, SELF_ORDER);
    expect(cnt).toBe(0);
    // 반대로 AGENCY_USER도 OTHER_ORDER를 볼 수 없어야 함
    const cnt2 = countAsAuthenticated(AGENCY_USER, OTHER_ORDER);
    expect(cnt2).toBe(0);
  });

  it('TC-285-13: 자가화주 AGENCY(본인 org가 shipper_id)도 본인 오더 에러 조회 가능 (DEF-B-046 패턴)', () => {
    // 자가화주 오더 추가: shipper_id = AGENCY_ORG, agency_org_id NULL
    psql(`
      INSERT INTO public.zen_orders (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, cargo_details)
      VALUES ('28500000-0000-4000-8000-000000000012', 'ZEN-285-SELF2', '${AGENCY_ORG}', NULL, 'UPS', 'WAREHOUSED', 'Self2', '010-3', '{}'::jsonb);
      INSERT INTO public.zen_ups_label_errors (id, order_id, shxk_code, error_message)
      VALUES ('28500000-0000-4000-8000-000000000022', '28500000-0000-4000-8000-000000000012', 'C', '자가화주 에러');
    `);
    const cnt = countAsAuthenticated(AGENCY_USER, '28500000-0000-4000-8000-000000000012');
    expect(cnt).toBe(1);
    // 정리
    psql(`
      DELETE FROM public.zen_ups_label_errors WHERE order_id='28500000-0000-4000-8000-000000000012';
      DELETE FROM public.zen_orders WHERE id='28500000-0000-4000-8000-000000000012';
    `);
  });
});

describe('TASK-B-285: 되돌리기 검증 — SELECT 정책 제거 시 AGENCY 조회 재차단', () => {
  beforeAll(() => {
    setupFixture();
  });
  afterAll(() => {
    cleanupFixture();
  });

  it('TC-285-14: "Agency can view shipper ups label errors" 정책 제거 → AGENCY 조회 0행 재현, 복원 후 1행', () => {
    // 1) 원복 (정책 제거)
    psql(`DROP POLICY IF EXISTS "Agency can view shipper ups label errors" ON public.zen_ups_label_errors;`);

    // 2) AGENCY 조회가 0행으로 재차단되어야 함 (SELECT 정책 부재 → RLS 기본 deny)
    const blocked = countAsAuthenticated(AGENCY_USER, SELF_ORDER);
    expect(blocked).toBe(0);

    // 3) 복원 — 최신 마이그레이션 정책
    psql(`
      CREATE POLICY "Agency can view shipper ups label errors"
      ON public.zen_ups_label_errors FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.zen_orders
          WHERE zen_orders.id = zen_ups_label_errors.order_id
            AND (
              zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
              OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
            )
        )
      );
    `);

    // 4) 복원 후 다시 1행 조회 가능
    const restored = countAsAuthenticated(AGENCY_USER, SELF_ORDER);
    expect(restored).toBe(1);
  });
});
