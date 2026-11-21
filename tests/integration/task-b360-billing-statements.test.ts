// TASK-B-360 (Issue #1366) — 청구서 서버 액션 실DB 검증 (WBS 4.1~4.5 / DoD 2~5)
//
// 원칙(이슈 코멘트 2·3·4):
//  · service_role이 아니라 **각 세션(authenticated JWT)** 로 검증 — helpers/db.ts 공용 헬퍼 사용
//  · 상태 전이·중복은 **실제 서버 액션 호출**로 검증 (선조회가 아니라 조건부 UPDATE + DB 트리거가 authority)
//  · 보조 조회 실패를 무시하면 안 됨 → 성공 경로에서 실제 데이터가 조회되는지 함께 단언
//  · 소스(마이그레이션/SQL) 문자열 toContain 단독 단언 금지 — 전부 실제 쿼리·응답 결과로 단언
//  · describe마다 전용 오더를 배정한다 — UNIQUE(order_id, tier)가 전역이라 공유하면 선행 describe가 소모시킴
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import {
  createTestOrg, getServiceClient, getUserClient, psql, assertOrgIdClaim,
} from './helpers/db';

const mockValidateUserAction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidateUserAction }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));

import {
  listBillableOrders,
  listAdhocShipperNames,
  createBillingStatement,
  cancelBillingStatement,
  issueBillingStatement,
  confirmStatementPayment,
  getBillingStatements,
  getBillingStatementDetail,
  normalizeShipperName,
} from '@/app/actions/finance/billing-statements';

type Identity = Awaited<ReturnType<typeof createTestOrg>>;

let agency: Identity;       // 발행자 (AGENCY)
let otherAgency: Identity;  // 타 대리점 (접근 거부 대상)
let shipper: Identity;      // 청구 대상 화주 (등록)
let admin: Identity;        // 감독 Admin
let stranger: Identity;     // 비소속 화주
let supabase: ReturnType<typeof getServiceClient>;

// describe 전용 오더 — UNIQUE(order_id, tier)가 전역이라 공유하면 선행 describe가 소모시킨다
const ORDER_RLS = '36000000-0000-4000-8000-000000000011';       // 조회 3경로
const ORDER_ST1 = '36000000-0000-4000-8000-000000000012';       // 상태 전이 (ISSUED→CLOSED)
const ORDER_ST2 = '36000000-0000-4000-8000-000000000013';       // 상태 전이 (DRAFT 유지)
const ORDER_PAY = '36000000-0000-4000-8000-000000000014';       // 입금액 불일치
const ORDER_UNSETTLED = '36000000-0000-4000-8000-000000000015'; // 미정산 (후보 제외·동시성)
const ORDER_CONC = '36000000-0000-4000-8000-000000000016';      // 동시 생성 (병렬 1건 성공)
const ORDER_LIST = '36000000-0000-4000-8000-000000000017';      // 후보 조회 (정상 → 포함 후 제외)
const ORDER_OTHER = '36000000-0000-4000-8000-000000000018';     // 타 대리점 발행분 (후보 제외)
const ORDER_ADHOC = '36000000-0000-4000-8000-000000000019';     // 수기 화주 (shipper_id = 발행 대리점)
const ORDER_A2A = '36000000-0000-4000-8000-00000000001A';        // Admin→대리점 (agency≠platform 금액)
const ORDER_PLAT = '36000000-0000-4000-8000-00000000001B';       // metadata.agency 없음 → platform 폴백
const ORDER_A2S = '36000000-0000-4000-8000-00000000001C';        // Admin→화주 (agency_org_id NULL)
const ORDER_MISMATCH = '36000000-0000-4000-8000-00000000001D';   // shipper_id ≠ 청구 대상
const ORDER_USD = '36000000-0000-4000-8000-00000000001E';        // 비 KRW 매출 → 통화 가드
const ALL_ORDERS = [
  ORDER_RLS, ORDER_ST1, ORDER_ST2, ORDER_PAY, ORDER_UNSETTLED,
  ORDER_CONC, ORDER_LIST, ORDER_OTHER, ORDER_ADHOC,
  ORDER_A2A, ORDER_PLAT, ORDER_A2S, ORDER_MISMATCH, ORDER_USD,
];

/** 현재 서버 액션 호출 주체를 해당 identity의 authenticated 세션으로 전환한다. */
function asUser(identity: Identity) {
  mockValidateUserAction.mockResolvedValue({
    supabase: getUserClient(identity.jwt),
    user: { id: identity.userId },
    profile: { id: identity.userId, role: identity.role, org_id: identity.orgId, status: 'ACTIVE' },
  });
}

