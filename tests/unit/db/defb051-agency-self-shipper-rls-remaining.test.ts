import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

// TASK-B-279 (Issue #1058 / DEF-B-051): AGENCY 자가화주 RLS 잔여 차단 4곳 자동 회귀 테스트.
//
// 마이그레이션 20260811040000_iss1058_agency_self_shipper_rls_remaining.sql이 적용된
// fresh DB 기준으로, 실제 authenticated 롤(RLS) 시뮬레이션으로 다음을 검증한다:
//   1) 자가화주 AGENCY(본인을 화주로 등록, agency_org_id=NULL):
//      - zen_tracking_configs UPDATE / zen_ups_label_documents DELETE /
//        zen_ups_label_errors INSERT / storage.objects INSERT·SELECT·DELETE 각각 성공
//   2) 무관 AGENCY(해당 오더와 무관): 전부 차단 — 보안 회귀 방지
//   3) 되돌리기 검증: 정책을 이전 형태(agency_org_id 단일)로 원복하면 자가화주도 다시 차단됨
//
// ⚠️ IMP-163 준수: 이 테스트의 setupFixture는 검증 대상 RLS 정책을 절대 생성/재생성하지 않는다.
//    마이그레이션이 만든 실제 정책 상태를 그대로 검증한다. (되돌리기 검증 블록에서만
//    의도적으로 원복→확인→복원하고, 복원도 마이그레이션과 동일한 SQL을 사용)
//
// SQL은 달러-쿼트 $do$ 대신 셸 이스케이프 사용. 테스트용 auth.users/zen_profiles/zen_orders는
// cleanup에서 삭제한다.

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

// 테스트 전용 UUID 상수 (실제 테이블과 충돌하지 않는 임의 고정값)
const SELF_USER = '27900000-0000-4000-8000-000000000001';
const SELF_ORG = '27900000-0000-4000-8000-000000000002';
const OTHER_USER = '27900000-0000-4000-8000-000000000003';
const OTHER_ORG = '27900000-0000-4000-8000-000000000004';
const DOWNSTREAM_ORG = '27900000-0000-4000-8000-000000000005';
const SELF_ORDER = '27900000-0000-4000-8000-000000000010';
const OTHER_ORDER = '27900000-0000-4000-8000-000000000011';
const SELF_DOC = '27900000-0000-4000-8000-000000000020';
const SELF_STORAGE = 'ups-labels/27900000-0000-4000-8000-000000000010/a.pdf';

