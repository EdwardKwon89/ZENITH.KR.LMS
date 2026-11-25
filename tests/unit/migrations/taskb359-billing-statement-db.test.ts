// TASK-B-359 (Issue #1365): 청구서 DB — RLS 3경로·채번 동시성·상태 전이 트리거 실DB 검증 (R-09/R-14).
// 원칙: ① 소스(마이그레이션 SQL) 문자열 toContain 단독 단언 금지(Mike vacuous test 경고) — 전부
//        실제 쿼리 결과로 단언. ② 마이그레이션 파일 재실행 금지(Jaison 조건 — zen_orders 락 방지) —
//        스키마는 pg_catalog 조회로만 검증. ③ 자기완결 fixture(SAR-2026-07-27-001) — 직접 생성·삭제.
//        ④ 주문은 블록별 신규 생성(UNIQUE(order_id,tier)가 전역이므로 재사용 금지).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, exec } from 'child_process';
import { randomUUID } from 'crypto';

// ---------- fixture IDs (재실행 멱등) ----------
const ORG_ISSUER = randomUUID();   // AGENCY — 발행자
const ORG_OTHER = randomUUID();    // AGENCY — 타 대리점 (접근 거부 대상)
const ORG_SHIPPER = randomUUID();  // INDIVIDUAL — 발행자와 연결된 화주 (청구 대상)
const ORG_STRANGER = randomUUID(); // INDIVIDUAL — 청구받지 않은 org (Admin/Manager 소속)

const U_ISSUER = randomUUID();   // AGENCY @ ORG_ISSUER
const U_OTHER = randomUUID();    // AGENCY @ ORG_OTHER
const U_SHIPPER = randomUUID();  // INDIVIDUAL @ ORG_SHIPPER
const U_ADMIN = randomUUID();    // ADMIN @ ORG_STRANGER (발행자 org 아님 → 감독 경로 ③만으로 조회 격리)
const U_MANAGER = randomUUID();  // MANAGER @ ORG_STRANGER (감독 제외 대상)
const U_OPERATOR = randomUUID(); // OPERATOR @ ORG_STRANGER (TASK-B-378: seq 비허용 음성 대조)
const U_SUPER = randomUUID();    // ZENITH_SUPER_ADMIN @ ORG_STRANGER (TASK-B-378: seq 허용 양성 대조)

const KEY = randomUUID().substring(0, 8);
const madeOrders: string[] = [];

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

function psqlErr(sql: string): string {
  try {
    psql(sql);
    return '';
  } catch (err) {
    return String((err as Error).message ?? err);
  }
}

function profileOrg(profileId: string): string {
  if (profileId === U_ISSUER) return ORG_ISSUER;
  if (profileId === U_OTHER) return ORG_OTHER;
  if (profileId === U_SHIPPER) return ORG_SHIPPER;
  return ORG_STRANGER; // U_ADMIN / U_MANAGER
}

// 실제 토큰과 동일한 구조: app_metadata에 role·org_id 포함 (기존 RLS 다수가 app_metadata 기반)
function claims(profileId: string): string {
  const role =
    profileId === U_ISSUER || profileId === U_OTHER ? 'AGENCY' :
    profileId === U_SHIPPER ? 'INDIVIDUAL' :
    profileId === U_ADMIN ? 'ADMIN' :
    profileId === U_SUPER ? 'ZENITH_SUPER_ADMIN' :
    profileId === U_OPERATOR ? 'OPERATOR' : 'MANAGER';
  return `{"sub": "${profileId}", "role": "authenticated", "app_metadata": {"role": "${role}", "org_id": "${profileOrg(profileId)}"}}`;
}

function psqlAs(profileId: string, sql: string): string {
  return psql(`SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '${claims(profileId)}';
${sql}`);
}

function psqlAsErr(profileId: string, sql: string): string {
  try {
    return psqlAs(profileId, sql);
  } catch (err) {
    return String((err as Error).message ?? err);
  }
}

