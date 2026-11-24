// TASK-B-383 (Issue #1475, DEF-B-171) — 플랫폼 발행 청구서 조회 역할 조건 실세션 검증
//
// 목표 상태(PR #1488 [설계 확정]) 단언:
//  · 플랫폼 발행분은 ADMIN·ZENITH_SUPER_ADMIN만 (발행자 측 소속 역할 기준) — 그 밖은 차단
//  · 대리점 발행분·수신자 자격·감독 경로는 그대로 (수신자 분기가 우선)
//  · 판정 불가(조직 조회 결과 없음)면 fail-closed: 비관리 역할 차단, 관리 역할은 발행자 자격으로 허용
// 원칙: 실제 로그인 구조 JWT 세션의 SELECT 결과로만 단언(소스 문자열 검사 금지),
//       되돌리기(정책 원문 복원) 시 이 테스트가 FAIL함을 재현 절차로 실측한다.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { createTestOrg, getUserClient, psql, makeJwt } from './helpers/db';

type Id = Awaited<ReturnType<typeof createTestOrg>>;
type Extra = { userId: string; email: string; jwt: string };

const KEY = randomUUID().slice(0, 8);
const P1 = randomUUID();  // 플랫폼 발행 · 수신자 = 대리점A
const P2 = randomUUID();  // 플랫폼 발행 · 수신자 = 플랫폼 자기 조직 (수신자 분기 우선 단언용)
const A1 = randomUUID();  // 대리점A 발행 · 수신자 = 화주S
const ORDERS = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];

const NOS = { P1: 'ST-202611-71-0001', P2: 'ST-202611-72-0001', A1: 'ST-202611-73-0001' };

let admin: Id; let orgP = '';
const platform: Extra[] = [];       // ZENITH_SUPER_ADMIN·MANAGER·OPERATOR (플랫폼 org 공유)
let agencyA: Id; const agencyAExtra: Extra[] = [];  // SUB_ADMIN (대리점A org 공유 — 목표 구성과 동일)
let agencyB: Id;
let shipperS: Id;
let corpC: Id;

const ORG_SELECT_POLICY = 'Allow authenticated to select zen_organizations';

function addOrgUser(orgId: string, orgType: string, role: string, prefix: string): Extra {
  const userId = randomUUID();
  const email = `${prefix}-${KEY}@test.kr`;
  psql(`
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES ('${userId}', '${email}', jsonb_build_object('org_id','${orgId}','full_name','b383i','role','${role}','is_new_org',false));
    UPDATE public.zen_profiles SET role='${role}', status='ACTIVE', org_id='${orgId}' WHERE id='${userId}';
    UPDATE auth.users SET raw_app_meta_data = COALESCE(raw_app_meta_data,'{}'::jsonb) ||
      jsonb_build_object('org_id','${orgId}','role','${role}','org_type','${orgType}','status','ACTIVE') WHERE id='${userId}';
  `);
  return { userId, email, jwt: makeJwt({ sub: userId, email, role, orgId }) };
}

/** 세션에서 보이는 청구서 번호 집합 (정렬된 'A+B' 또는 '(0건)') */
async function see(jwt: string, ids: string[]): Promise<string> {
  const sb = getUserClient(jwt);
  const { data, error } = await sb.from('zen_billing_statements').select('statement_no').in('id', ids);
  if (error) throw new Error(`select failed: ${error.message}`);
  const nos = (data as Array<{ statement_no: string }>).map((d) => d.statement_no).sort();
  return nos.length ? nos.join('+') : '(0건)';
}

/** 세션에서 보이는 항목(헤더 귀속) 수 */
async function seeItems(jwt: string, ids: string[]): Promise<string> {
  const sb = getUserClient(jwt);
  const { data, error } = await sb.from('zen_billing_statement_items').select('statement_id').in('statement_id', ids);
  if (error) throw new Error(`items select failed: ${error.message}`);
  const names = (data as Array<{ statement_id: string }>)
    .map((d) => (d.statement_id === P1 ? 'P1i' : d.statement_id === P2 ? 'P2i' : 'A1i')).sort();
  return names.length ? names.join('+') : '(0건)';
}

const ALL3 = [P1, P2, A1];