function seedOrder(id: string, opts: {
  shipperOrg: string; agencyOrg?: string | null; settled: boolean; shipperName?: string;
  platformOnly?: boolean; usd?: boolean; basisAt?: string;
}) {
  const settled = opts.settled
    ? `'SETTLED', now(), '${admin.userId}'`
    : `'NOT_SETTLED', NULL, NULL`;
  psql(`
    INSERT INTO public.zen_orders
      (id, order_no, cargo_details, transport_mode, status, shipper_id, agency_org_id,
       shipper_name, cost_settlement_status, cost_settled_at, cost_settled_by, created_at)
    VALUES ('${id}', 'ZEN-360-${id.slice(-4)}', '{}'::jsonb, 'UPS', 'DELIVERED',
            '${opts.shipperOrg}', ${opts.agencyOrg ? `'${opts.agencyOrg}'` : 'NULL'},
            ${opts.shipperName ? `'${opts.shipperName}'` : 'NULL'}, ${settled}, now())
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status, cost_settlement_status = EXCLUDED.cost_settlement_status,
      cost_settled_at = EXCLUDED.cost_settled_at, cost_settled_by = EXCLUDED.cost_settled_by,
      shipper_id = EXCLUDED.shipper_id, agency_org_id = EXCLUDED.agency_org_id,
      shipper_name = EXCLUDED.shipper_name;
    INSERT INTO public.order_status_history (order_id, prev_status, next_status, changed_by, created_at)
    VALUES ('${id}', 'IN_TRANSIT', 'DELIVERED', '${admin.userId}', '${opts.basisAt ?? '2026-11-10T10:00:00Z'}')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.zen_order_rate_snapshots
      (id, order_id, applied_unit_price, applied_currency, applied_rule, metadata, snapshot_at)
    VALUES (gen_random_uuid(), '${id}', 1000, 'KRW', 'TEST',
            (CASE WHEN ${opts.platformOnly ? 'true' : 'false'} THEN
              '{"platform":{"billingWeightKg":7,"chargeableWeightKg":6.5,"baseSellingPrice":100000,"fuelSurchargeSellingAmount":20000,"surgeFeeSellingAmount":5000,"otherChargesSellingTotal":1000,"currency":"KRW"}}'
            ELSE
              '{"platform":{"billingWeightKg":5,"chargeableWeightKg":4.78,"baseSellingPrice":100000,"fuelSurchargeSellingAmount":20000,"surgeFeeSellingAmount":5000,"otherChargesSellingTotal":1000,"currency":"KRW"},
                "agency":{"baseSellingPrice":80000,"fuelSurchargeSellingAmount":16000,"surgeFeeSellingAmount":4000,"otherChargesSellingTotal":800,"agencyCostPrice":100800}}'
            END)::jsonb, now())
    ON CONFLICT (order_id) DO UPDATE SET metadata = EXCLUDED.metadata;
    INSERT INTO public.zen_order_costs (id, order_id, cost_type, unit_price, quantity, currency, is_revenue, created_at)
    VALUES (gen_random_uuid(), '${id}', 'BASE_FREIGHT', 100000, 1, '${opts.usd ? 'USD' : 'KRW'}', true, now()),
          (gen_random_uuid(), '${id}', 'FUEL_SURCHARGE', 20000, 1, '${opts.usd ? 'USD' : 'KRW'}', true, now()),
          (gen_random_uuid(), '${id}', 'SURGE_FEE', 5000, 1, '${opts.usd ? 'USD' : 'KRW'}', true, now()),
          (gen_random_uuid(), '${id}', 'OTHER_CHARGE', 1000, 1, '${opts.usd ? 'USD' : 'KRW'}', true, now())
    ON CONFLICT DO NOTHING;
  `);
}

function cleanup() {
  // ISSUED/CLOSED 헤더는 상태 트리거로 삭제가 차단된다(의도된 동작) — 정리 중에만 비활성화.
  // 헤더가 지워지면 항목 CASCADE가 NOT FOUND 경로(조건 4)로 정상 삭제된다.
  psql(`ALTER TABLE public.zen_billing_statements DISABLE TRIGGER trg_billing_statement_before_delete;`);
  psql(`DELETE FROM public.zen_billing_statements WHERE issuer_org_id IN ('${agency.orgId}','${otherAgency.orgId}');`);
  psql(`ALTER TABLE public.zen_billing_statements ENABLE TRIGGER trg_billing_statement_before_delete;`);
  const ids = ALL_ORDERS.map((o) => `'${o}'`).join(',');
  psql(`DELETE FROM public.zen_order_costs WHERE order_id IN (${ids});`);
  psql(`DELETE FROM public.zen_order_rate_snapshots WHERE order_id IN (${ids});`);
  psql(`DELETE FROM public.order_status_history WHERE order_id IN (${ids});`);
  psql(`DELETE FROM public.zen_orders WHERE id IN (${ids});`);
  psql(`DELETE FROM public.zen_agency_shippers WHERE agency_org_id IN ('${agency.orgId}','${otherAgency.orgId}');`);
}

/** 이전 실행 잔여물 purge — 고정 오더 ID를 점유한 ISSUED/CLOSED 청구서가
 *  `order_already_inclusive`로 조용히 실패하는 것을 차단한다. (멱등 — 2회 연속 실행 검증됨) */
function purgeLeftover() {
  const ids = ALL_ORDERS.map((o) => `'${o}'`).join(',');
  // ISSUED/CLOSED 헤더는 상태 트리거로 삭제가 차단된다(의도된 동작) — purge 중에만 비활성화
  psql(`ALTER TABLE public.zen_billing_statements DISABLE TRIGGER trg_billing_statement_before_delete;`);
  psql(`DELETE FROM public.zen_billing_statements
        WHERE id IN (SELECT statement_id FROM public.zen_billing_statement_items WHERE order_id IN (${ids}))
           OR issuer_org_id IN (SELECT id FROM public.zen_organizations WHERE name LIKE 'b360%');`);
  psql(`ALTER TABLE public.zen_billing_statements ENABLE TRIGGER trg_billing_statement_before_delete;`);
  psql(`DELETE FROM public.zen_order_costs WHERE order_id IN (${ids});`);
  psql(`DELETE FROM public.zen_order_rate_snapshots WHERE order_id IN (${ids});`);
  psql(`DELETE FROM public.order_status_history WHERE order_id IN (${ids});`);
  psql(`DELETE FROM public.zen_orders WHERE id IN (${ids}) OR order_no LIKE 'ZEN-360-%' OR order_no LIKE 'B360-%';`);
  // FK 순서: 참조하는 쪽 먼저 (order_status_history → profiles → auth.users → orgs)
  psql(`DELETE FROM public.zen_agency_shippers
        WHERE agency_org_id IN (SELECT id FROM public.zen_organizations WHERE name LIKE 'b360%')
           OR shipper_org_id IN (SELECT id FROM public.zen_organizations WHERE name LIKE 'b360%');`);
  psql(`DELETE FROM public.order_status_history
        WHERE changed_by IN (SELECT id FROM auth.users WHERE email LIKE 'b360%');`);
  psql(`DELETE FROM public.zen_profiles WHERE email LIKE 'b360%';`);
  psql(`DELETE FROM auth.users WHERE email LIKE 'b360%';`);
  psql(`DELETE FROM public.zen_organizations WHERE name LIKE 'b360%';`);
}