function setupFixture() {
  // 검증 대상 RLS 정책은 건드리지 않는다 (IMP-163) — 데이터만 준비/정리
  psql(`
    SET storage.allow_delete_query = 'true';
    DELETE FROM public.zen_ups_label_documents WHERE order_id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_ups_label_errors WHERE order_id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_tracking_configs WHERE order_id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM storage.objects WHERE name LIKE 'ups-labels/279%';
    DELETE FROM public.zen_orders WHERE id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_profiles WHERE id IN ('${SELF_USER}','${OTHER_USER}');
    DELETE FROM auth.users WHERE id IN ('${SELF_USER}','${OTHER_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${SELF_ORG}','${OTHER_ORG}','${DOWNSTREAM_ORG}');
  `);
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${SELF_ORG}', '279 Self Agency', 'AGENCY', 'ACTIVE'),
      ('${OTHER_ORG}', '279 Other Agency', 'AGENCY', 'ACTIVE'),
      ('${DOWNSTREAM_ORG}', '279 Downstream Shipper', 'SHIPPER', 'ACTIVE');
    INSERT INTO auth.users (id, email) VALUES
      ('${SELF_USER}', '279-self@test.kr'),
      ('${OTHER_USER}', '279-other@test.kr');
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${SELF_USER}', '${SELF_ORG}', '279-self@test.kr', 'AGENCY', 'ACTIVE'),
      ('${OTHER_USER}', '${OTHER_ORG}', '279-other@test.kr', 'AGENCY', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
    -- 자가화주 오더: shipper_id = 자가화주 본인 org, agency_org_id NULL
    INSERT INTO public.zen_orders (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, cargo_details) VALUES
      ('${SELF_ORDER}', 'ZEN-279-SELF', '${SELF_ORG}', NULL, 'UPS', 'REGISTERED', 'Self', '010-1', '{}'::jsonb),
      -- 무관 AGENCY가 관리하는 하위 화주 오더: agency_org_id = OTHER_ORG
      ('${OTHER_ORDER}', 'ZEN-279-OTHER', '${DOWNSTREAM_ORG}', '${OTHER_ORG}', 'UPS', 'REGISTERED', 'Other', '010-2', '{}'::jsonb);
    INSERT INTO public.zen_tracking_configs (order_id, tracking_no, provider_type, provider_name) VALUES
      ('${SELF_ORDER}', '1Z-SELF-TRACK', 'VIRTUAL', 'TEST');
    INSERT INTO public.zen_ups_label_documents (id, order_id, reference_no, content_type, doc_type, storage_path) VALUES
      ('${SELF_DOC}', '${SELF_ORDER}', 'REF-279-SELF', 'application/pdf', 'LABEL', '${SELF_STORAGE}');
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES
      ('invoices', '${SELF_STORAGE}', '${SELF_USER}');
  `);
}

function cleanupFixture() {
  psql(`
    SET storage.allow_delete_query = 'true';
    DELETE FROM public.zen_ups_label_documents WHERE order_id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_ups_label_errors WHERE order_id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_tracking_configs WHERE order_id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM storage.objects WHERE name LIKE 'ups-labels/279%';
    DELETE FROM public.zen_orders WHERE id IN ('${SELF_ORDER}','${OTHER_ORDER}');
    DELETE FROM public.zen_profiles WHERE id IN ('${SELF_USER}','${OTHER_USER}');
    DELETE FROM auth.users WHERE id IN ('${SELF_USER}','${OTHER_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${SELF_ORG}','${OTHER_ORG}','${DOWNSTREAM_ORG}');
  `);
}

// authenticated 롤 + JWT sub 시뮬레이션으로 단일 SQL 실행. 성공 여부를 {ok, err}로 반환.
// JWT claims는 set_config(SELECT)가 아니라 SET 문으로 주입 — psql 출력을 오염시키지 않음.
function runAsAuthenticated(userId: string, sql: string, opts?: { allowDeleteQuery?: boolean }): { ok: boolean; err: string } {
  try {
    const extra = opts?.allowDeleteQuery ? `SET storage.allow_delete_query = 'true';` : '';
    psql(`
      SET ROLE authenticated;
      ${extra}
      SET request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}';
      ${sql}
      RESET ROLE;
    `);
    return { ok: true, err: '' };
  } catch (e: any) {
    return { ok: false, err: String(e?.message ?? e) };
  }
}

// authenticated 롤로 단일 SELECT를 실행하고 결과 값(마지막 행)을 반환한다.
function queryAsAuthenticated(userId: string, sql: string): string {
  return psql(`
    SET ROLE authenticated;
    SET request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}';
    ${sql}
    RESET ROLE;
  `);
}

describe('DEF-B-051: AGENCY 자가화주 RLS 잔여 차단 4곳 (Issue #1058)', () => {
  beforeAll(() => {
    setupFixture();
  });
  afterAll(() => {
    cleanupFixture();
  });

  // ─── 1. 자가화주 AGENCY — 전부 성공해야 함 ─────────────────────────────────
  it('TC-279-01: 자가화주 AGENCY zen_tracking_configs UPDATE 성공 (트래킹 설정 갱신)', () => {
    const r = runAsAuthenticated(SELF_USER, `
      UPDATE public.zen_tracking_configs SET provider_name='UPDATED-SELF'
      WHERE order_id = '${SELF_ORDER}';
    `);
    expect(r.ok).toBe(true);
    const val = psql(`SELECT provider_name FROM public.zen_tracking_configs WHERE order_id='${SELF_ORDER}'`);
    expect(val).toBe('UPDATED-SELF');
    psql(`UPDATE public.zen_tracking_configs SET provider_name='TEST' WHERE order_id='${SELF_ORDER}'`);
  });

  it('TC-279-02: 자가화주 AGENCY zen_ups_label_documents DELETE 성공 (라벨 문서 레코드 삭제)', () => {
    const r = runAsAuthenticated(SELF_USER, `
      DELETE FROM public.zen_ups_label_documents WHERE id = '${SELF_DOC}';
    `);
    expect(r.ok).toBe(true);
    const leftover = psql(`SELECT count(*) FROM public.zen_ups_label_documents WHERE id='${SELF_DOC}'`);
    expect(leftover).toBe('0');
    // 복원 (다음 테스트를 위해)
    psql(`INSERT INTO public.zen_ups_label_documents (id, order_id, reference_no, content_type, doc_type, storage_path)
          VALUES ('${SELF_DOC}', '${SELF_ORDER}', 'REF-279-SELF', 'application/pdf', 'LABEL', '${SELF_STORAGE}')
          ON CONFLICT (id) DO NOTHING`);
  });

  it('TC-279-03: 자가화주 AGENCY zen_ups_label_errors INSERT 성공 (SHXK 실패 에러 기록)', () => {
    const r = runAsAuthenticated(SELF_USER, `
      INSERT INTO public.zen_ups_label_errors (order_id, shxk_code, error_message, attempted_by)
      VALUES ('${SELF_ORDER}', 'E279', 'self-shipper error logged', '${SELF_USER}');
    `);
    expect(r.ok).toBe(true);
    const exists = psql(`SELECT count(*) FROM public.zen_ups_label_errors WHERE order_id='${SELF_ORDER}'`);
    expect(exists).toBe('1');
    psql(`DELETE FROM public.zen_ups_label_errors WHERE order_id='${SELF_ORDER}'`);
  });

  it('TC-279-04: 자가화주 AGENCY storage.objects INSERT 성공 (라벨 PDF 업로드)', () => {
    const r = runAsAuthenticated(SELF_USER, `
      INSERT INTO storage.objects (bucket_id, name, owner)
      VALUES ('invoices', 'ups-labels/27900000-0000-4000-8000-000000000010/b.pdf', '${SELF_USER}');
    `);
    expect(r.ok).toBe(true);
    const exists = psql(`SELECT count(*) FROM storage.objects WHERE name='ups-labels/27900000-0000-4000-8000-000000000010/b.pdf'`);
    expect(exists).toBe('1');
    psql(`SET storage.allow_delete_query='true'; DELETE FROM storage.objects WHERE name='ups-labels/27900000-0000-4000-8000-000000000010/b.pdf'`);
  });

  it('TC-279-05: 자가화주 AGENCY storage.objects SELECT 성공 (라벨 PDF 조회)', () => {
    const r = runAsAuthenticated(SELF_USER, `
      SELECT count(*) FROM storage.objects WHERE name = '${SELF_STORAGE}';
    `);
    expect(r.ok).toBe(true);
    const cnt = queryAsAuthenticated(SELF_USER, `
      SELECT count(*) FROM storage.objects WHERE name = '${SELF_STORAGE}';
    `);
    expect(cnt).toBe('1');
  });

  it('TC-279-06: 자가화주 AGENCY storage.objects DELETE 성공 (라벨 PDF 삭제)', () => {
    // protect_delete 트리거를 우회하려면 allow_delete_query=true 필요 — Storage API도 내부적으로
    // 이 설정으로 라벨 파일을 삭제하므로 RLS 정책 검증에는 영향 없음.
    const r = runAsAuthenticated(SELF_USER, `
      DELETE FROM storage.objects WHERE name = '${SELF_STORAGE}';
    `, { allowDeleteQuery: true });
    expect(r.ok).toBe(true);
    const leftover = psql(`SET storage.allow_delete_query='true'; SELECT count(*) FROM storage.objects WHERE name='${SELF_STORAGE}'`);
    expect(leftover).toBe('0');
    // 복원 (다음 테스트를 위해)
    psql(`INSERT INTO storage.objects (bucket_id, name, owner)
          VALUES ('invoices', '${SELF_STORAGE}', '${SELF_USER}')`);
  });

  // ─── 2. 무관 AGENCY — 차단(42501 또는 0행) 유지해야 함 (보안 회귀 방지) ─────
  it('TC-279-07: 무관 AGENCY tracking_configs UPDATE 차단 — 값 불변', () => {
    const r = runAsAuthenticated(OTHER_USER, `
      UPDATE public.zen_tracking_configs SET provider_name='HACKED'
      WHERE order_id = '${SELF_ORDER}';
    `);
    expect(r.ok).toBe(true); // RLS가 행을 필터 → 예외 없음
    const after = psql(`SELECT provider_name FROM public.zen_tracking_configs WHERE order_id='${SELF_ORDER}'`);
    expect(after).toBe('TEST'); // 값 불변 → 차단 확인
  });

  it('TC-279-08: 무관 AGENCY ups_label_documents DELETE 차단 — 레코드 존속', () => {
    const r = runAsAuthenticated(OTHER_USER, `
      DELETE FROM public.zen_ups_label_documents WHERE id = '${SELF_DOC}';
    `);
    expect(r.ok).toBe(true);
    const exists = psql(`SELECT count(*) FROM public.zen_ups_label_documents WHERE id='${SELF_DOC}'`);
    expect(exists).toBe('1'); // 레코드 존속 → 차단 확인
  });

  it('TC-279-09: 무관 AGENCY ups_label_errors INSERT 차단 (42501) — 보안 회귀 방지', () => {
    const r = runAsAuthenticated(OTHER_USER, `
      INSERT INTO public.zen_ups_label_errors (order_id, shxk_code, error_message, attempted_by)
      VALUES ('${SELF_ORDER}', 'EBAD', 'should fail', '${OTHER_USER}');
    `);
    expect(r.ok).toBe(false);
    expect(r.err).toMatch(/row-level security policy|violates row-level security/i);
  });

  it('TC-279-10: 무관 AGENCY storage.objects INSERT/SELECT/DELETE 차단 — 라벨 PDF 불가', () => {
    // INSERT: 42501
    const ins = runAsAuthenticated(OTHER_USER, `
      INSERT INTO storage.objects (bucket_id, name, owner)
      VALUES ('invoices', 'ups-labels/27900000-0000-4000-8000-000000000010/c.pdf', '${OTHER_USER}');
    `);
    expect(ins.ok).toBe(false);
    expect(ins.err).toMatch(/row-level security policy|violates row-level security/i);
    // SELECT: 0행
    const sel = runAsAuthenticated(OTHER_USER, `
      SELECT count(*) FROM storage.objects WHERE name = '${SELF_STORAGE}';
    `);
    expect(sel.ok).toBe(true);
    const cnt = queryAsAuthenticated(OTHER_USER, `
      SELECT count(*) FROM storage.objects WHERE name = '${SELF_STORAGE}';
    `);
    expect(cnt).toBe('0'); // 조회 불가
    // DELETE: 0행 → 레코드 존속
    const del = runAsAuthenticated(OTHER_USER, `
      DELETE FROM storage.objects WHERE name = '${SELF_STORAGE}';
    `, { allowDeleteQuery: true });
    expect(del.ok).toBe(true);
    const leftover = psql(`SET storage.allow_delete_query='true'; SELECT count(*) FROM storage.objects WHERE name='${SELF_STORAGE}'`);
    expect(leftover).toBe('1'); // 존속 → 차단 확인
  });

  // ─── 3. 하위 화주 오더(agency_org_id=본인)는 AGENCY가 정상 관리 (기존 동작) ──
  it('TC-279-11: 하위 화주 오더는 AGENCY가 정상 관리 가능 (기존 동작 회귀 방지)', () => {
    // OTHER_AGENCY가 관리하는 하위 화주 오더의 tracking configs UPDATE 가능해야 함
    psql(`INSERT INTO public.zen_tracking_configs (order_id, tracking_no, provider_type, provider_name)
          VALUES ('${OTHER_ORDER}', '1Z-OTHER-TRACK', 'VIRTUAL', 'TEST-OTHER')`);
    const r = runAsAuthenticated(OTHER_USER, `
      UPDATE public.zen_tracking_configs SET provider_name='MANAGED'
      WHERE order_id = '${OTHER_ORDER}';
    `);
    expect(r.ok).toBe(true);
    const val = psql(`SELECT provider_name FROM public.zen_tracking_configs WHERE order_id='${OTHER_ORDER}'`);
    expect(val).toBe('MANAGED');
  });
});

// ─── 되돌리기 검증 (R-09 필수) ───────────────────────────────────────────────
// 이전 정책(agency_org_id 단일)으로 원복하면 자가화주도 다시 차단되는지 확인.
// 검증 후 마이그레이션과 동일한 최신 정책으로 복원. (복원은 마이그레이션 SQL과 동일하게 적용)
describe('DEF-B-051: 되돌리기 검증 — 정책 원복 시 자가화주 재차단 (Issue #1058)', () => {
  beforeAll(() => {
    setupFixture();
  });
  afterAll(() => {
    cleanupFixture();
  });

  it('TC-279-12: tracking_configs UPDATE 정책을 이전 형태(agency_org_id 단일)로 원복 → 자가화주 UPDATE 재차단(0행)', () => {
    // 1) 원복
    psql(`
      DROP POLICY IF EXISTS "Agency can update tracking configs for shipper orders" ON public.zen_tracking_configs;
      CREATE POLICY "Agency can update tracking configs for shipper orders"
      ON public.zen_tracking_configs FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.zen_orders
          WHERE zen_orders.id = zen_tracking_configs.order_id
            AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.zen_orders
          WHERE zen_orders.id = zen_tracking_configs.order_id
            AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        )
      );
    `);
    // 2) 자가화주 UPDATE가 다시 차단(0행)되어야 함
    const r = runAsAuthenticated(SELF_USER, `
      UPDATE public.zen_tracking_configs SET provider_name='SHOULD-NOT'
      WHERE order_id = '${SELF_ORDER}';
    `);
    expect(r.ok).toBe(true); // RLS가 행을 필터
    const after = psql(`SELECT provider_name FROM public.zen_tracking_configs WHERE order_id='${SELF_ORDER}'`);
    expect(after).toBe('TEST'); // 값 불변 → 차단 확인

    // 3) 복원 — 마이그레이션과 동일한 최신 정책 (자가화주 조건 포함)
    psql(`
      DROP POLICY IF EXISTS "Agency can update tracking configs for shipper orders" ON public.zen_tracking_configs;
      CREATE POLICY "Agency can update tracking configs for shipper orders"
      ON public.zen_tracking_configs FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.zen_orders
          WHERE zen_orders.id = zen_tracking_configs.order_id
            AND (
              zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
              OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.zen_orders
          WHERE zen_orders.id = zen_tracking_configs.order_id
            AND (
              zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
              OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
            )
        )
      );
    `);
    // 4) 복원 후 자가화주 UPDATE 다시 성공 확인
    const restored = runAsAuthenticated(SELF_USER, `
      UPDATE public.zen_tracking_configs SET provider_name='RESTORED'
      WHERE order_id = '${SELF_ORDER}';
    `);
    expect(restored.ok).toBe(true);
    const restoredVal = psql(`SELECT provider_name FROM public.zen_tracking_configs WHERE order_id='${SELF_ORDER}'`);
    expect(restoredVal).toBe('RESTORED');
  });
});
