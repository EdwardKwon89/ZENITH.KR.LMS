import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

// TASK-B-291 (Issue #1087 / DEF-B-061, High): zen_ups_tracking_events RLS 정책 전무 회귀 테스트.
//
// 마이그레이션 20260812050000_iss1087_ups_tracking_events_rls.sql이 적용된 fresh DB 기준으로,
// 실제 authenticated 롤(RLS) 시뮬레이션으로 다음을 검증한다:
//   1) Admin: 임의 오더 트래킹 이벤트 SELECT 성공 (ALL 정책)
//   2) 화주 본인(shipper_id 소유): 본인 오더 이벤트 SELECT 성공
//   3) 화주 타인(무관 오더): SELECT 0건 (차단) — 보안 회귀 방지
//   4) Agency(agency_org_id 소유): 하위 화주 오더 이벤트 SELECT 성공
//   5) 무관 Agency: SELECT 0건 (차단)
//   6) 되돌리기: SELECT 정책 제거 시 성공 케이스들이 0건으로 바뀜
//
// ⚠️ IMP-163 준수: setupFixture는 검증 대상 정책을 절대 생성/재생성하지 않는다 (데이터만 준비).

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

// 테스트 전용 UUID 상수
const ADMIN_USER = '29100000-0000-4000-8000-000000000001';
const ADMIN_ORG = '29100000-0000-4000-8000-000000000002';
const SHIPPER_USER = '29100000-0000-4000-8000-000000000003';
const SHIPPER_ORG = '29100000-0000-4000-8000-000000000004';
const OTHER_ORG = '29100000-0000-4000-8000-000000000005';
const AGENCY_USER = '29100000-0000-4000-8000-000000000006';
const AGENCY_ORG = '29100000-0000-4000-8000-000000000007';
const OTHER_AGENCY_ORG = '29100000-0000-4000-8000-000000000008';
const OWN_ORDER = '29100000-0000-4000-8000-000000000010'; // 화주 본인 소유 (SHIPPER_ORG)
const OTHER_ORDER = '29100000-0000-4000-8000-000000000011'; // 무관 (OTHER_ORG)
const AGENCY_ORDER = '29100000-0000-4000-8000-000000000012'; // Agency 하위 화주 (SHIPPER_ORG + AGENCY_ORG)