beforeAll(async () => {
  purgeLeftover();
  supabase = getServiceClient();
  // 랜덤 suffix: zen_profiles.email이 유일이라 이전 실행 잔여물과 충돌하면
  // on_auth_user_created 트리거가 조용히 실패한다(파일 psql은 ON_ERROR_STOP 없음)
  const run = randomUUID().slice(0, 8);
  agency = await createTestOrg({ prefix: `b360_agency_${run}`, role: 'AGENCY', orgType: 'AGENCY' });
  otherAgency = await createTestOrg({ prefix: `b360_other_${run}`, role: 'AGENCY', orgType: 'AGENCY' });
  shipper = await createTestOrg({ prefix: `b360_shipper_${run}`, role: 'SHIPPER', orgType: 'INDIVIDUAL' });
  admin = await createTestOrg({ prefix: `b360_admin_${run}`, role: 'ADMIN', orgType: 'PLATFORM' });
  stranger = await createTestOrg({ prefix: `b360_stranger_${run}`, role: 'SHIPPER', orgType: 'INDIVIDUAL' });
  assertOrgIdClaim(agency.jwt, agency.orgId);

  cleanup();
  psql(`
    INSERT INTO public.zen_agency_shippers (id, agency_org_id, shipper_org_id, shipper_type, is_active, created_at)
    VALUES (gen_random_uuid(), '${agency.orgId}', '${shipper.orgId}', 'INDIVIDUAL', TRUE, now()),
          (gen_random_uuid(), '${otherAgency.orgId}', '${shipper.orgId}', 'INDIVIDUAL', TRUE, now())
    ON CONFLICT DO NOTHING;
  `);
  seedOrder(ORDER_RLS, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, settled: true });
  seedOrder(ORDER_ST1, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, settled: true });
  seedOrder(ORDER_ST2, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, settled: true });
  seedOrder(ORDER_PAY, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, settled: true });
  seedOrder(ORDER_UNSETTLED, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, settled: false });
  seedOrder(ORDER_CONC, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, settled: true });
  seedOrder(ORDER_LIST, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, settled: true });
  seedOrder(ORDER_OTHER, { shipperOrg: shipper.orgId, agencyOrg: otherAgency.orgId, settled: true });
  // 수기 화주 오더: shipper_id = 발행 대리점 (An_17 §3-2 — agency_org_id는 NULL)
  seedOrder(ORDER_ADHOC, { shipperOrg: agency.orgId, agencyOrg: null, settled: true, shipperName: '  (주)ABC   Co ' });
  // 금액 원천 검증용 (조건 4 — 2차 실측 정정분)
  seedOrder(ORDER_A2A, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, settled: true });
  seedOrder(ORDER_PLAT, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, settled: true, platformOnly: true });
  seedOrder(ORDER_A2S, { shipperOrg: shipper.orgId, agencyOrg: null, settled: true });
  seedOrder(ORDER_MISMATCH, { shipperOrg: stranger.orgId, agencyOrg: null, settled: true });
  seedOrder(ORDER_USD, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, settled: true, usd: true });
});

afterAll(async () => {
  try { cleanup(); } catch { /* best-effort */ }
  try {
    await Promise.all([agency, otherAgency, shipper, admin, stranger]
      .filter((i): i is Identity => !!i)
      .map((i) => i.cleanup()));
  } catch { /* best-effort */ }
  try { purgeLeftover(); } catch { /* best-effort */ }
});

const RANGE = { dateFrom: '2026-11-01', dateTo: '2026-11-30', dateBasis: 'DELIVERED' as const };
const ORG_TARGET = (orgId: string) => ({ type: 'ORG' as const, orgId });

// ───────────────────────────────── DoD 4: 조회 3경로 + 타 생성자 비노출