function psqlAsRaw(profileId: string, sql: string): string[] {
  const out = psqlAs(profileId, sql);
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

// 병렬 채번용: 별도 docker exec 프로세스(별도 커넥션 = 실제 동시성)
function psqlAsAsync(profileId: string, sql: string): Promise<string> {
  const wrapped = `SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '${claims(profileId)}';
${sql}`.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
  return new Promise((resolve, reject) => {
    exec(
      `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${wrapped}"`,
      (error, stdout) => {
        if (error) reject(new Error(String(error.message) + String(stdout)));
        else resolve(stdout.trim());
      }
    );
  });
}

function makeOrder(opts?: { settled?: boolean; shipperId?: string; agencyId?: string }): string {
  const id = randomUUID();
  const settled = (opts?.settled ?? true) ? 'SETTLED' : 'NOT_SETTLED';
  // 기본: 수기 화주 오더 패턴 (shipper_id = 발행 대리점, agency_org_id NULL)
  const shipper = opts?.shipperId ?? ORG_ISSUER;
  const agency = opts?.agencyId ? `'${opts.agencyId}'` : 'NULL';
  // TASK-B-365 CHECK: SETTLED ⇒ cost_settled_at·cost_settled_by NOT NULL
  const settledCols = opts?.settled === false ? 'NULL, NULL' : `now(), '${U_ISSUER}'`;
  psql(`INSERT INTO public.zen_orders (id, order_no, cargo_details, transport_mode, status, shipper_id, agency_org_id, cost_settlement_status, cost_settled_at, cost_settled_by, created_at)
        VALUES ('${id}', 'ZEN-B359-${id.substring(0, 8)}', '{}'::jsonb, 'UPS', 'WAREHOUSED', '${shipper}', ${agency}, '${settled}', ${settledCols}, NOW())`);
  madeOrders.push(id);
  return id;
}

function cleanupFixture() {
  // 발행 후 헤더 삭제를막는 트리거는fixture 정리 중에만 비활성화(정리용 슈퍼유저 경로)
  psql(`ALTER TABLE public.zen_billing_statements DISABLE TRIGGER trg_billing_statement_before_delete;
        ALTER TABLE public.zen_billing_statement_items DISABLE TRIGGER trg_billing_statement_items_guard;`);
  // org ID는 매 실행 randomUUID이므로 이전 실행 잔여물은 이름 prefix로 찾는다 (statement_no 충돌 방지)
  psql(`DELETE FROM public.zen_billing_statements
        WHERE issuer_org_id IN (SELECT id FROM public.zen_organizations WHERE name LIKE 'B359%')`);
  psql(`ALTER TABLE public.zen_billing_statements ENABLE TRIGGER trg_billing_statement_before_delete;
        ALTER TABLE public.zen_billing_statement_items ENABLE TRIGGER trg_billing_statement_items_guard;`);
  psql(`DELETE FROM public.zen_billing_statement_seq WHERE period_year = 2026`);
  psql(`DELETE FROM public.zen_agency_shippers
        WHERE agency_org_id IN (SELECT id FROM public.zen_organizations WHERE name LIKE 'B359%')`);
  if (madeOrders.length) {
    psql(`DELETE FROM public.zen_orders WHERE id IN (${madeOrders.map((id) => `'${id}'`).join(',')})`);
    madeOrders.length = 0;
  }
  // 이전 실행의 잔여 주문도 함께 정리
  psql(`DELETE FROM public.zen_orders WHERE order_no LIKE 'ZEN-B359-%'`);
  psql(`DELETE FROM public.zen_profiles WHERE email LIKE 'b359-%@test.com'`);
  psql(`DELETE FROM public.zen_organizations WHERE name LIKE 'B359%'`);
}

function setupFixture() {
  cleanupFixture();
  psql(`INSERT INTO public.zen_organizations (id, name, type, created_at) VALUES
    ('${ORG_ISSUER}', 'B359 Agency A', 'AGENCY', NOW()),
    ('${ORG_OTHER}',  'B359 Agency B', 'AGENCY', NOW()),
    ('${ORG_SHIPPER}', 'B359 Shipper S', 'INDIVIDUAL', NOW()),
    ('${ORG_STRANGER}', 'B359 Stranger', 'INDIVIDUAL', NOW())`);
  psql(`INSERT INTO public.zen_profiles (id, org_id, email, role, created_at) VALUES
    ('${U_ISSUER}', '${ORG_ISSUER}', 'b359-issuer-${KEY}@test.com', 'AGENCY', NOW()),
    ('${U_OTHER}',  '${ORG_OTHER}',  'b359-other-${KEY}@test.com',  'AGENCY', NOW()),
    ('${U_SHIPPER}','${ORG_SHIPPER}','b359-shipper-${KEY}@test.com','INDIVIDUAL', NOW()),
    ('${U_ADMIN}',  '${ORG_STRANGER}','b359-admin-${KEY}@test.com', 'ADMIN', NOW()),
    ('${U_MANAGER}','${ORG_STRANGER}','b359-manager-${KEY}@test.com','MANAGER', NOW()),
    ('${U_OPERATOR}','${ORG_STRANGER}','b359-operator-${KEY}@test.com','OPERATOR', NOW()),
    ('${U_SUPER}',  '${ORG_STRANGER}','b359-super-${KEY}@test.com',  'ZENITH_SUPER_ADMIN', NOW())`);
  psql(`INSERT INTO public.zen_agency_shippers (id, agency_org_id, shipper_org_id, shipper_type, is_active, created_at)
    VALUES ('${randomUUID()}', '${ORG_ISSUER}', '${ORG_SHIPPER}', 'INDIVIDUAL', TRUE, NOW())`);
}

// RPC로 청구서 생성 (authenticated 발행자 세션) → "statement_no|round|party|billed_key"
function createStatement(
  profileId: string,
  opts: { orgId?: string; adhocName?: string; tier?: string; year?: number; month?: number }
): string {
  const orgArg = opts.orgId ? `'${opts.orgId}'` : 'NULL';
  const nameArg = opts.adhocName ? `'${opts.adhocName}'` : 'NULL';
  const [no, round] = psqlAs(
    profileId,
    `SELECT stmt_no || '|' || stmt_round
     FROM public.create_billing_statement('${opts.tier ?? 'AGENCY_TO_SHIPPER'}', ${opts.year ?? 2026}, ${opts.month ?? 10}, ${orgArg}, ${nameArg}, NULL, DATE '2026-10-01', DATE '2026-10-31');`
  ).split('|');
  // party/key는 헤더 테이블에서 조회 (RPC는 id/no/round만 반환)
  const rest = psql(`SELECT billed_party_type || '|' || billed_key FROM public.zen_billing_statements WHERE statement_no='${no}'`);
  return `${no}|${round}|${rest}`;
}

function addItem(profileId: string, stmtId: string, orderId: string, tier: string, lineTotal: number): string {
  return psqlAsErr(profileId, `
    INSERT INTO public.zen_billing_statement_items
      (statement_id, order_id, tier, charge_weight_kg, base_freight, fuel_surcharge, surge_fee, other_charges, line_total)
    VALUES ('${stmtId}', '${orderId}', '${tier}', 1, ${lineTotal}, 0, 0, 0, ${lineTotal})`);
}

describe('TASK-B-359 (Issue #1365): 청구서 DB — 헤더·항목·채번 RPC·RLS·상태 전이 (실DB)', () => {
  beforeAll(() => setupFixture());
  afterAll(() => cleanupFixture());

  // ========== 스키마 (결과 상태 조회 — 마이그레이션 재실행 없음) ==========
  describe('TC-359-S: 스키마·제약·IMMUTABLE (pg_catalog 조회)', () => {
    it('TC-359-S1: 헤더 25컬럼·항목 13컬럼(B-381 M2 추가 2)·카운터 테이블 + RLS 3테이블 활성', () => {
      expect(psql(`SELECT count(*) FROM information_schema.columns WHERE table_name='zen_billing_statements'`)).toBe('25');
      expect(psql(`SELECT count(*) FROM information_schema.columns WHERE table_name='zen_billing_statement_items'`)).toBe('13');
      expect(psql(`SELECT count(*) FROM pg_tables WHERE tablename='zen_billing_statement_seq' AND rowsecurity`)).toBe('1');
      expect(psql(`SELECT count(*) FROM pg_tables WHERE tablename IN ('zen_billing_statements','zen_billing_statement_items') AND rowsecurity`)).toBe('2');
    });

    it('TC-359-S2: billed_key는 GENERATED STORED(s) + 정규화 함수 전부 IMMUTABLE(provolatile=i)', () => {
      expect(psql(`SELECT attgenerated FROM pg_attribute WHERE attrelid='zen_billing_statements'::regclass AND attname='billed_key'`)).toBe('s');
      const rows = psql(`
        SELECT proname || '=' || provolatile::text FROM pg_proc
        WHERE (proname='lower' AND pronargs=1)
           OR (proname='btrim' AND pronargs=1)
           OR (proname='regexp_replace' AND pronargs IN (3,4))`);
      expect(rows.split('\n').length).toBeGreaterThanOrEqual(4);
      rows.split('\n').forEach((r) => expect(r.trim().endsWith('=i')).toBe(true));
    });

    it('TC-359-S3: 핵심 제약 7종 — party/paid/issued_at CHECK + 차수·(id,tier)·statement_no 유일키 + 항목 composite FK·order 유일키', () => {
      const cons = psql(`
        SELECT conname FROM pg_constraint
        WHERE conrelid='zen_billing_statements'::regclass AND contype IN ('c','u')
        UNION ALL
        SELECT conname FROM pg_constraint WHERE conrelid='zen_billing_statement_items'::regclass`).split('\n');
      expect(cons).toContain('zen_billing_statements_party_check');
      expect(cons).toContain('zen_billing_statements_paid_check');
      expect(cons).toContain('zen_billing_statements_issued_at_check');
      expect(cons).toContain('zen_billing_statements_round_uq');
      expect(cons).toContain('zen_billing_statements_id_tier_uq');
      expect(cons).toContain('zen_billing_statements_statement_no_key');
      expect(cons).toContain('zen_billing_statement_items_hdr_fk');
      expect(cons).toContain('zen_billing_statement_items_order_uq');
    });

    it('TC-359-S4: 카운터 정책 0개 + RPC/트리거 5종 + DEFORIV/INVOKER 분리 + anon EXECUTE 차단', () => {
      expect(psql(`SELECT count(*) FROM pg_policies WHERE tablename='zen_billing_statement_seq'`)).toBe('0');
      const funcs = psql(`
        SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND proname IN
          ('create_billing_statement','next_billing_statement_seq',
           'billing_statement_before_update','billing_statement_before_delete','billing_statement_items_guard')
        ORDER BY proname`).split('\n');
      expect(funcs).toEqual([
        'billing_statement_before_delete',
        'billing_statement_before_update',
        'billing_statement_items_guard',
        'create_billing_statement',
        'next_billing_statement_seq',
      ]);
      expect(psql(`SELECT count(*) FROM pg_trigger WHERE tgrelid='zen_billing_statements'::regclass AND NOT tgisinternal`)).toBe('2');
      expect(psql(`SELECT count(*) FROM pg_trigger WHERE tgrelid='zen_billing_statement_items'::regclass AND NOT tgisinternal`)).toBe('1');
      const secdef = psql(`
        SELECT proname || '=' || prosecdef::text FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND (proname='create_billing_statement' OR proname='next_billing_statement_seq')
        ORDER BY proname`).split('\n');
      expect(secdef).toEqual(['create_billing_statement=false', 'next_billing_statement_seq=true']);
      expect(psql(`SELECT has_function_privilege('anon','public.create_billing_statement(text,integer,integer,uuid,text,text,date,date)','EXECUTE')`)).toBe('f');
      // TASK-B-378 (#1452): seq GRANT를 청구서 생성 RPC 2종과 동일하게 정렬 —
      // authenticated·service_role 허용 / PUBLIC·anon·dashboard_user 거부 (b359 REVOKE에 dashboard_user 방어적 명시)
      expect(psql(`SELECT has_function_privilege('authenticated','public.next_billing_statement_seq(integer,integer)','EXECUTE')`)).toBe('t');
      expect(psql(`SELECT has_function_privilege('service_role','public.next_billing_statement_seq(integer,integer)','EXECUTE')`)).toBe('t');
      expect(psql(`SELECT has_function_privilege('anon','public.next_billing_statement_seq(integer,integer)','EXECUTE')`)).toBe('f');
      expect(psql(`SELECT has_function_privilege('dashboard_user','public.next_billing_statement_seq(integer,integer)','EXECUTE')`)).toBe('f');
      expect(psql(`SELECT has_function_privilege('authenticated','public.create_billing_statement(text,integer,integer,uuid,text,text,date,date)','EXECUTE')`)).toBe('t');
    });
  });

  // ========== 채번 RPC ==========
  describe('TC-359-R: 채번 RPC — 형식·차수·정규화·조건 6', () => {
    it('TC-359-R1: ORG 대상 생성 → ST-YYYYMM-NN-SSSS + round 1, 재생성 → round 2', () => {
      const first = createStatement(U_ISSUER, { orgId: ORG_SHIPPER });
      const [no1, round1, party1, key1] = first.split('|');
      expect(no1).toMatch(/^ST-202610-01-\d{4}$/);
      expect(round1).toBe('1');
      expect(party1).toBe('ORG');
      expect(key1).toBe(`ORG:${ORG_SHIPPER}`);

      const second = createStatement(U_ISSUER, { orgId: ORG_SHIPPER });
      const [no2, round2] = second.split('|');
      expect(no2).toMatch(/^ST-202610-02-\d{4}$/);
      expect(round2).toBe('2');
      // seq는 월 내 전체 순번 → 1,2 연속 소급 확인
      expect(no1.split('-')[3]).toBe('0001');
      expect(no2.split('-')[3]).toBe('0002');
    });

    it('TC-359-R2: 조건 — billed_key 정규화 ("  ABC Co  " vs "abc co") 동일 키로 차수 이어짐', () => {
      const a = createStatement(U_ISSUER, { adhocName: '  ABC Co  ' });
      const [, roundA, partyA, keyA] = a.split('|');
      expect(partyA).toBe('ADHOC');
      expect(keyA).toBe('ADHOC:abc co');
      expect(roundA).toBe('1'); // 새 키 → 1차

      const b = createStatement(U_ISSUER, { adhocName: 'abc co' });
      const [, roundB, , keyB] = b.split('|');
      expect(keyB).toBe('ADHOC:abc co');
      expect(roundB).toBe('2'); // 동일 키 → 차수 이어짐
    });

    it('TC-359-R3: 조건 6 — Admin 발행자 ADHOC 거부 + 대리점의 비연결 ORG 대상 거부', () => {
      const adminErr = psqlAsErr(U_ADMIN, `
        SELECT stmt_no FROM public.create_billing_statement('AGENCY_TO_SHIPPER', 2026, 10, NULL, 'Adhoc By Admin', NULL, NULL, NULL);`);
      expect(adminErr).toContain('adhoc_requires_agency_issuer');

      const notLinkedErr = psqlAsErr(U_OTHER, `
        SELECT stmt_no FROM public.create_billing_statement('AGENCY_TO_SHIPPER', 2026, 10, '${ORG_SHIPPER}', NULL, NULL, NULL, NULL);`);
      expect(notLinkedErr).toContain('target_not_linked');
    });

    it('TC-359-R4: 발행자는 auth.uid() 도출 — 화주 role로 생성 시 create_not_allowed', () => {
      const err = psqlAsErr(U_SHIPPER, `
        SELECT stmt_no FROM public.create_billing_statement('AGENCY_TO_SHIPPER', 2026, 10, '${ORG_SHIPPER}', NULL, NULL, NULL, NULL);`);
      expect(err).toContain('create_not_allowed');
    });
  });

  // ========== 채번 동시성 (DoD) ==========
  describe('TC-359-C: 채번 동시성 — 병렬 호출 번호 중복 없음', () => {
    it('TC-359-C1: 별도 커넥션 4개 병렬 RPC → round 4건·statement_no 4건 전부 고유 (1~4)', async () => {
      // 선행 정리로 round를 1부터 시작
      psql(`DELETE FROM public.zen_billing_statements WHERE issuer_org_id='${ORG_ISSUER}' AND period_month=11`);
      psql(`DELETE FROM public.zen_billing_statement_seq WHERE period_year=2026 AND period_month=11`);

      const call = () => psqlAsAsync(U_ISSUER,
        `SELECT stmt_no || '|' || stmt_round FROM public.create_billing_statement('AGENCY_TO_SHIPPER', 2026, 11, '${ORG_SHIPPER}', NULL, NULL, DATE '2026-11-01', DATE '2026-11-30');`);

      const results = await Promise.all([call(), call(), call(), call()]);
      const rounds = results.map((r) => r.split('|')[1]).sort();
      const nos = results.map((r) => r.split('|')[0]);

      expect(results).toHaveLength(4);
      expect(new Set(nos).size).toBe(4);    // statement_no 중복 0
      expect(new Set(rounds).size).toBe(4); // round 중복 0
      expect(rounds).toEqual(['1', '2', '3', '4']);
      nos.forEach((n) => expect(n).toMatch(/^ST-202611-\d{2}-\d{4}$/));
    }, 60000);
  });

  // ========== 조건 1: 카운터 보호 ==========
  describe('TC-359-Q1: 카운터 테이블 보호 (조건 1)', () => {
    it('TC-359-Q1a: authenticated 직접 INSERT 거부(RLS) + UPDATE 0건(값 불변) + SELECT 0건', () => {
      const before = psql(`SELECT last_seq FROM public.zen_billing_statement_seq WHERE period_year=2026 AND period_month=10`);
      expect(Number(before)).toBeGreaterThan(0); // R·C 블록이 월 10에서 이미 사용

      const insertErr = psqlAsErr(U_ISSUER, `
        INSERT INTO public.zen_billing_statement_seq (period_year, period_month, last_seq) VALUES (2099, 1, 999);`);
      expect(insertErr.toLowerCase()).toContain('row-level security');

      // authenticated UPDATE: 행이 안 보이므로 0건 → 값 불변으로 단언
      psqlAs(U_ISSUER, `UPDATE public.zen_billing_statement_seq SET last_seq = 99999 WHERE period_year = 2026`);
      const after = psql(`SELECT last_seq FROM public.zen_billing_statement_seq WHERE period_year=2026 AND period_month=10`);
      expect(after).toBe(before);

      expect(psqlAs(U_ISSUER, `SELECT count(*) FROM public.zen_billing_statement_seq`)).toBe('0');
    });

    it('TC-359-Q1b: seq 역할 검사 — 허용(AGENCY·ADMIN·ZENITH_SUPER_ADMIN) 양성 + 비허용(INDIVIDUAL·MANAGER·OPERATOR) 거부 (TASK-B-378)', () => {
      // ── 양성 대조: 허용 역할은 원자 증분이 계속된다
      const a = psqlAs(U_ISSUER, `SELECT public.next_billing_statement_seq(2026, 12)`);   // AGENCY
      const b = psqlAs(U_ISSUER, `SELECT public.next_billing_statement_seq(2026, 12)`);   // AGENCY (증분 확인)
      expect(Number(a)).toBeGreaterThan(0);
      expect(Number(b)).toBe(Number(a) + 1);
      const c = psqlAs(U_ADMIN, `SELECT public.next_billing_statement_seq(2026, 12)`);    // ADMIN
      expect(Number(c)).toBe(Number(b) + 1);
      const d = psqlAs(U_SUPER, `SELECT public.next_billing_statement_seq(2026, 12)`);    // ZENITH_SUPER_ADMIN
      expect(Number(d)).toBe(Number(c) + 1);

      // ── 음성 대조: 비허용 역할은 create_not_allowed (두 RPC와 동일 오류 코드)
      expect(psqlAsErr(U_SHIPPER, `SELECT public.next_billing_statement_seq(2026, 12)`))
        .toContain('create_not_allowed: role=INDIVIDUAL');
      // MANAGER: 이슈 본문은 "허용 역할"에 적혀 있으나 두 RPC(b359/b360) 모두 거부 → 코드 정합 우선(불일치는 task file·PR에 보고)
      expect(psqlAsErr(U_MANAGER, `SELECT public.next_billing_statement_seq(2026, 12)`))
        .toContain('create_not_allowed: role=MANAGER');
      expect(psqlAsErr(U_OPERATOR, `SELECT public.next_billing_statement_seq(2026, 12)`))
        .toContain('create_not_allowed: role=OPERATOR');

      // ── 거부가 증분을 만들지 않음 (카운터는 마지막 허용 호출 d에서 정지)
      expect(psql(`SELECT last_seq FROM public.zen_billing_statement_seq WHERE period_year=2026 AND period_month=12`)).toBe(String(d));

      // ── auth.uid() 없는 직접 호출(슈퍼유저)도 차단 (SECURITY DEFINER 방어)
      let superErr = '';
      try { psql(`SELECT public.next_billing_statement_seq(2026, 12)`); } catch (err) { superErr = String(err); }
      expect(superErr).toContain('profile_not_found');

      psql(`DELETE FROM public.zen_billing_statement_seq WHERE period_year=2026 AND period_month=12`);
    });

    it('TC-359-Q1c: 월 seq 4자리 상한 소진 — 10000 도달 시 lpad 절단 → statement_no UNIQUE 충돌로 생성 실패 (TASK-B-378)', () => {
      // ① 절단 실측: 4자리 lpad는 10000을 '1000'으로 잘라낸다 (Postgres lpad)
      expect(psql(`SELECT lpad('10000',4,'0')`)).toBe('1000');

      const M = 6;
      psql(`DELETE FROM public.zen_billing_statement_seq WHERE period_year=2026 AND period_month=${M}`);
      psql(`INSERT INTO public.zen_billing_statement_seq (period_year, period_month, last_seq) VALUES (2026, ${M}, 999)`);

      // ② seq 1000에서 정상 생성 → ST-202606-01-1000
      const first = createStatement(U_ISSUER, { orgId: ORG_SHIPPER, month: M });
      expect(first.split('|')[0]).toBe('ST-202606-01-1000');

      // ③ 카운터 소진(9999) 후 다른 발행자(Admin, round 1)로 생성 시도 → seq 10000이 같은 번호로 절단 → UNIQUE 충돌
      psql(`UPDATE public.zen_billing_statement_seq SET last_seq=9999 WHERE period_year=2026 AND period_month=${M}`);
      const err = psqlAsErr(U_ADMIN, `SELECT stmt_no FROM public.create_billing_statement('ADMIN_TO_AGENCY', 2026, ${M}, '${ORG_SHIPPER}', NULL, NULL, DATE '2026-06-01', DATE '2026-06-30')`);
      expect(err).toContain('zen_billing_statements_statement_no_key');

      // ④ 실패는 트랜잭션 롤백 → 카운터도 9999로 복귀 (재시도도 동일하게 실패)
      expect(psql(`SELECT last_seq FROM public.zen_billing_statement_seq WHERE period_year=2026 AND period_month=${M}`)).toBe('9999');

      // 정리: 생성 헤더 + 카운터 제거 (이후 블록의 월 6 생성·전체 카운터 검증에 영향 없도록)
      psql(`ALTER TABLE public.zen_billing_statements DISABLE TRIGGER trg_billing_statement_before_delete;
            ALTER TABLE public.zen_billing_statement_items DISABLE TRIGGER trg_billing_statement_items_guard;`);
      psql(`DELETE FROM public.zen_billing_statements WHERE statement_no='ST-202606-01-1000'`);
      psql(`ALTER TABLE public.zen_billing_statements ENABLE TRIGGER trg_billing_statement_before_delete;
            ALTER TABLE public.zen_billing_statement_items ENABLE TRIGGER trg_billing_statement_items_guard;`);
      psql(`DELETE FROM public.zen_billing_statement_seq WHERE period_year=2026 AND period_month=${M}`);
    });
  });

  // ========== RLS 3경로 (DoD) ==========
  describe('TC-359-RLS: 조회 3경로 + 쓰기=발행자', () => {
    let issuerDraftNo = '';
    let issuerDraftId = '';
    let issuerIssuedNo = '';
    let issuerIssuedId = '';

    beforeAll(() => {
      // DRAFT 청구서 (항목 1건)
      const r = createStatement(U_ISSUER, { orgId: ORG_SHIPPER, month: 9 });
      issuerDraftNo = r.split('|')[0];
      issuerDraftId = psql(`SELECT id::text FROM public.zen_billing_statements WHERE statement_no='${issuerDraftNo}'`);
      const o1 = makeOrder();
      expect(addItem(U_ISSUER, issuerDraftId, o1, 'AGENCY_TO_SHIPPER', 115)).toBe('');

      // ISSUED 청구서 (항목 1건, total=2300)
      const r2 = createStatement(U_ISSUER, { orgId: ORG_SHIPPER, month: 8 });
      issuerIssuedNo = r2.split('|')[0];
      issuerIssuedId = psql(`SELECT id::text FROM public.zen_billing_statements WHERE statement_no='${issuerIssuedNo}'`);
      const o2 = makeOrder();
      expect(addItem(U_ISSUER, issuerIssuedId, o2, 'AGENCY_TO_SHIPPER', 2300)).toBe('');
      psqlAs(U_ISSUER, `UPDATE public.zen_billing_statements SET status='ISSUED', issued_at=now(), total_amount=2300 WHERE statement_no='${issuerIssuedNo}'`);
    });

    it('TC-359-RLS1: 경로 ① 발행자는 DRAFT 포함 전 상태 조회 (본인 발행분 2건)', () => {
      const rows = psqlAsRaw(U_ISSUER, `
        SELECT statement_no FROM public.zen_billing_statements
        WHERE issuer_org_id='${ORG_ISSUER}' AND period_month IN (8,9) ORDER BY period_month`);
      expect(rows).toContain(issuerDraftNo);
      expect(rows).toContain(issuerIssuedNo);
    });

    it('TC-359-RLS2: 타 생성자(대리점 B)는 발행분 일체 조회 불가 — DRAFT·ISSUED 0건 (상세도 미존재 동일)', () => {
      expect(psqlAs(U_OTHER, `
        SELECT count(*) FROM public.zen_billing_statements WHERE issuer_org_id='${ORG_ISSUER}'`)).toBe('0');
      expect(psqlAs(U_OTHER, `
        SELECT count(*) FROM public.zen_billing_statements WHERE statement_no='${issuerIssuedNo}'`)).toBe('0');
    });

    it('TC-359-RLS3: 청구받은 org(화주 S) — DRAFT 비노출·ISSUED 조회 가능·쓰기 불가(UPDATE 0건·INSERT RLS 거부)', () => {
      expect(psqlAs(U_SHIPPER, `
        SELECT count(*) FROM public.zen_billing_statements WHERE statement_no='${issuerDraftNo}'`)).toBe('0');
      expect(psqlAs(U_SHIPPER, `
        SELECT count(*) FROM public.zen_billing_statements WHERE statement_no='${issuerIssuedNo}'`)).toBe('1');

      // UPDATE: 자기가 발행자가 아니므로 정책 미일치 → 0건 → 값 불변
      psqlAs(U_SHIPPER, `UPDATE public.zen_billing_statements SET total_amount=999999 WHERE statement_no='${issuerIssuedNo}'`);
      expect(psql(`SELECT (total_amount = 2300)::text FROM public.zen_billing_statements WHERE statement_no='${issuerIssuedNo}'`)).toBe('true');

      // INSERT: role이 생성 주체 아님 → WITH CHECK 위반
      const insErr = psqlAsErr(U_SHIPPER, `
        INSERT INTO public.zen_billing_statements (statement_no, issuer_org_id, billed_party_type, billed_org_id, tier, period_year, period_month, round_no)
        VALUES ('ST-202610-99-9999', '${ORG_SHIPPER}', 'ORG', '${ORG_ISSUER}', 'AGENCY_TO_SHIPPER', 2026, 10, 99);`);
      expect(insErr.toLowerCase()).toContain('row-level security');
    });

    it('TC-359-RLS4: Admin 감독(경로 ③) — 대리점 발행분 DRAFT 포함 전 상태 조회 + 읽기 전용(UPDATE 0건)', () => {
      // Admin 소속(ORG_STRANGER)엔 발행분 없음 → 조회는 오직 감독 경로로만
      const cnt = psqlAs(U_ADMIN, `
        SELECT count(*) FROM public.zen_billing_statements WHERE issuer_org_id='${ORG_ISSUER}' AND period_month IN (8,9)`);
      expect(cnt).toBe('2'); // DRAFT + ISSUED

      psqlAs(U_ADMIN, `UPDATE public.zen_billing_statements SET total_amount=123456 WHERE statement_no='${issuerIssuedNo}'`);
      expect(psql(`SELECT (total_amount = 2300)::text FROM public.zen_billing_statements WHERE statement_no='${issuerIssuedNo}'`)).toBe('true');
    });

    it('TC-359-RLS5: MANAGER는 감독 제외 — 발행분 0건', () => {
      expect(psqlAs(U_MANAGER, `
        SELECT count(*) FROM public.zen_billing_statements WHERE issuer_org_id='${ORG_ISSUER}'`)).toBe('0');
    });

    it('TC-359-RLS6: 화주 S가 타 org 청구서 일체 조회 0건 (billed≠자기 org)', () => {
      expect(psqlAs(U_SHIPPER, `
        SELECT count(*) FROM public.zen_billing_statements WHERE billed_org_id IS DISTINCT FROM '${ORG_SHIPPER}'`)).toBe('0');
    });

    it('TC-359-RLS7: ADHOC 청구서 — 타 대리점 0건, Admin 감독은 조회 가능', () => {
      expect(Number(psqlAs(U_ISSUER, `
        SELECT count(*) FROM public.zen_billing_statements WHERE billed_party_type='ADHOC' AND issuer_org_id='${ORG_ISSUER}'`))).toBeGreaterThanOrEqual(2);
      expect(psqlAs(U_OTHER, `
        SELECT count(*) FROM public.zen_billing_statements WHERE billed_party_type='ADHOC'`)).toBe('0');
      expect(Number(psqlAs(U_ADMIN, `
        SELECT count(*) FROM public.zen_billing_statements WHERE billed_party_type='ADHOC' AND issuer_org_id='${ORG_ISSUER}'`))).toBeGreaterThanOrEqual(2);
    });

    it('TC-359-RLS8: 항목은 헤더 종속 — 타 대리점 0건, 화주는 ISSUED 항목만·DRAFT 항목 0건', () => {
      expect(psqlAs(U_OTHER, `
        SELECT count(*) FROM public.zen_billing_statement_items i
        JOIN public.zen_billing_statements s ON s.id=i.statement_id
        WHERE s.issuer_org_id='${ORG_ISSUER}'`)).toBe('0');
      expect(psqlAs(U_SHIPPER, `
        SELECT count(*) FROM public.zen_billing_statement_items WHERE statement_id='${issuerIssuedId}'`)).toBe('1');
      expect(psqlAs(U_SHIPPER, `
        SELECT count(*) FROM public.zen_billing_statement_items WHERE statement_id='${issuerDraftId}'`)).toBe('0');
    });

    it('TC-359-RLS9: 발행자는 자기 DRAFT 항목 추가 가능 (bsi_write)', () => {
      const o3 = makeOrder();
      expect(addItem(U_ISSUER, issuerDraftId, o3, 'AGENCY_TO_SHIPPER', 575)).toBe('');
      expect(psql(`SELECT count(*) FROM public.zen_billing_statement_items WHERE statement_id='${issuerDraftId}' AND order_id='${o3}'`)).toBe('1');
    });
  });

  // ========== 유일키·CASCADE (DoD) ==========
  describe('TC-359-U: UNIQUE(order_id, tier) + 헤더 삭제 → 오더 재포함', () => {
    let stmtNo = '';
    let stmtId = '';
    let orderX = '';

    beforeAll(() => {
      const r = createStatement(U_ISSUER, { orgId: ORG_SHIPPER, month: 7 });
      stmtNo = r.split('|')[0];
      stmtId = psql(`SELECT id::text FROM public.zen_billing_statements WHERE statement_no='${stmtNo}'`);
      orderX = makeOrder();
      expect(addItem(U_ISSUER, stmtId, orderX, 'AGENCY_TO_SHIPPER', 115)).toBe('');
    });

    it('TC-359-U1: 같은 (order_id, tier) 두 번째 포함 → 유일키 위반 거부', () => {
      const otherStmt = createStatement(U_ISSUER, { orgId: ORG_SHIPPER, month: 6 });
      const otherId = psql(`SELECT id::text FROM public.zen_billing_statements WHERE statement_no='${otherStmt.split('|')[0]}'`);
      const err = addItem(U_ISSUER, otherId, orderX, 'AGENCY_TO_SHIPPER', 115);
      expect(err).toContain('zen_billing_statement_items_order_uq');
      expect(psql(`SELECT count(*) FROM public.zen_billing_statement_items WHERE order_id='${orderX}' AND tier='AGENCY_TO_SHIPPER'`)).toBe('1');
    });

    it('TC-359-U2: 조건 5 — 항목 tier ≠ 헤더 tier → composite FK 거부', () => {
      const err = addItem(U_ISSUER, stmtId, makeOrder(), 'ADMIN_TO_AGENCY', 115);
      expect(err).toContain('zen_billing_statement_items_hdr_fk');
    });

    it('TC-359-U3: 다른 tier는 허용 — 같은 오더가 ADMIN_TO_AGENCY 청구서에도 1회 포함 (Admin 발행자)', () => {
      // PR #1397 수정 3 반영: ADMIN_TO_AGENCY는 비대리점(Admin) 발행자만 만들 수 있음
      const adminTier = createStatement(U_ADMIN, { orgId: ORG_SHIPPER, tier: 'ADMIN_TO_AGENCY', month: 7 });
      const adminId = psql(`SELECT id::text FROM public.zen_billing_statements WHERE statement_no='${adminTier.split('|')[0]}'`);
      expect(addItem(U_ADMIN, adminId, orderX, 'ADMIN_TO_AGENCY', 115)).toBe('');
      expect(psql(`SELECT count(*) FROM public.zen_billing_statement_items WHERE order_id='${orderX}'`)).toBe('2');
    });

    it('TC-359-U4: 조건 4 — 항목 있는 DRAFT 헤더 삭제 성공(항목 CASCADE) → 오더 재포함 가능', () => {
      const before = psql(`SELECT count(*) FROM public.zen_billing_statement_items WHERE statement_id='${stmtId}'`);
      expect(Number(before)).toBeGreaterThanOrEqual(1);

      psqlAs(U_ISSUER, `DELETE FROM public.zen_billing_statements WHERE statement_no='${stmtNo}'`);
      expect(psql(`SELECT count(*) FROM public.zen_billing_statements WHERE id='${stmtId}'`)).toBe('0');
      expect(psql(`SELECT count(*) FROM public.zen_billing_statement_items WHERE statement_id='${stmtId}'`)).toBe('0');

      // 재포함: 새 청구서에 같은 (order_id, tier) 다시 포함 성공
      const reStmt = createStatement(U_ISSUER, { orgId: ORG_SHIPPER, month: 5 });
      const reId = psql(`SELECT id::text FROM public.zen_billing_statements WHERE statement_no='${reStmt.split('|')[0]}'`);
      expect(addItem(U_ISSUER, reId, orderX, 'AGENCY_TO_SHIPPER', 115)).toBe('');
      expect(psql(`SELECT count(*) FROM public.zen_billing_statement_items WHERE order_id='${orderX}' AND tier='AGENCY_TO_SHIPPER'`)).toBe('1');
    });
  });

  // ========== 상태 전이·발행 후 불변 (DoD + 조건 2·3) ==========
  describe('TC-359-ST: 상태 전이 화이트리스트 + 발행 후 불변 + 전액 입금', () => {
    it('TC-359-ST1: DRAFT→CLOSED 직행 거부 + ISSUED→DRAFT 역방향 거부', () => {
      const r = createStatement(U_ISSUER, { orgId: ORG_SHIPPER, month: 4 });
      const no = r.split('|')[0];
      const id = psql(`SELECT id::text FROM public.zen_billing_statements WHERE statement_no='${no}'`);
      expect(addItem(U_ISSUER, id, makeOrder(), 'AGENCY_TO_SHIPPER', 115)).toBe('');

      const directErr = psqlAsErr(U_ISSUER, `
        UPDATE public.zen_billing_statements SET status='CLOSED', paid_amount=115, paid_date=DATE '2026-10-31' WHERE statement_no='${no}'`);
      expect(directErr).toContain('invalid_status_transition');

      psqlAs(U_ISSUER, `UPDATE public.zen_billing_statements SET status='ISSUED', issued_at=now() WHERE statement_no='${no}'`);
      const reverseErr = psqlAsErr(U_ISSUER, `UPDATE public.zen_billing_statements SET status='DRAFT' WHERE statement_no='${no}'`);
      expect(reverseErr).toContain('invalid_status_transition');
      expect(psql(`SELECT status FROM public.zen_billing_statements WHERE statement_no='${no}'`)).toBe('ISSUED');
    });

    it('TC-359-ST2: 항목 0건 발행 거부 (issue_without_items) → DRAFT 유지 후 삭제', () => {
      const r = createStatement(U_ISSUER, { orgId: ORG_SHIPPER, month: 3 });
      const no = r.split('|')[0];
      const err = psqlAsErr(U_ISSUER, `
        UPDATE public.zen_billing_statements SET status='ISSUED', issued_at=now() WHERE statement_no='${no}'`);
      expect(err).toContain('issue_without_items');
      expect(psql(`SELECT status FROM public.zen_billing_statements WHERE statement_no='${no}'`)).toBe('DRAFT');
      psqlAs(U_ISSUER, `DELETE FROM public.zen_billing_statements WHERE statement_no='${no}'`); // DRAFT라 삭제 가능
    });

    it('TC-359-ST3: 조건 2 — ISSUED에서 total_amount·statement_no·tier 수정 전부 거부', () => {
      const r = createStatement(U_ISSUER, { orgId: ORG_SHIPPER, month: 2 });
      const no = r.split('|')[0];
      const id = psql(`SELECT id::text FROM public.zen_billing_statements WHERE statement_no='${no}'`);
      expect(addItem(U_ISSUER, id, makeOrder(), 'AGENCY_TO_SHIPPER', 115)).toBe('');
      psqlAs(U_ISSUER, `UPDATE public.zen_billing_statements SET total_amount=115 WHERE statement_no='${no}'`); // DRAFT에서 합계 기록
      psqlAs(U_ISSUER, `UPDATE public.zen_billing_statements SET status='ISSUED', issued_at=now() WHERE statement_no='${no}'`);

      expect(psqlAsErr(U_ISSUER, `UPDATE public.zen_billing_statements SET total_amount=99999 WHERE statement_no='${no}'`))
        .toContain('issued_header_immutable');
      expect(psqlAsErr(U_ISSUER, `UPDATE public.zen_billing_statements SET statement_no='ST-202602-01-7777' WHERE statement_no='${no}'`))
        .toContain('issued_header_immutable');
      expect(psqlAsErr(U_ISSUER, `UPDATE public.zen_billing_statements SET tier='ADMIN_TO_AGENCY' WHERE statement_no='${no}'`))
        .toContain('issued_header_immutable');
      // 상태·금액 불변 유지
      expect(psql(`SELECT status || '|' || (total_amount = 115)::text FROM public.zen_billing_statements WHERE id='${id}'`))
        .toBe('ISSUED|true');
    });

    it('TC-359-ST4: ISSUED 항목 변경 — RLS(발행자) INSERT 거부·UPDATE/DELETE 0건 + 슈퍼유저도 트리거 거부', () => {
      const id = psql(`SELECT id::text FROM public.zen_billing_statements WHERE issuer_org_id='${ORG_ISSUER}' AND period_month=2 AND status='ISSUED'`);
      const itemCnt = () => psql(`SELECT count(*) FROM public.zen_billing_statement_items WHERE statement_id='${id}'`);

      // (a) authenticated(발행자) INSERT: BEFORE 트리거가 RLS WITH CHECK보다 먼저 발화 →
      //     items_locked_after_issue (두 방어층 모두 존재, 실측은 트리거가 1차)
      const insAuthErr = addItem(U_ISSUER, id, makeOrder(), 'AGENCY_TO_SHIPPER', 4);
      expect(insAuthErr).toContain('items_locked_after_issue');
      // UPDATE/DELETE는 bsi_write USING 미일치 → 0건(무언건 변화 없음)
      psqlAs(U_ISSUER, `UPDATE public.zen_billing_statement_items SET line_total=999 WHERE statement_id='${id}'`);
      psqlAs(U_ISSUER, `DELETE FROM public.zen_billing_statement_items WHERE statement_id='${id}'`);
      expect(itemCnt()).toBe('1');
      expect(psql(`SELECT (line_total = 115)::text FROM public.zen_billing_statement_items WHERE statement_id='${id}'`)).toBe('true');

      // (b) RLS 우회(슈퍼유저) → 트리거가 최종 방어
      const insErr = psqlErr(`INSERT INTO public.zen_billing_statement_items (statement_id, order_id, tier, charge_weight_kg, base_freight, fuel_surcharge, surge_fee, other_charges, line_total)
        VALUES ('${id}', '${makeOrder()}', 'AGENCY_TO_SHIPPER', 1, 1, 1, 1, 0, 4)`);
      expect(insErr).toContain('items_locked_after_issue');
      const delErr = psqlErr(`DELETE FROM public.zen_billing_statement_items WHERE statement_id='${id}'`);
      expect(delErr).toContain('items_locked_after_issue');
      expect(itemCnt()).toBe('1');
    });

    it('TC-359-ST5: 발행 후 헤더 DELETE 거부 (header_delete_forbidden) — authenticated와 슈퍼유저 모두', () => {
      const id = psql(`SELECT id::text FROM public.zen_billing_statements WHERE issuer_org_id='${ORG_ISSUER}' AND period_month=2 AND status='ISSUED'`);
      expect(psqlAsErr(U_ISSUER, `DELETE FROM public.zen_billing_statements WHERE id='${id}'`))
        .toContain('header_delete_forbidden');
      expect(psqlErr(`DELETE FROM public.zen_billing_statements WHERE id='${id}'`))
        .toContain('header_delete_forbidden');
      expect(psql(`SELECT count(*) FROM public.zen_billing_statements WHERE id='${id}'`)).toBe('1');
    });

    it('TC-359-ST6: 조건 3 — CLOSED 전액만 (paid≠total·NULL 거부, 전액 성공) 후에도 DELETE 거부', () => {
      const id = psql(`SELECT id::text FROM public.zen_billing_statements WHERE issuer_org_id='${ORG_ISSUER}' AND period_month=2 AND status='ISSUED'`);
      // total_amount=115 (ST3에서 기록)
      expect(psqlAsErr(U_ISSUER, `
        UPDATE public.zen_billing_statements SET status='CLOSED', paid_amount=100, paid_date=DATE '2026-10-31', closed_at=now() WHERE id='${id}'`)
        .toLowerCase()).toContain('zen_billing_statements_paid_check');
      expect(psqlAsErr(U_ISSUER, `
        UPDATE public.zen_billing_statements SET status='CLOSED', paid_amount=NULL, closed_at=now() WHERE id='${id}'`)
        .toLowerCase()).toContain('zen_billing_statements_paid_check');

      psqlAs(U_ISSUER, `
        UPDATE public.zen_billing_statements SET status='CLOSED', paid_amount=115, paid_date=DATE '2026-10-31', closed_at=now() WHERE id='${id}'`);
      expect(psql(`SELECT status || '|' || (paid_amount = 115)::text FROM public.zen_billing_statements WHERE id='${id}'`))
        .toBe('CLOSED|true');
      expect(psqlAsErr(U_ISSUER, `DELETE FROM public.zen_billing_statements WHERE id='${id}'`))
        .toContain('header_delete_forbidden');
    });

    it('TC-359-ST7: created_at은 항상 불변 (DRAFT에서도)', () => {
      const r = createStatement(U_ISSUER, { orgId: ORG_SHIPPER, month: 1 });
      const no = r.split('|')[0];
      expect(psqlAsErr(U_ISSUER, `UPDATE public.zen_billing_statements SET created_at=now() - interval '1 day' WHERE statement_no='${no}'`))
        .toContain('created_fields_immutable');
      psqlAs(U_ISSUER, `DELETE FROM public.zen_billing_statements WHERE statement_no='${no}'`);
    });
  });

  // ========== PR #1397 검토 수정 1~4 ==========
  describe('TC-359-FX: PR #1397 수정 반영 — INSERT 상태 우회·오더 적합성·tier 정합성·공백 ADHOC', () => {
    it('TC-359-FX1: authenticated의 ISSUED/CLOSED 직접 헤더 INSERT 전부 거부 (수정 1)', () => {
      const issErr = psqlAsErr(U_ISSUER, `
        INSERT INTO public.zen_billing_statements
          (statement_no, issuer_org_id, billed_party_type, billed_org_id, tier, period_year, period_month, round_no, status, issued_at, issued_by)
        VALUES ('ST-202610-90-9001', '${ORG_ISSUER}', 'ORG', '${ORG_SHIPPER}', 'AGENCY_TO_SHIPPER', 2026, 10, 90, 'ISSUED', now(), '${U_ISSUER}');`);
      expect(issErr.toLowerCase()).toContain('row-level security');

      const closedErr = psqlAsErr(U_ISSUER, `
        INSERT INTO public.zen_billing_statements
          (statement_no, issuer_org_id, billed_party_type, billed_org_id, tier, period_year, period_month, round_no, status, issued_at, paid_amount, closed_at)
        VALUES ('ST-202610-91-9001', '${ORG_ISSUER}', 'ORG', '${ORG_SHIPPER}', 'AGENCY_TO_SHIPPER', 2026, 10, 91, 'CLOSED', now(), 115, now());`);
      expect(closedErr.toLowerCase()).toContain('row-level security');

      // 부수효과 0: 두 statement_no도 존재하지 않아야 함
      expect(psql(`SELECT count(*) FROM public.zen_billing_statements WHERE statement_no IN ('ST-202610-90-9001','ST-202610-91-9001')`)).toBe('0');
      // 정상 DRAFT INSERT는 계속 허용 (RLS 회귀 없음)
      const ok = psqlAsErr(U_ISSUER, `
        INSERT INTO public.zen_billing_statements
          (statement_no, issuer_org_id, billed_party_type, billed_org_id, tier, period_year, period_month, round_no)
        VALUES ('ST-202610-92-9001', '${ORG_ISSUER}', 'ORG', '${ORG_SHIPPER}', 'AGENCY_TO_SHIPPER', 2026, 10, 92)`);
      expect(ok).toBe('');
      psqlAs(U_ISSUER, `DELETE FROM public.zen_billing_statements WHERE statement_no='ST-202610-92-9001'`);
    });

    it('TC-359-FX2: 항목 INSERT — 미정산 오더·타 대리점 오더 거부 + 정상 2경로(수기 shipper_id·등록 agency_org_id) 허용 (수정 2)', () => {
      const r = createStatement(U_ISSUER, { orgId: ORG_SHIPPER, month: 12 });
      const stmtId = psql(`SELECT id::text FROM public.zen_billing_statements WHERE statement_no='${r.split('|')[0]}'`);

      // ① 미정산 오더 → 거부
      const unsettled = makeOrder({ settled: false });
      const e1 = addItem(U_ISSUER, stmtId, unsettled, 'AGENCY_TO_SHIPPER', 100);
      expect(e1).toContain('item_order_not_eligible');
      expect(e1).toContain('NOT_SETTLED');

      // ② 타 대리점 소속 오더(AGENCY B의 화주) → 거부
      const foreign = makeOrder({ shipperId: ORG_OTHER });
      const e2 = addItem(U_ISSUER, stmtId, foreign, 'AGENCY_TO_SHIPPER', 100);
      expect(e2).toContain('item_order_not_eligible');

      // ③ 정상 A: 수기 화주 오더 — shipper_id = 발행 대리점 → 허용
      const adhocOrder = makeOrder({ shipperId: ORG_ISSUER });
      expect(addItem(U_ISSUER, stmtId, adhocOrder, 'AGENCY_TO_SHIPPER', 100)).toBe('');

      // ④ 정상 B: 등록 화주 오더 — agency_org_id = 발행 대리점 (shipper_id는 실제 화주) → 허용
      const registeredOrder = makeOrder({ shipperId: ORG_SHIPPER, agencyId: ORG_ISSUER });
      expect(addItem(U_ISSUER, stmtId, registeredOrder, 'AGENCY_TO_SHIPPER', 100)).toBe('');

      expect(psql(`SELECT count(*) FROM public.zen_billing_statement_items WHERE statement_id='${stmtId}'`)).toBe('2');

      // ⑤ order_id 변경 UPDATE로 외부 오더를 끼우는 경로도 거부
      const e5 = psqlAsErr(U_ISSUER, `
        UPDATE public.zen_billing_statement_items SET order_id='${foreign}'
        WHERE statement_id='${stmtId}' AND order_id='${adhocOrder}'`);
      expect(e5).toContain('item_order_not_eligible');

      // 정리: DRAFT 헤더 삭제(항목 CASCADE)
      psqlAs(U_ISSUER, `DELETE FROM public.zen_billing_statements WHERE id='${stmtId}'`);
    });

    it('TC-359-FX3: tier 정합성 — 대리점의 ADMIN_TO_AGENCY 거부, Admin의 AGENCY_TO_SHIPPER 거부 (수정 3)', () => {
      // RPC 경로
      const agencyErr = psqlAsErr(U_ISSUER, `
        SELECT stmt_no FROM public.create_billing_statement('ADMIN_TO_AGENCY', 2026, 10, '${ORG_SHIPPER}', NULL, NULL, NULL, NULL);`);
      expect(agencyErr).toContain('tier_mismatch_for_issuer');

      const adminErr = psqlAsErr(U_ADMIN, `
        SELECT stmt_no FROM public.create_billing_statement('AGENCY_TO_SHIPPER', 2026, 10, '${ORG_SHIPPER}', NULL, NULL, NULL, NULL);`);
      expect(adminErr).toContain('tier_mismatch_for_issuer');

      // INSERT 정책 경로 (RLS WITH CHECK)
      const policyErr = psqlAsErr(U_ISSUER, `
        INSERT INTO public.zen_billing_statements
          (statement_no, issuer_org_id, billed_party_type, billed_org_id, tier, period_year, period_month, round_no)
        VALUES ('ST-202610-93-9001', '${ORG_ISSUER}', 'ORG', '${ORG_SHIPPER}', 'ADMIN_TO_AGENCY', 2026, 10, 93)`);
      expect(policyErr.toLowerCase()).toContain('row-level security');

      // Admin의 정상 tier(ADMIN_TO_SHIPPER)는 허용 (회귀 없음)
      const adminOk = createStatement(U_ADMIN, { orgId: ORG_SHIPPER, tier: 'ADMIN_TO_SHIPPER', month: 10 });
      expect(adminOk.split('|')[1]).toBe('1'); // Admin조직(ORG_STRANGER)의 독립 차수
      psqlAs(U_ADMIN, `DELETE FROM public.zen_billing_statements WHERE statement_no='${adminOk.split('|')[0]}'`);
    });

    it('TC-359-FX4: ADHOC 공백 이름 직접 INSERT → party_check 거부 (수정 4)', () => {
      const err = psqlAsErr(U_ISSUER, `
        INSERT INTO public.zen_billing_statements
          (statement_no, issuer_org_id, billed_party_type, billed_org_id, billed_name, tier, period_year, period_month, round_no)
        VALUES ('ST-202610-94-9001', '${ORG_ISSUER}', 'ADHOC', NULL, '   ', 'AGENCY_TO_SHIPPER', 2026, 10, 94)`);
      expect(err.toLowerCase()).toContain('zen_billing_statements_party_check');
      expect(psql(`SELECT count(*) FROM public.zen_billing_statements WHERE statement_no='ST-202610-94-9001'`)).toBe('0');
    });
  });
});