function setupFixture() {
  // 먼저 잔여 데이터 정리
  psql(`
    DELETE FROM public.zen_ups_tracking_events WHERE order_id IN ('${OWN_ORDER}','${OTHER_ORDER}','${AGENCY_ORDER}');
    DELETE FROM public.zen_orders WHERE id IN ('${OWN_ORDER}','${OTHER_ORDER}','${AGENCY_ORDER}');
    DELETE FROM public.zen_profiles WHERE id IN ('${ADMIN_USER}','${SHIPPER_USER}','${AGENCY_USER}');
    DELETE FROM auth.users WHERE id IN ('${ADMIN_USER}','${SHIPPER_USER}','${AGENCY_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${ADMIN_ORG}','${SHIPPER_ORG}','${OTHER_ORG}','${AGENCY_ORG}','${OTHER_AGENCY_ORG}');
  `);
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${ADMIN_ORG}', '291 Admin Org', 'CORPORATE', 'ACTIVE'),
      ('${SHIPPER_ORG}', '291 Shipper Org', 'SHIPPER', 'ACTIVE'),
      ('${OTHER_ORG}', '291 Other Org', 'SHIPPER', 'ACTIVE'),
      ('${AGENCY_ORG}', '291 Agency Org', 'AGENCY', 'ACTIVE'),
      ('${OTHER_AGENCY_ORG}', '291 Other Agency Org', 'AGENCY', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    INSERT INTO auth.users (id, email) VALUES
      ('${ADMIN_USER}', '291-admin@test.kr'),
      ('${SHIPPER_USER}', '291-shipper@test.kr'),
      ('${AGENCY_USER}', '291-agency@test.kr')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${ADMIN_USER}', '${ADMIN_ORG}', '291-admin@test.kr', 'ADMIN', 'ACTIVE'),
      ('${SHIPPER_USER}', '${SHIPPER_ORG}', '291-shipper@test.kr', 'SHIPPER', 'ACTIVE'),
      ('${AGENCY_USER}', '${AGENCY_ORG}', '291-agency@test.kr', 'AGENCY', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
    -- OWN_ORDER: shipper=SHIPPER_ORG (화주 본인)
    -- OTHER_ORDER: shipper=OTHER_ORG (무관)
    -- AGENCY_ORDER: shipper=SHIPPER_ORG, agency_org_id=AGENCY_ORG (Agency 하위 화주)
    INSERT INTO public.zen_orders (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, cargo_details) VALUES
      ('${OWN_ORDER}', 'ZEN-291-OWN', '${SHIPPER_ORG}', NULL, 'UPS', 'IN_TRANSIT', 'Recv', '010-1', '{}'::jsonb),
      ('${OTHER_ORDER}', 'ZEN-291-OTHER', '${OTHER_ORG}', NULL, 'UPS', 'IN_TRANSIT', 'Recv', '010-2', '{}'::jsonb),
      ('${AGENCY_ORDER}', 'ZEN-291-AGENCY', '${SHIPPER_ORG}', '${AGENCY_ORG}', 'UPS', 'IN_TRANSIT', 'Recv', '010-3', '{}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    INSERT INTO public.zen_ups_tracking_events (order_id, tracking_number, event_code, event_date, event_time, event_desc, location_city, location_country) VALUES
      ('${OWN_ORDER}', '1Z-OWN', 'AF', '2026-08-11', '15:24:27', '离开设施', 'Incheon', 'KR'),
      ('${OTHER_ORDER}', '1Z-OTHER', 'AF', '2026-08-11', '16:00:00', '离开设施', 'Incheon', 'KR'),
      ('${AGENCY_ORDER}', '1Z-AGENCY', 'AF', '2026-08-11', '17:00:00', '离开设施', 'Incheon', 'KR')
    ON CONFLICT (id) DO NOTHING;
  `);
}

function cleanupFixture() {
  psql(`
    DELETE FROM public.zen_ups_tracking_events WHERE order_id IN ('${OWN_ORDER}','${OTHER_ORDER}','${AGENCY_ORDER}');
    DELETE FROM public.zen_orders WHERE id IN ('${OWN_ORDER}','${OTHER_ORDER}','${AGENCY_ORDER}');
    DELETE FROM public.zen_profiles WHERE id IN ('${ADMIN_USER}','${SHIPPER_USER}','${AGENCY_USER}');
    DELETE FROM auth.users WHERE id IN ('${ADMIN_USER}','${SHIPPER_USER}','${AGENCY_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${ADMIN_ORG}','${SHIPPER_ORG}','${OTHER_ORG}','${AGENCY_ORG}','${OTHER_AGENCY_ORG}');
  `);
}

// authenticated 롤 + JWT sub 시뮬레이션으로 단일 SELECT 실행 → 결과 행 수 반환
function selectCountAs(userId: string, orderId: string): string {
  return psql(`
    SET ROLE authenticated;
    SET request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}';
    SELECT count(*) FROM public.zen_ups_tracking_events WHERE order_id = '${orderId}';
    RESET ROLE;
  `);
}

describe('DEF-B-061: zen_ups_tracking_events RLS 정책 전무 (Issue #1087)', () => {
  beforeAll(() => {
    setupFixture();
  });
  afterAll(() => {
    cleanupFixture();
  });

  it('TC-291-01: Admin — 임의 오더 트래킹 이벤트 SELECT 성공', () => {
    const cnt = selectCountAs(ADMIN_USER, OWN_ORDER);
    expect(cnt).toBe('1');
  });

  it('TC-291-02: 화주 본인(shipper_id 소유) — 본인 오더 이벤트 SELECT 성공', () => {
    const cnt = selectCountAs(SHIPPER_USER, OWN_ORDER);
    expect(cnt).toBe('1');
  });

  it('TC-291-03: 화주 타인(무관 오더) — SELECT 0건 (차단)', () => {
    const cnt = selectCountAs(SHIPPER_USER, OTHER_ORDER);
    expect(cnt).toBe('0');
  });

  it('TC-291-04: Agency(agency_org_id 소유 화주오더) — SELECT 성공', () => {
    const cnt = selectCountAs(AGENCY_USER, AGENCY_ORDER);
    expect(cnt).toBe('1');
  });

  it('TC-291-05: 무관 Agency — SELECT 0건 (차단)', () => {
    // AGENCY_USER는 AGENCY_ORG 소속 — AGENCY_ORDER(agency=AGENCY_ORG)는 보이지만
    // OWN_ORDER(agency=NULL)는 보이지 않아야 함
    const ownCnt = selectCountAs(AGENCY_USER, OWN_ORDER);
    expect(ownCnt).toBe('0');
  });
});

// ─── 되돌리기 검증 ─────────────────────────────────────────────────────────
// SELECT 정책을 제거하면 성공 케이스들이 0건으로 바뀌는지 확인 (IMP-163 준수 —
// setupFixture는 정책을 건드리지 않고, 이 블록에서만 의도적으로 원복→확인→복원)
describe('DEF-B-061: 되돌리기 검증 — SELECT 정책 제거 시 0건 (Issue #1087)', () => {
  beforeAll(() => {
    setupFixture();
  });
  afterAll(() => {
    cleanupFixture();
  });

  it('TC-291-06: 화주 본인 SELECT 정책 제거 → 화주 본인 이벤트 조회 0건 → 복원 후 다시 1건', () => {
    // 1) 화주 본인 정책 제거
    psql(`
      DROP POLICY IF EXISTS "Users can view ups tracking events of their own zen_orders" ON public.zen_ups_tracking_events;
    `);
    // 2) 화주 본인 조회가 0건이 되어야 함
    const before = selectCountAs(SHIPPER_USER, OWN_ORDER);
    expect(before).toBe('0');

    // 3) 복원
    psql(`
      CREATE POLICY "Users can view ups tracking events of their own zen_orders"
      ON public.zen_ups_tracking_events FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.zen_orders o
          WHERE o.id = zen_ups_tracking_events.order_id
            AND (o.shipper_id = auth.uid()
                 OR o.shipper_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()))
        )
      );
    `);
    // 4) 복원 후 다시 1건
    const after = selectCountAs(SHIPPER_USER, OWN_ORDER);
    expect(after).toBe('1');
  });
});