describe('조회 3경로 (RLS) + 타 생성자 비노출', () => {
  let stmtId = '';

  beforeAll(async () => {
    asUser(agency);
    const res = await createBillingStatement({
      billedTarget: ORG_TARGET(shipper.orgId), year: 2026, month: 11, orderIds: [ORDER_RLS],
    });
    expect(res.success).toBe(true);
    stmtId = res.statementId!;
  });

  it('경로 ① 발행자는 DRAFT 포함 자기 청구서를 조회한다', async () => {
    asUser(agency);
    const res = await getBillingStatements({ year: 2026, month: 11 });
    expect(res.success).toBe(true);
    const mine = (res.statements ?? []).filter((s) => s.id === stmtId);
    expect(mine).toHaveLength(1);
    expect(mine[0].scope).toBe('MINE');
    expect(mine[0].status).toBe('DRAFT');

    const detail = await getBillingStatementDetail(stmtId);
    expect(detail.success).toBe(true);
    expect(detail.detail?.items).toHaveLength(1);
    expect(detail.detail?.items[0].lineTotal).toBe(126000);
  });

  it('경로 ② 청구받은 org은 DRAFT를 보지 못하고 ISSUED부터 조회한다 (읽기 전용)', async () => {
    asUser(shipper);
    const before = await getBillingStatements({ year: 2026, month: 11 });
    expect((before.statements ?? []).filter((s) => s.id === stmtId)).toHaveLength(0);

    asUser(agency);
    expect((await issueBillingStatement(stmtId)).success).toBe(true);

    asUser(shipper);
    const after = await getBillingStatements({ year: 2026, month: 11 });
    const visible = (after.statements ?? []).filter((s) => s.id === stmtId);
    expect(visible).toHaveLength(1);
    expect(visible[0].scope).toBe('RECEIVED');
    expect(visible[0].status).toBe('ISSUED');

    // 화주는 조회만 — 취소 시도가 상태를 바꾸지 못한다
    const cancel = await cancelBillingStatement(stmtId);
    expect(cancel.success).toBe(false);
    expect(psql(`SELECT status FROM public.zen_billing_statements WHERE id='${stmtId}'`)).toBe('ISSUED');
  });

  it('경로 ③ Admin은 대리점 발행분을 DRAFT 포함 전 상태로 감독 조회한다 (읽기 전용)', async () => {
    asUser(admin);
    const res = await getBillingStatements({ year: 2026, month: 11 });
    const supervised = (res.statements ?? []).filter((s) => s.id === stmtId);
    expect(supervised).toHaveLength(1);
    expect(supervised[0].scope).toBe('SUPERVISED');

    // 감독은 발행 org가 아니므로 취소 불가
    const cancel = await cancelBillingStatement(stmtId);
    expect(cancel.success).toBe(false);
    expect(cancel.error).toBe('이 청구서를 발행한 조직만 처리할 수 있습니다.');
    expect(psql(`SELECT status FROM public.zen_billing_statements WHERE id='${stmtId}'`)).toBe('ISSUED');
  });

  it('타 대리점은 발행분을 전혀 보지 못하며 상세는 "미존재와 동일" 응답', async () => {
    asUser(otherAgency);
    const list = await getBillingStatements({ year: 2026, month: 11 });
    expect((list.statements ?? []).filter((s) => s.id === stmtId)).toHaveLength(0);

    const detail = await getBillingStatementDetail(stmtId);
    expect(detail.success).toBe(false);
    expect(detail.error).toBe('청구서를 찾을 수 없습니다.');

    // 존재하지 않는 id와 완전히 동일한 응답 (존재 여부 비노출)
    const missing = await getBillingStatementDetail('00000000-0000-4000-8000-000000000099');
    expect(missing.success).toBe(false);
    expect(missing.error).toBe(detail.error);
  });
});

// ───────────────────────────────── DoD 1: 상태 전이 위반 거부 (실제 호출)

describe('상태 전이 위반 거부 (실제 서버 액션 호출)', () => {
  let stmtId = '';

  beforeAll(async () => {
    asUser(agency);
    const res = await createBillingStatement({
      billedTarget: ORG_TARGET(shipper.orgId), year: 2026, month: 10, orderIds: [ORDER_ST1],
    });
    expect(res.success).toBe(true);
    stmtId = res.statementId!;
  });

  it('ISSUED 청구서는 취소(삭제)할 수 없다', async () => {
    asUser(agency);
    expect((await issueBillingStatement(stmtId)).success).toBe(true);

    const res = await cancelBillingStatement(stmtId);
    expect(res.success).toBe(false);
    expect(res.error).toBe('초안(DRAFT) 상태의 청구서만 처리할 수 있습니다.');
    expect(psql(`SELECT count(*) FROM public.zen_billing_statements WHERE id='${stmtId}'`)).toBe('1');
  });

  it('ISSUED에서 다시 발행할 수 없다 (already_issued)', async () => {
    asUser(agency);
    const res = await issueBillingStatement(stmtId);
    expect(res.success).toBe(false);
    expect(res.error).toBe('이미 발행된 청구서입니다.');
    expect(psql(`SELECT status FROM public.zen_billing_statements WHERE id='${stmtId}'`)).toBe('ISSUED');
  });

  it('CLOSED 청구서는 재입금확인할 수 없다 (already_closed)', async () => {
    asUser(agency);
    const total = Number(psql(`SELECT total_amount FROM public.zen_billing_statements WHERE id='${stmtId}'`));
    expect(total).toBeGreaterThan(0);
    const first = await confirmStatementPayment(stmtId, { amount: total, paidAt: '2026-11-20' });
    expect(first.success).toBe(true);

    const again = await confirmStatementPayment(stmtId, { amount: total, paidAt: '2026-11-21' });
    expect(again.success).toBe(false);
    expect(again.error).toBe('이미 입금확인(마감)된 청구서입니다.');
    expect(psql(`SELECT status FROM public.zen_billing_statements WHERE id='${stmtId}'`)).toBe('CLOSED');
  });

  it('DRAFT를 발행 없이 입금확인할 수 없다 (not_issued)', async () => {
    asUser(agency);
    const res = await createBillingStatement({
      billedTarget: ORG_TARGET(shipper.orgId), year: 2026, month: 9, orderIds: [ORDER_ST2],
    });
    expect(res.success).toBe(true);
    const draftId = res.statementId!;

    const confirm = await confirmStatementPayment(draftId, { amount: 1, paidAt: '2026-11-20' });
    expect(confirm.success).toBe(false);
    expect(confirm.error).toBe('발행(확정)된 청구서만 입금확인할 수 있습니다.');
    expect(psql(`SELECT status FROM public.zen_billing_statements WHERE id='${draftId}'`)).toBe('DRAFT');

    // 정리 (DRAFT라 취소 가능)
    expect((await cancelBillingStatement(draftId)).success).toBe(true);
  });

  it('항목 0건 DRAFT는 발행할 수 없다 (DB 트리거 issue_without_items)', async () => {
    // 서버 액션은 orderIds 필수라 0건 헤더를 만들 수 없다 — 직접 INSERT한 0건 DRAFT로 검증
    const emptyId = '36000000-0000-4000-8000-000000000090';
    psql(`DELETE FROM public.zen_billing_statements WHERE id='${emptyId}'`);
    psql(`
      INSERT INTO public.zen_billing_statements
        (id, statement_no, issuer_org_id, billed_party_type, billed_org_id, billed_name,
         tier, period_year, period_month, round_no, created_by, created_at)
      VALUES ('${emptyId}', 'ST-202603-99-9999', '${agency.orgId}', 'ORG', '${shipper.orgId}',
              'B360 Empty', 'AGENCY_TO_SHIPPER', 2026, 3, 99, '${admin.userId}', now());
    `);

    asUser(agency);
    const issue = await issueBillingStatement(emptyId);
    expect(issue.success).toBe(false);
    expect(issue.error).toBe('오더가 없는 청구서는 발행할 수 없습니다.');
    expect(psql(`SELECT status FROM public.zen_billing_statements WHERE id='${emptyId}'`)).toBe('DRAFT');

    // 정리
    expect((await cancelBillingStatement(emptyId)).success).toBe(true);
  });
});

