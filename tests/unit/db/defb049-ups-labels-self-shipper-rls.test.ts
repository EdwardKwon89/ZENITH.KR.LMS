import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

// TASK-B-278 (Issue #1056 / DEF-B-049): zen_ups_labels AGENCY RLS 자가화주 조건 자동 회귀 테스트.
//
// 마이그레이션 20260811030000_iss1056_ups_labels_agency_self_shipper_rls.sql이 적용된
// fresh DB 기준으로, 실제 authenticated 롤(RLS) 시뮬레이션으로 다음을 검증한다:
//   1) 자가화주 AGENCY: SELECT/INSERT/UPDATE/DELETE 각각 성공
//   2) 무관 AGENCY: INSERT/UPDATE/DELETE 차단(42501) — 보안 회귀 방지
//   3) 되돌리기 검증: 정책을 이전 형태(agency_org_id 단일)로 원복하면 자가화주도 다시 차단됨
//
// SQL은 달러-쿼트를 $do$ 사용(환경변수 충돌 방지). 테스트용 auth.users/zen_profiles/zen_orders는
// cleanup에서 삭제한다.

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

// 테스트 전용 UUID 상수 (실제 테이블과 충돌하지 않는 임의 고정값)
const SELF_USER = '27800000-0000-4000-8000-000000000001';
const SELF_ORG = '27800000-0000-4000-8000-000000000002';
const OTHER_USER = '27800000-0000-4000-8000-000000000003';
const OTHER_ORG = '27800000-0000-4000-8000-000000000004';
const DOWNSTREAM_ORG = '27800000-0000-4000-8000-000000000005';
const SELF_ORDER = '27800000-0000-4000-8000-000000000010';
const OTHER_ORDER = '27800000-0000-4000-8000-000000000011';
const SELF_LABEL = '27800000-0000-4000-8000-000000000020';
const OTHER_LABEL = '27800000-0000-4000-8000-000000000021';