describe('TASK-B-383 플랫폼 발행 청구서 역할 조건 (목표 상태 단언)', () => {
  beforeAll(async () => {
    // 멱등: 이전 잔여 정리
    psql(`ALTER TABLE public.zen_billing_statements DISABLE TRIGGER trg_billing_statement_before_delete;
          ALTER TABLE public.zen_billing_statement_items DISABLE TRIGGER trg_billing_statement_items_guard;`);
    psql(`DELETE FROM public.zen_billing_statement_items WHERE statement_id IN
            (SELECT id FROM public.zen_billing_statements WHERE statement_no IN ('${NOS.P1}','${NOS.P2}','${NOS.A1}'));
          DELETE FROM public.zen_billing_statements WHERE statement_no IN ('${NOS.P1}','${NOS.P2}','${NOS.A1}');`);
    psql(`ALTER TABLE public.zen_billing_statements ENABLE TRIGGER trg_billing_statement_before_delete;
          ALTER TABLE public.zen_billing_statement_items ENABLE TRIGGER trg_billing_statement_items_guard;`);
    psql(`DELETE FROM public.zen_orders WHERE order_no LIKE 'B383I-O%';`);
    psql(`DELETE FROM public.zen_profiles WHERE email LIKE 'b383i-%';`);
    psql(`DELETE FROM auth.users WHERE email LIKE 'b383i-%';`);
    // 이전 런이 떨어뜨린 조직 조회 정책 복구(방어)
    if (Number(psql(`SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='zen_organizations' AND policyname='${ORG_SELECT_POLICY}'`)) === 0) {
      psql(`CREATE POLICY "${ORG_SELECT_POLICY}" ON public.zen_organizations FOR SELECT TO authenticated USING (true);`);
    }

    admin = await createTestOrg({ prefix: `b383i_admin_${KEY}`, role: 'ADMIN', orgType: 'PLATFORM' });
    orgP = admin.orgId;
    platform.push(addOrgUser(orgP, 'PLATFORM', 'ZENITH_SUPER_ADMIN', 'b383i_super'));
    platform.push(addOrgUser(orgP, 'PLATFORM', 'MANAGER', 'b383i_manager'));
    platform.push(addOrgUser(orgP, 'PLATFORM', 'OPERATOR', 'b383i_operator'));
    agencyA = await createTestOrg({ prefix: `b383i_agencyA_${KEY}`, role: 'AGENCY', orgType: 'AGENCY' });
    agencyAExtra.push(addOrgUser(agencyA.orgId, 'AGENCY', 'SUB_ADMIN', 'b383i_subadmin')); // 목표 구성: SUB_ADMIN은 대리점 소속
    agencyB = await createTestOrg({ prefix: `b383i_agencyB_${KEY}`, role: 'AGENCY', orgType: 'AGENCY' });
    shipperS = await createTestOrg({ prefix: `b383i_shipperS_${KEY}`, role: 'INDIVIDUAL', orgType: 'INDIVIDUAL' });
    corpC = await createTestOrg({ prefix: `b383i_corpC_${KEY}`, role: 'CORPORATE', orgType: 'CORPORATE' });

    psql(`
      INSERT INTO public.zen_orders (id, order_no, cargo_details, transport_mode, status, shipper_id, agency_org_id,
        cost_settlement_status, cost_settled_at, cost_settled_by, created_at)
      VALUES ('${ORDERS[0]}','B383I-O1-${KEY}','{}','UPS','DELIVERED','${shipperS.orgId}','${orgP}','SETTLED',now(),'${admin.userId}',now()),
             ('${ORDERS[1]}','B383I-O2-${KEY}','{}','UPS','DELIVERED','${shipperS.orgId}','${orgP}','SETTLED',now(),'${admin.userId}',now()),
             ('${ORDERS[2]}','B383I-O3-${KEY}','{}','UPS','DELIVERED','${shipperS.orgId}','${agencyA.orgId}','SETTLED',now(),'${admin.userId}',now()),
             ('${ORDERS[3]}','B383I-O4-${KEY}','{}','UPS','DELIVERED','${shipperS.orgId}','${agencyA.orgId}','SETTLED',now(),'${admin.userId}',now());

      INSERT INTO public.zen_billing_statements (id, statement_no, issuer_org_id, billed_party_type, billed_org_id,
        tier, period_year, period_month, round_no, status, created_by)
      VALUES ('${P1}','${NOS.P1}','${orgP}','ORG','${agencyA.orgId}','ADMIN_TO_AGENCY',2026,11,1,'DRAFT','${admin.userId}'),
             ('${P2}','${NOS.P2}','${orgP}','ORG','${orgP}','ADMIN_TO_AGENCY',2026,11,1,'DRAFT','${admin.userId}'),
             ('${A1}','${NOS.A1}','${agencyA.orgId}','ORG','${shipperS.orgId}','AGENCY_TO_SHIPPER',2026,11,1,'DRAFT','${agencyA.userId}');

      INSERT INTO public.zen_billing_statement_items (id, statement_id, order_id, tier, line_total)
      VALUES (gen_random_uuid(),'${P1}','${ORDERS[0]}','ADMIN_TO_AGENCY',1000),
             (gen_random_uuid(),'${P2}','${ORDERS[1]}','ADMIN_TO_AGENCY',1000),
             (gen_random_uuid(),'${A1}','${ORDERS[2]}','AGENCY_TO_SHIPPER',1000);
      UPDATE public.zen_billing_statements SET status='ISSUED', issued_at=now() WHERE id IN ('${P1}','${P2}','${A1}');
    `);
    const st = psql(`SELECT string_agg(status, ',') FROM public.zen_billing_statements WHERE id IN ('${P1}','${P2}','${A1}')`);
    if (st !== 'ISSUED,ISSUED,ISSUED') throw new Error(`[B-383] fixture 발행 실패: ${st}`);
  });

  afterAll(async () => {
    try {
      psql(`ALTER TABLE public.zen_billing_statements DISABLE TRIGGER trg_billing_statement_before_delete;
            ALTER TABLE public.zen_billing_statement_items DISABLE TRIGGER trg_billing_statement_items_guard;`);
      psql(`DELETE FROM public.zen_billing_statement_items WHERE statement_id IN ('${P1}','${P2}','${A1}');
            DELETE FROM public.zen_billing_statements WHERE id IN ('${P1}','${P2}','${A1}');`);
      psql(`ALTER TABLE public.zen_billing_statements ENABLE TRIGGER trg_billing_statement_before_delete;
            ALTER TABLE public.zen_billing_statement_items ENABLE TRIGGER trg_billing_statement_items_guard;`);
      psql(`DELETE FROM public.zen_orders WHERE order_no LIKE 'B383I-O%';`);
      psql(`DELETE FROM public.zen_profiles WHERE email LIKE 'b383i-%';`);
      psql(`DELETE FROM auth.users WHERE email LIKE 'b383i-%';`);
      // 조직 조회 정책 방어 복구 (fail-closed 런이 실패해도 남지 않게)
      if (Number(psql(`SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='zen_organizations' AND policyname='${ORG_SELECT_POLICY}'`)) === 0) {
        psql(`CREATE POLICY "${ORG_SELECT_POLICY}" ON public.zen_organizations FOR SELECT TO authenticated USING (true);`);
      }
    } catch (e) {
      console.log('[b383 cleanup warn]', String(e));
    }
    await Promise.all([agencyA, agencyB, shipperS, corpC, admin].map((i) => i.cleanup().catch((e: unknown) => console.log('[b383 cleanup err]', String(e)))));
  });

  it('1. 헤더 매트릭스 — 역할 × 발행 조직 (목표 표의 모든 셀)', async () => {
    const superU = platform[0], manager = platform[1], operator = platform[2];
    const subA = agencyAExtra[0];
    const cases: Array<[string, string, string]> = [
      // [세션, 기대(허용 목록)], 플랫폼 발행 P1·P2 / 대리점 발행 A1
      ['ADMIN@플랫폼', admin.jwt, NOS.P1 + '+' + NOS.P2 + '+' + NOS.A1],
      ['ZENITH_SUPER_ADMIN@플랫폼', superU.jwt, NOS.P1 + '+' + NOS.P2 + '+' + NOS.A1],
      // MANAGER·OPERATOR: 플랫폼 발행(발행자 경로) 차단, 자기조직 수신자 P2는 우선, 감독(A1) 없음
      ['MANAGER@플랫폼', manager.jwt, NOS.P2],
      ['OPERATOR@플랫폼', operator.jwt, NOS.P2],
      // 대리점 소속: 자기 대리점 대상 플랫폼 발행분(수신자) + 자기 발행분 허용 / 타 발행·타 수신 없음
      ['SUB_ADMIN@대리점A', subA.jwt, NOS.P1 + '+' + NOS.A1],
      ['AGENCY@대리점A', agencyA.jwt, NOS.P1 + '+' + NOS.A1],
      ['AGENCY@대리점B', agencyB.jwt, '(0건)'],
      ['INDIVIDUAL@화주S', shipperS.jwt, NOS.A1],
      ['CORPORATE@화주C', corpC.jwt, '(0건)'],
    ];
    for (const [label, jwt, expected] of cases) {
      expect(await see(jwt, ALL3), `${label} 헤더`).toBe(expected);
    }
  }, 120000);

  it('2. 항목 매트릭스 — 헤더와 동일한 판정 (항목은 헤더 종속)', async () => {
    const superU = platform[0], manager = platform[1], operator = platform[2];
    const subA = agencyAExtra[0];
    const cases: Array<[string, string, string]> = [
      ['ADMIN@플랫폼', admin.jwt, 'A1i+P1i+P2i'],
      ['ZENITH_SUPER_ADMIN@플랫폼', superU.jwt, 'A1i+P1i+P2i'],
      ['MANAGER@플랫폼', manager.jwt, 'P2i'],
      ['OPERATOR@플랫폼', operator.jwt, 'P2i'],
      ['SUB_ADMIN@대리점A', subA.jwt, 'A1i+P1i'],
      ['AGENCY@대리점A', agencyA.jwt, 'A1i+P1i'],
      ['AGENCY@대리점B', agencyB.jwt, '(0건)'],
      ['INDIVIDUAL@화주S', shipperS.jwt, 'A1i'],
      ['CORPORATE@화주C', corpC.jwt, '(0건)'],
    ];
    for (const [label, jwt, expected] of cases) {
      expect(await seeItems(jwt, ALL3), `${label} 항목`).toBe(expected);
    }
  }, 120000);

  it('3. 판정 불가(fail-closed): 조직 조회 결과가 없으면 비관리 역할 차단·관리 역할은 발행자 자격으로 허용', async () => {
    const superU = platform[0], manager = platform[1], subA = agencyAExtra[0];
    try {
      // 조직 조회를 일시 제거해 "판정 불가"를 재현 (RLS 정책 없음 → 행 0)
      psql(`DROP POLICY IF EXISTS "${ORG_SELECT_POLICY}" ON public.zen_organizations;`);

      // 비관리 역할: 발행자 매치가 돼도 판정 불가 → 차단(fail-closed)
      expect(await see(manager.jwt, [P1]), 'MANAGER 판정 불가').toBe('(0건)');
      expect(await see(operatorJwt(), [P1]), 'OPERATOR 판정 불가').toBe('(0건)');
      expect(await see(agencyA.jwt, [A1]), 'AGENCY 발행자 경로 판정 불가').toBe('(0건)');
      expect(await see(subA.jwt, [A1]), 'SUB_ADMIN 발행자 경로 판정 불가').toBe('(0건)');
      // 수신자 분기는 조직 조회에 의존하지 않아 그대로 유지 (우선)
      expect(await see(agencyA.jwt, [P1]), 'AGENCY 수신자(판정 불가 중)').toContain(NOS.P1);
      expect(await see(subA.jwt, [P1]), 'SUB_ADMIN 수신자(판정 불가 중)').toContain(NOS.P1);
      // 관리 역할: 발행자 자격으로 계속 허용
      expect(await see(admin.jwt, [P1]), 'ADMIN 판정 불가').toContain(NOS.P1);
      expect(await see(superU.jwt, [P1]), 'SUPER 판정 불가').toContain(NOS.P1);
      // 수신자 분기는 조직 조회에 의존하지 않음 → P2는 그대로
      expect(await see(manager.jwt, [P2]), 'MANAGER 수신자(판정 불가 중)').toContain(NOS.P2);
    } finally {
      psql(`CREATE POLICY "${ORG_SELECT_POLICY}" ON public.zen_organizations FOR SELECT TO authenticated USING (true);`);
    }
    // 복원 확인: 비관리 역할의 발행자 경로가 다시 열린다
    expect(await see(agencyA.jwt, [A1]), '복원 후 AGENCY').toContain(NOS.A1);
    expect(await see(subA.jwt, [A1]), '복원 후 SUB_ADMIN').toContain(NOS.A1);
    expect(await see(manager.jwt, [P1]), '복원 후 MANAGER 발행자 경로').toBe('(0건)'); // 정책 조건은 그대로 — 복원은 조회 가시성만
  }, 120000);
});

function operatorJwt(): string {
  return platform[2].jwt;
}