// ───────────────────────────────── DoD 5: 입금액 불일치 시 저장 안 됨

describe('입금액 불일치 시 저장 안 됨', () => {
  let stmtId = '';

  beforeAll(async () => {
    asUser(agency);
    const res = await createBillingStatement({
      billedTarget: ORG_TARGET(shipper.orgId), year: 2026, month: 8, orderIds: [ORDER_PAY],
    });
    expect(res.success).toBe(true);
    stmtId = res.statementId!;
    expect((await issueBillingStatement(stmtId)).success).toBe(true);
  });

  it('입금액 ≠ 청구액이면 오류를 반환하고 CLOSED로 바뀌지 않는다', async () => {
    asUser(agency);
    const total = Number(psql(`SELECT total_amount FROM public.zen_billing_statements WHERE id='${stmtId}'`));
    expect(total).toBeGreaterThan(0);

    const res = await confirmStatementPayment(stmtId, { amount: total - 100, paidAt: '2026-11-20' });
    expect(res.success).toBe(false);
    expect(res.error).toBe('입금액이 청구액과 일치해야 합니다. (전액만 확인 가능)');

    // 저장 안 됨 — 상태·입금 필드 모두 그대로
    const row = psql(`SELECT status || '|' || coalesce(paid_amount::text,'<NULL>') || '|' || coalesce(paid_date::text,'<NULL>')
                      FROM public.zen_billing_statements WHERE id='${stmtId}'`);
    expect(row).toBe('ISSUED|<NULL>|<NULL>');
  });

  it('전액과 일치하면 CLOSED로 전환된다', async () => {
    asUser(agency);
    const total = Number(psql(`SELECT total_amount FROM public.zen_billing_statements WHERE id='${stmtId}'`));
    const res = await confirmStatementPayment(stmtId, { amount: total, paidAt: '2026-11-20' });
    expect(res.success).toBe(true);
    expect(psql(`SELECT status || '|' || (paid_amount = total_amount)::text
                 FROM public.zen_billing_statements WHERE id='${stmtId}'`)).toBe('CLOSED|true');
  });
});

// ───────────────────────────────── DoD 2: 동시 중복 담기

describe('같은 오더 동시 2건 생성 — 부분 저장 0', () => {
  it('미정산 오더 병렬 2건은 모두 거부되고 헤더가 남지 않는다', async () => {
    asUser(agency);
    const before = Number(psql(`SELECT count(*) FROM public.zen_billing_statements WHERE issuer_org_id='${agency.orgId}' AND period_month = 7`));
    const results = await Promise.all([
      createBillingStatement({ billedTarget: ORG_TARGET(shipper.orgId), year: 2026, month: 7, orderIds: [ORDER_UNSETTLED] }),
      createBillingStatement({ billedTarget: ORG_TARGET(shipper.orgId), year: 2026, month: 7, orderIds: [ORDER_UNSETTLED] }),
    ]);
    const errors = results.filter((r) => !r.success).map((r) => r.error);
    expect(errors).toHaveLength(2);
    for (const e of errors) {
      expect(['정산이 완료되지 않았거나 청구 대상에 속하지 않은 오더가 포함되어 있습니다.',
              '이미 청구서에 포함된 오더입니다.']).toContain(e);
    }
    expect(Number(psql(`SELECT count(*) FROM public.zen_billing_statements WHERE issuer_org_id='${agency.orgId}' AND period_month = 7`))).toBe(before);
  }, 30000);

  it('정산완료 오더 병렬 2건 → 정확히 1건 성공, 패자는 이미 포함 오류, orphan 헤더 0', async () => {
    asUser(agency);
    const results = await Promise.all([
      createBillingStatement({ billedTarget: ORG_TARGET(shipper.orgId), year: 2026, month: 6, orderIds: [ORDER_CONC] }),
      createBillingStatement({ billedTarget: ORG_TARGET(shipper.orgId), year: 2026, month: 6, orderIds: [ORDER_CONC] }),
    ]);
    const ok = results.filter((r) => r.success);
    const ng = results.filter((r) => !r.success);
    expect(ok).toHaveLength(1);
    expect(ng).toHaveLength(1);
    expect(ng[0].error).toBe('이미 청구서에 포함된 오더입니다.');

    // orphan 헤더 0: 성공 1건만 남는다
    expect(psql(`SELECT count(*) FROM public.zen_billing_statements
                 WHERE issuer_org_id='${agency.orgId}' AND period_month = 6`)).toBe('1');
    // 성공한 헤더의 항목도 정확히 1건 (부분 저장 없음)
    expect(psql(`SELECT count(*) FROM public.zen_billing_statement_items i
                 JOIN public.zen_billing_statements s ON s.id = i.statement_id
                 WHERE s.issuer_org_id='${agency.orgId}' AND s.period_month = 6`)).toBe('1');
  }, 30000);
});