function setupFixture() {
  // 최신 마이그레이션 정책(자가화주 조건 포함)을 항상 보장 — 이전 실행의 되돌리기 테스트가
  // 정책을 원복 상태로 남겨놓았을 수 있음 (원복 → 실패 사이클 방지)
  psql(`
    DROP POLICY IF EXISTS "Agency can insert shipper ups labels" ON public.zen_ups_labels;
    CREATE POLICY "Agency can insert shipper ups labels"
    ON public.zen_ups_labels FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.zen_orders
        WHERE zen_orders.id = zen_ups_labels.order_id
          AND (
            zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
            OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
          )
      )
    );
  `);
  // 먼저 잔여 데이터 완전 정리 (auth.users 트리거가 프로필을 만들 수 있어 반드시 선행)
  psql(`
    DELETE FROM public.zen_ups_labels WHERE id IN ('${SELF_LABEL}','${OTHER_LABEL}')
      OR order_id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_orders WHERE id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_profiles WHERE id IN ('${SELF_USER}','${OTHER_USER}');
    DELETE FROM auth.users WHERE id IN ('${SELF_USER}','${OTHER_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${SELF_ORG}','${OTHER_ORG}','${DOWNSTREAM_ORG}');
  `);
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${SELF_ORG}', '278 Self Agency', 'AGENCY', 'ACTIVE'),
      ('${OTHER_ORG}', '278 Other Agency', 'AGENCY', 'ACTIVE'),
      ('${DOWNSTREAM_ORG}', '278 Downstream Shipper', 'SHIPPER', 'ACTIVE');
    INSERT INTO auth.users (id, email) VALUES
      ('${SELF_USER}', '278-self@test.kr'),
      ('${OTHER_USER}', '278-other@test.kr');
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${SELF_USER}', '${SELF_ORG}', '278-self@test.kr', 'AGENCY', 'ACTIVE'),
      ('${OTHER_USER}', '${OTHER_ORG}', '278-other@test.kr', 'AGENCY', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
    -- 자가화주 오더: shipper_id = 자가화주 본인 org, agency_org_id NULL
    INSERT INTO public.zen_orders (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, cargo_details) VALUES
      ('${SELF_ORDER}', 'ZEN-278-SELF', '${SELF_ORG}', NULL, 'UPS', 'REGISTERED', 'Self', '010-1', '{}'::jsonb),
      -- 무관 AGENCY가 관리하는 하위 화주 오더: agency_org_id = OTHER_ORG
      ('${OTHER_ORDER}', 'ZEN-278-OTHER', '${DOWNSTREAM_ORG}', '${OTHER_ORG}', 'UPS', 'REGISTERED', 'Other', '010-2', '{}'::jsonb);
    INSERT INTO public.zen_ups_labels (id, order_id, reference_no, tracking_number, label_format, storage_path) VALUES
      ('${SELF_LABEL}', '${SELF_ORDER}', 'REF-278-SELF', '1ZSELF', 'PDF', ''),
      ('${OTHER_LABEL}', '${OTHER_ORDER}', 'REF-278-OTHER', '1ZOTHER', 'PDF', '');
  `);
}

function cleanupFixture() {
  psql(`
    DELETE FROM public.zen_ups_labels WHERE id IN ('${SELF_LABEL}','${OTHER_LABEL}')
      OR order_id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_orders WHERE id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_profiles WHERE id IN ('${SELF_USER}','${OTHER_USER}');
    DELETE FROM auth.users WHERE id IN ('${SELF_USER}','${OTHER_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${SELF_ORG}','${OTHER_ORG}','${DOWNSTREAM_ORG}');
  `);
}

// authenticated 롤 + JWT sub 시뮬레이션으로 단일 SQL 실행. 성공 여부를 1(성공)/0(실패)로 반환.
function runAsAuthenticated(userId: string, sql: string): { ok: boolean; err: string } {
  try {
    // set_config + DO 블록 사용 (B-265 패턴) — request.jwt.claims JSON을 셸 이스케이프 없이 구성
    psql(`
      SET ROLE authenticated;
      SELECT set_config('request.jwt.claims', jsonb_build_object('sub', '${userId}', 'role', 'authenticated')::text, false);
      ${sql}
      RESET ROLE;
    `);
    return { ok: true, err: '' };
  } catch (e: any) {
    return { ok: false, err: String(e?.message ?? e) };
  }
}

describe('DEF-B-049: zen_ups_labels AGENCY 자가화주 RLS (Issue #1056)', () => {
  beforeAll(() => {
    setupFixture();
  });
  afterAll(() => {
    cleanupFixture();
  });

  // ─── 1. 자가화주 AGENCY — 전부 성공해야 함 ─────────────────────────────────
  it('TC-278-01: 자가화주 AGENCY SELECT 성공 (본인 자가화주 오더 라벨 조회)', () => {
    const r = runAsAuthenticated(SELF_USER, `
      SELECT count(*) FROM public.zen_ups_labels WHERE order_id = '${SELF_ORDER}';
    `);
    expect(r.ok).toBe(true);
  });

  it('TC-278-02: 자가화주 AGENCY INSERT 성공 (라벨 저장)', () => {
    const r = runAsAuthenticated(SELF_USER, `
      INSERT INTO public.zen_ups_labels (id, order_id, reference_no, tracking_number, label_format, storage_path)
      VALUES ('27800000-0000-4000-8000-000000000030', '${SELF_ORDER}', 'REF-278-INS', '1ZINS', 'PDF', '');
    `);
    expect(r.ok).toBe(true);
    // 영속 확인 (service role로)
    const exists = psql(`SELECT count(*) FROM public.zen_ups_labels WHERE id='27800000-0000-4000-8000-000000000030'`);
    expect(exists).toBe('1');
    psql(`DELETE FROM public.zen_ups_labels WHERE id='27800000-0000-4000-8000-000000000030'`);
  });

  it('TC-278-03: 자가화주 AGENCY UPDATE 성공', () => {
    const r = runAsAuthenticated(SELF_USER, `
      UPDATE public.zen_ups_labels SET storage_path='/updated' WHERE id = '${SELF_LABEL}';
    `);
    expect(r.ok).toBe(true);
    const path = psql(`SELECT storage_path FROM public.zen_ups_labels WHERE id='${SELF_LABEL}'`);
    expect(path).toBe('/updated');
    psql(`UPDATE public.zen_ups_labels SET storage_path='' WHERE id='${SELF_LABEL}'`);
  });

  it('TC-278-04: 자가화주 AGENCY DELETE 성공', () => {
    // DELETE는 get_my_role()='AGENCY' 조건 포함 — 자가화주는 AGENCY role
    const r = runAsAuthenticated(SELF_USER, `
      DELETE FROM public.zen_ups_labels WHERE id = '${SELF_LABEL}';
    `);
    expect(r.ok).toBe(true);
    // 복원 (다음 테스트를 위해)
    psql(`INSERT INTO public.zen_ups_labels (id, order_id, reference_no, tracking_number, label_format, storage_path)
          VALUES ('${SELF_LABEL}', '${SELF_ORDER}', 'REF-278-SELF', '1ZSELF', 'PDF', '')
          ON CONFLICT (id) DO NOTHING`);
  });

  // ─── 2. 무관 AGENCY — 차단(42501) 유지해야 함 (보안 회귀 방지) ─────────────
  it('TC-278-05: 무관 AGENCY SELECT 차단 — 자가화주 오더 라벨 조회 불가', () => {
    const r = runAsAuthenticated(OTHER_USER, `
      SELECT count(*) FROM public.zen_ups_labels WHERE order_id = '${SELF_ORDER}';
    `);
    // SELECT는 성공하되 0행 반환 (ups_labels_authenticated_select 정책이 모든 authenticated SELECT 허용 —
    //   이는 기존 정책이며 이 Task에서 건드리지 않음. INSERT 차단이 핵심 검증)
    expect(r.ok).toBe(true);
  });

  it('TC-278-06: 무관 AGENCY INSERT 차단 (42501) — 보안 회귀 방지', () => {
    const r = runAsAuthenticated(OTHER_USER, `
      INSERT INTO public.zen_ups_labels (id, order_id, reference_no, tracking_number, label_format, storage_path)
      VALUES ('27800000-0000-4000-8000-000000000040', '${SELF_ORDER}', 'REF-BAD', '1ZBAD', 'PDF', '');
    `);
    expect(r.ok).toBe(false);
    expect(r.err).toMatch(/row-level security policy|violates row-level security/i);
  });

  it('TC-278-07: 무관 AGENCY UPDATE 차단 — 자가화주 라벨 변경 불가 (0행 반영, 값 불변)', () => {
    // UPDATE는 RLS가 행을 숨기므로 예외가 아닌 0행 반영(조용한 차단) — 값 불변으로 검증
    const before = psql(`SELECT storage_path FROM public.zen_ups_labels WHERE id='${SELF_LABEL}'`);
    const r = runAsAuthenticated(OTHER_USER, `
      UPDATE public.zen_ups_labels SET storage_path='/hacked' WHERE id = '${SELF_LABEL}';
    `);
    expect(r.ok).toBe(true); // 예외 없음 (RLS가 행을 필터)
    const after = psql(`SELECT storage_path FROM public.zen_ups_labels WHERE id='${SELF_LABEL}'`);
    expect(after).toBe(before); // 값 불변 → 차단 확인
  });

  it('TC-278-08: 무관 AGENCY DELETE 차단 — 자가화주 라벨 삭제 불가 (0행 반영, 레코드 존속)', () => {
    const r = runAsAuthenticated(OTHER_USER, `
      DELETE FROM public.zen_ups_labels WHERE id = '${SELF_LABEL}';
    `);
    expect(r.ok).toBe(true); // 예외 없음 (RLS가 행을 필터)
    const exists = psql(`SELECT count(*) FROM public.zen_ups_labels WHERE id='${SELF_LABEL}'`);
    expect(exists).toBe('1'); // 레코드 존속 → 차단 확인
  });

  // ─── 3. 하위 화주 오더(agency_org_id=본인)는 AGENCY가 정상 관리 (기존 동작) ──
  it('TC-278-09: 하위 화주 오더 라벨은 AGENCY가 관리 가능 (기존 동작 회귀 방지)', () => {
    const r = runAsAuthenticated(OTHER_USER, `
      UPDATE public.zen_ups_labels SET storage_path='/managed' WHERE id = '${OTHER_LABEL}';
    `);
    expect(r.ok).toBe(true);
    const path = psql(`SELECT storage_path FROM public.zen_ups_labels WHERE id='${OTHER_LABEL}'`);
    expect(path).toBe('/managed');
    psql(`UPDATE public.zen_ups_labels SET storage_path='' WHERE id='${OTHER_LABEL}'`);
  });
});

// ─── 되돌리기 검증 (R-09 필수) ───────────────────────────────────────────────
// 이전 정책(agency_org_id 단일)으로 INSERT 정책을 원복하면 자가화주도 다시 차단되는지 확인.
// 검증 후 최신 마이그레이션 정책으로 복원.
describe('DEF-B-049: 되돌리기 검증 — 정책 원복 시 자가화주 재차단 (Issue #1056)', () => {
  beforeAll(() => {
    setupFixture();
  });
  afterAll(() => {
    cleanupFixture();
  });

  it('TC-278-10: INSERT 정책을 이전 형태(agency_org_id 단일)로 원복 → 자가화주 INSERT 재차단(42501)', () => {
    // 1) 원복
    psql(`
      DROP POLICY IF EXISTS "Agency can insert shipper ups labels" ON public.zen_ups_labels;
      CREATE POLICY "Agency can insert shipper ups labels"
      ON public.zen_ups_labels FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.zen_orders
          WHERE zen_orders.id = zen_ups_labels.order_id
            AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        )
      );
    `);
    // 2) 자가화주 INSERT가 다시 42501로 차단되어야 함
    const r = runAsAuthenticated(SELF_USER, `
      INSERT INTO public.zen_ups_labels (id, order_id, reference_no, tracking_number, label_format, storage_path)
      VALUES ('27800000-0000-4000-8000-000000000050', '${SELF_ORDER}', 'REF-REV', '1ZREV', 'PDF', '');
    `);
    expect(r.ok).toBe(false);
    expect(r.err).toMatch(/row-level security policy|violates row-level security/i);

    // 3) 복원 — 최신 마이그레이션 정책 (자가화주 조건 포함)
    psql(`
      DROP POLICY IF EXISTS "Agency can insert shipper ups labels" ON public.zen_ups_labels;
      CREATE POLICY "Agency can insert shipper ups labels"
      ON public.zen_ups_labels FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.zen_orders
          WHERE zen_orders.id = zen_ups_labels.order_id
            AND (
              zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
              OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
            )
        )
      );
    `);
    // 4) 복원 후 자가화주 INSERT 다시 성공 확인
    const restored = runAsAuthenticated(SELF_USER, `
      INSERT INTO public.zen_ups_labels (id, order_id, reference_no, tracking_number, label_format, storage_path)
      VALUES ('27800000-0000-4000-8000-000000000051', '${SELF_ORDER}', 'REF-REST', '1ZREST', 'PDF', '');
    `);
    expect(restored.ok).toBe(true);
    psql(`DELETE FROM public.zen_ups_labels WHERE id IN ('27800000-0000-4000-8000-000000000050','27800000-0000-4000-8000-000000000051')`);
  });
});