// ───────────────────────────────── 후보 조회 + 수기 화주명

describe('listBillableOrders / listAdhocShipperNames', () => {
  it('기간 필수·역전 거부, 후보는 정산완료+미포함만, 미정산은 건수로 분리된다', async () => {
    asUser(agency);

    const noRange = await listBillableOrders({ billedTarget: ORG_TARGET(shipper.orgId), dateBasis: 'DELIVERED', dateFrom: '', dateTo: '' });
    expect(noRange.success).toBe(false);
    expect(noRange.error).toContain('요청을 처리하지 못했습니다');

    const inverted = await listBillableOrders({ billedTarget: ORG_TARGET(shipper.orgId), dateBasis: 'DELIVERED', dateFrom: '2026-11-30', dateTo: '2026-11-01' });
    expect(inverted.success).toBe(false);

    const res = await listBillableOrders({ ...RANGE, billedTarget: ORG_TARGET(shipper.orgId) });
    expect(res.success).toBe(true);
    const ids = (res.orders ?? []).map((o) => o.orderId);
    expect(ids).toContain(ORDER_LIST);        // 정산완료 + 미포함 → 후보
    expect(ids).not.toContain(ORDER_UNSETTLED);   // 미정산 제외
    expect(ids).not.toContain(ORDER_OTHER);       // 타 대리점 발행분 제외
    expect(ids).not.toContain(ORDER_ADHOC);       // shipper_id ≠ 대상 화주
    expect(Number(res.excludedUnsettled)).toBeGreaterThanOrEqual(1);

    // 금액 스냅샷이 실제 DB 원천에서 온다 (base 100000 + fuel 20000 + surge 5000 + other 1000)
    const row = (res.orders ?? []).find((o) => o.orderId === ORDER_LIST);
    expect(row?.baseFreight).toBe(100000);
    expect(row?.fuelSurcharge).toBe(20000);
    expect(row?.surgeFee).toBe(5000);
    expect(row?.otherCharges).toBe(1000);
    expect(row?.lineTotal).toBe(126000);
    expect(row?.chargeWeightKg).toBe(5); // metadata.platform.billingWeightKg
    // 합계 = 개별 합
    const sum = (res.orders ?? []).reduce((s, o) => s + o.lineTotal, 0);
    expect(res.totalAmount).toBeCloseTo(sum, 5);
  });

  it('이미 청구서에 포함된 오더는 후보에서 빠진다', async () => {
    asUser(agency);
    const created = await createBillingStatement({
      billedTarget: ORG_TARGET(shipper.orgId), year: 2026, month: 5, orderIds: [ORDER_LIST],
    });
    expect(created.success).toBe(true);

    const res = await listBillableOrders({ ...RANGE, billedTarget: ORG_TARGET(shipper.orgId) });
    expect((res.orders ?? []).map((o) => o.orderId)).not.toContain(ORDER_LIST);
  });

  it('수기 화주: 정규화 일치한 후보만 나온다 (표기 변형 혼입 없음)', async () => {
    asUser(agency);
    const res = await listBillableOrders({
      ...RANGE, billedTarget: { type: 'ADHOC', shipperName: '(주)abc co' },
    });
    expect(res.success).toBe(true);
    const ids = (res.orders ?? []).map((o) => o.orderId);
    // 정규화 동일키 매칭: "  (주)ABC   Co " ↔ "(주)abc co" (부분문자가 아님)
    expect(ids).toContain(ORDER_ADHOC);
    expect(ids).not.toContain(ORDER_LIST);
    expect(ids).not.toContain(ORDER_OTHER);
  });

  it('수기 화주명 자동완성은 대리점만, 정규화 그룹으로 집계된다', async () => {
    asUser(agency);
    const res = await listAdhocShipperNames();
    expect(res.success).toBe(true);
    const row = (res.names ?? []).find((n) => n.normalized === normalizeShipperName('(주)abc co'));
    expect(row).toBeDefined();
    expect(row!.count).toBeGreaterThanOrEqual(1);

    asUser(admin);
    const denied = await listAdhocShipperNames();
    expect(denied.success).toBe(false);
    expect(denied.error).toBe('수기 화주 청구는 대리점 계정만 가능합니다.');
  });

  it('비소속 대상(소속 링크 없는 화주 org)은 거부된다 (target_not_allowed)', async () => {
    asUser(agency);
    const res = await listBillableOrders({ ...RANGE, billedTarget: ORG_TARGET(stranger.orgId) });
    expect(res.success).toBe(false);
    expect(res.error).toBe('청구 대상이 내 소속이 아니거나 올바르지 않습니다.');
  });
});

// ───────────────────────────────── 조건 4·티어 경로 (PR #1404 검토 보완)

describe('티어별 금액 원천·ADHOC·통화 가드 (실제 RPC 호출)', () => {
  it('ADMIN_TO_AGENCY: metadata.agency 금액이 platform과 다르면 agency 값을 쓴다 (조건 4 정정분)', async () => {
    asUser(admin);
    // platform=126000 / agency=100800 — 서로 다른 값
    const res = await createBillingStatement({
      billedTarget: ORG_TARGET(agency.orgId), year: 2026, month: 4, orderIds: [ORDER_A2A],
    });
    expect(res.success).toBe(true);

    const row = psql(`SELECT i.base_freight || '|' || i.fuel_surcharge || '|' || i.surge_fee || '|' || i.other_charges
                             || '|' || i.line_total || '|' || i.charge_weight_kg || '|' || s.tier
                      FROM public.zen_billing_statement_items i
                      JOIN public.zen_billing_statements s ON s.id = i.statement_id
                      WHERE s.statement_no = '${res.statementNo}'`);
    // agency 값(80000/16000/4000/800)이어야 하고 platform(100000/…)이 아니어야 한다
    expect(row).toBe('80000.00|16000.00|4000.00|800.00|100800.00|5.00|ADMIN_TO_AGENCY');
    // line_total = 4개 합 (불변식)
    expect(80000 + 16000 + 4000 + 800).toBe(100800);

    // 헤더 합계도 agency 값
    expect(psql(`SELECT total_amount::text FROM public.zen_billing_statements WHERE statement_no='${res.statementNo}'`)).toBe('100800.00');
  });

  it('ADMIN_TO_AGENCY: metadata.agency가 없으면 platform 폴백을 쓴다', async () => {
    asUser(admin);
    const res = await createBillingStatement({
      billedTarget: ORG_TARGET(agency.orgId), year: 2026, month: 3, orderIds: [ORDER_PLAT],
    });
    expect(res.success).toBe(true);
    const row = psql(`SELECT i.base_freight || '|' || i.line_total || '|' || i.charge_weight_kg
                      FROM public.zen_billing_statement_items i
                      JOIN public.zen_billing_statements s ON s.id = i.statement_id
                      WHERE s.statement_no = '${res.statementNo}'`);
    // platform 값(100000/126000), 청구중량도 platform의 billingWeightKg=7
    expect(row).toBe('100000.00|126000.00|7.00');
  });

  it('ADMIN_TO_SHIPPER: Admin 발행은 서버가 tier를 도출하고, shipper_id 불일치 오더는 거부한다', async () => {
    asUser(admin);
    // agency_org_id=NULL + shipper_id=청구 대상 → 정상
    const ok = await createBillingStatement({
      billedTarget: ORG_TARGET(shipper.orgId), year: 2026, month: 2, orderIds: [ORDER_A2S],
    });
    expect(ok.success).toBe(true);
    expect(psql(`SELECT tier FROM public.zen_billing_statements WHERE statement_no='${ok.statementNo}'`)).toBe('ADMIN_TO_SHIPPER');

    // shipper_id ≠ 청구 대상(stranger 소속) → 거부
    const ng = await createBillingStatement({
      billedTarget: ORG_TARGET(shipper.orgId), year: 2026, month: 2, orderIds: [ORDER_MISMATCH],
    });
    expect(ng.success).toBe(false);
    expect(ng.error).toBe('정산이 완료되지 않았거나 청구 대상에 속하지 않은 오더가 포함되어 있습니다.');
    // 부분 저장 없음 — 위 실패로 헤더가 추가로 남지 않는다
    expect(psql(`SELECT count(*) FROM public.zen_billing_statements
                 WHERE issuer_org_id='${admin.orgId}' AND period_month = 2`)).toBe('1');
  });

  it('ADHOC 생성은 대리점만 성공하고 비대리점 발행자는 거부한다', async () => {
    asUser(agency);
    const ok = await createBillingStatement({
      billedTarget: { type: 'ADHOC', shipperName: '(주)abc co' }, year: 2026, month: 1, orderIds: [ORDER_ADHOC],
    });
    expect(ok.success).toBe(true);
    expect(psql(`SELECT billed_party_type || '|' || tier FROM public.zen_billing_statements WHERE statement_no='${ok.statementNo}'`))
      .toBe('ADHOC|AGENCY_TO_SHIPPER');

    asUser(admin);
    const ng = await createBillingStatement({
      billedTarget: { type: 'ADHOC', shipperName: 'Anyone' }, year: 2026, month: 1, orderIds: [ORDER_A2S],
    });
    expect(ng.success).toBe(false);
    expect(ng.error).toBe('수기 화주 청구는 대리점 계정만 가능합니다.');
  });

  it('ADMIN_TO_AGENCY: agency_org_id가 청구 대상과 다른 오더는 거부한다 (RPC 자격 검증)', async () => {
    asUser(admin);
    // ORDER_A2S는 agency_org_id=NULL — 대상은 ORG_ISSUER(AGENCY)라 소속 불일치
    const res = await createBillingStatement({
      billedTarget: ORG_TARGET(agency.orgId), year: 2025, month: 11, orderIds: [ORDER_A2S],
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('정산이 완료되지 않았거나 청구 대상에 속하지 않은 오더가 포함되어 있습니다.');
    expect(psql(`SELECT count(*) FROM public.zen_billing_statements WHERE period_year = 2025 AND period_month = 11`)).toBe('0');
  });

  it('통화 가드: 비 KRW 매출 행이 있으면 거부되고 헤더가 남지 않는다', async () => {
    asUser(agency);
    const before = Number(psql(`SELECT count(*) FROM public.zen_billing_statements WHERE issuer_org_id='${agency.orgId}'`));

    const res = await createBillingStatement({
      billedTarget: ORG_TARGET(shipper.orgId), year: 2025, month: 12, orderIds: [ORDER_USD],
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('통화가 KRW가 아닌 매출 항목이 있어 청구서를 만들 수 없습니다. (원가 관리에서 통화를 확인해 주세요)');

    // 헤더 잔존 0 (한 트랜잭션 롤백 — orphan 없음)
    expect(Number(psql(`SELECT count(*) FROM public.zen_billing_statements WHERE issuer_org_id='${agency.orgId}'`))).toBe(before);
    expect(psql(`SELECT count(*) FROM public.zen_billing_statements WHERE period_year = 2025 AND period_month = 12`)).toBe('0');
  });
});

// ───────────────────────── KST 기준 청구 기간 필터 (british-1, 2026-11-21 Jaison)

describe('KST 기준 청구 기간 필터 (british-1)', () => {
  let kstShipper: Identity;
  // KST 달력일 vs UTC가 어긋나는 경계 시각 3건 (모두 2026-11-30 DELIVERED)
  const ORD_K1 = '36000000-0000-4000-8000-000000000021'; // 11/30 23:30 KST = 14:30Z
  const ORD_K2 = '36000000-0000-4000-8000-000000000022'; // 12/01 00:10 KST = 11/30 15:10Z
  const ORD_K3 = '36000000-0000-4000-8000-000000000023'; // 11/30 23:59:59.500 KST = 14:59:59.500Z
  const KST_IDS = [ORD_K1, ORD_K2, ORD_K3];
  const NOV = { dateFrom: '2026-11-01', dateTo: '2026-11-30', dateBasis: 'DELIVERED' as const };
  const DEC = { dateFrom: '2026-12-01', dateTo: '2026-12-31', dateBasis: 'DELIVERED' as const };

  beforeAll(async () => {
    kstShipper = await createTestOrg({
      prefix: `b360_kst_${randomUUID().slice(0, 8)}`, role: 'SHIPPER', orgType: 'INDIVIDUAL',
    });
    psql(`INSERT INTO public.zen_agency_shippers (id, agency_org_id, shipper_org_id, shipper_type, is_active, created_at)
          VALUES (gen_random_uuid(), '${agency.orgId}', '${kstShipper.orgId}', 'INDIVIDUAL', TRUE, now())
          ON CONFLICT DO NOTHING`);
    seedOrder(ORD_K1, { shipperOrg: kstShipper.orgId, agencyOrg: agency.orgId, settled: true, basisAt: '2026-11-30T14:30:00Z' });
    seedOrder(ORD_K2, { shipperOrg: kstShipper.orgId, agencyOrg: agency.orgId, settled: true, basisAt: '2026-11-30T15:10:00Z' });
    seedOrder(ORD_K3, { shipperOrg: kstShipper.orgId, agencyOrg: agency.orgId, settled: true, basisAt: '2026-11-30T14:59:59.500Z' });
  });

  afterAll(async () => {
    const ids = KST_IDS.map((o) => `'${o}'`).join(',');
    psql(`DELETE FROM public.zen_order_costs WHERE order_id IN (${ids});`);
    psql(`DELETE FROM public.zen_order_rate_snapshots WHERE order_id IN (${ids});`);
    psql(`DELETE FROM public.order_status_history WHERE order_id IN (${ids});`);
    psql(`DELETE FROM public.zen_orders WHERE id IN (${ids});`);
    psql(`DELETE FROM public.zen_agency_shippers WHERE shipper_org_id='${kstShipper.orgId}';`);
    try { await kstShipper.cleanup(); } catch { /* best-effort */ }
  });

  async function candidateIds(range: { dateFrom: string; dateTo: string; dateBasis: 'DELIVERED' }) {
    asUser(agency);
    const res = await listBillableOrders({ ...range, billedTarget: ORG_TARGET(kstShipper.orgId) });
    expect(res.success).toBe(true);
    return (res.orders ?? []).map((o) => o.orderId);
  }

  it('① 11/30 23:30 KST(=14:30Z) DELIVERED 오더는 11월 후보에 포함된다', async () => {
    const ids = await candidateIds(NOV);
    expect(ids).toContain(ORD_K1);
    const res = await listBillableOrders({ ...NOV, billedTarget: ORG_TARGET(kstShipper.orgId) });
    const row = (res.orders ?? []).find((o) => o.orderId === ORD_K1);
    expect(row?.basisDate).toBe('2026-11-30'); // KST 달력일 (UTC slice와도 일치하는 경계)
  });

  it('② 12/01 00:10 KST(=11/30 15:10Z) 오더는 11월 후보에서 빠지고 12월에 포함된다', async () => {
    const nov = await candidateIds(NOV);
    expect(nov).not.toContain(ORD_K2);
    const dec = await candidateIds(DEC);
    expect(dec).toContain(ORD_K2);
    const res = await listBillableOrders({ ...DEC, billedTarget: ORG_TARGET(kstShipper.orgId) });
    const row = (res.orders ?? []).find((o) => o.orderId === ORD_K2);
    expect(row?.basisDate).toBe('2026-12-01'); // UTC로는 11-30으로 어긋난다
  });

  it('③ 마지막 날 23:59:59.500 KST 오더는 11월 후보에 포함된다 (소수초 누락 없음)', async () => {
    const ids = await candidateIds(NOV);
    expect(ids).toContain(ORD_K3);
    const res = await listBillableOrders({ ...NOV, billedTarget: ORG_TARGET(kstShipper.orgId) });
    const row = (res.orders ?? []).find((o) => o.orderId === ORD_K3);
    expect(row?.basisDate).toBe('2026-11-30');
  });

  it('KST 월 경계(12-01 00:00+09 = 11-30 15:00Z) 양쪽으로 오더가 갈린다', async () => {
    // ①·③(14:30Z, 14:59:59.5Z)은 경계 전, ②(15:10Z)는 경계 후
    const nov = await candidateIds(NOV);
    expect(nov).toContain(ORD_K1);
    expect(nov).toContain(ORD_K3);
    expect(nov).not.toContain(ORD_K2);
  });
});
