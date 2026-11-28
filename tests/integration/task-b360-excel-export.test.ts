// TASK-B-360 ⒝-2 (Issue #1366) — 청구서 Excel 출력 Route Handler 실DB 검증 (WBS 4.6)
//
// 원칙 (An_17 부록 A §8 + 이슈 DoD):
//  · 구조 단언은 **생성된 .xlsx를 exceljs로 재파싱**해 단언한다 — 소스 문자열/`toContain` 단독 단언 금지
//  · 권한은 **실제 authenticated JWT 세션**으로 검증한다 (service_role 금지)
//  · 합계 불일치 시 파일이 만들어지지 않는 것을 응답으로 검증한다 (부분 파일 금지)
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import ExcelJS from 'exceljs';
import {
  createTestOrg, getServiceClient, getUserClient, psql, assertOrgIdClaim,
} from './helpers/db';

const mockValidateUserAction = vi.hoisted(() => vi.fn());
const mockCreateClient = vi.hoisted(() => vi.fn());
const mockLoggerError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidateUserAction }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/utils/supabase/server', () => ({ createClient: mockCreateClient }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: mockLoggerError },
}));

import {
  createBillingStatement, issueBillingStatement, confirmStatementPayment,
} from '@/app/actions/finance/billing-statements';
import { GET } from '@/app/api/finance/statements/[id]/export/route';

type Identity = Awaited<ReturnType<typeof createTestOrg>>;

let agency: Identity;
let otherAgency: Identity;
let shipper: Identity;
let admin: Identity;
let stranger: Identity;
let supabase: ReturnType<typeof getServiceClient>;

// describe별 전용 오더 — UNIQUE(order_id, tier)가 전역이라 공유하면 선행 케이스가 소모시킨다
const ORDER_A2A = '36100000-0000-4000-8000-000000000001'; // Admin → 대리점 (ADMIN_TO_AGENCY, 화주명 열)
const ORDER_SHIP = '36100000-0000-4000-8000-000000000002'; // 대리점 → 화주 (AGENCY_TO_SHIPPER, CLOSED)
const ORDER_DRAFT = '36100000-0000-4000-8000-000000000003'; // DRAFT (청구받은 화주 404)
const ORDER_ADH = '36100000-0000-4000-8000-000000000004'; // ADHOC + 수식 주입 시도
const ORDER_DEC1 = '36100000-0000-4000-8000-000000000005'; // 소수 금액·중량 (10.10+20.20, 0.10kg)
const ORDER_DEC2 = '36100000-0000-4000-8000-000000000006'; // 소수 금액·중량 (10.10+20.20, 0.20kg)
const ORDER_PAID = '36100000-0000-4000-8000-000000000007'; // 기본 입금일 KST 검증용
const ALL_ORDERS = [ORDER_A2A, ORDER_SHIP, ORDER_DRAFT, ORDER_ADH, ORDER_DEC1, ORDER_DEC2, ORDER_PAID];

const SHEET_SUMMARY = '청구서';
const SHEET_DETAIL = '오더별 상세';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const INJECTION_NAME = '=HYPERLINK("http://evil.example","클릭")';

let stmtA2A: string;   // ISSUED · ADMIN_TO_AGENCY
let stmtShip: string;  // CLOSED · AGENCY_TO_SHIPPER
let stmtDraft: string; // DRAFT · AGENCY_TO_SHIPPER
let stmtAdh: string;   // DRAFT · ADHOC (주입 시도)
let stmtDec: string;   // DRAFT · 소수 금액 (합 60.60)
let stmtPaid: string;  // ISSUED · 기본 입금일 KST 검증

function asUser(identity: Identity) {
  mockValidateUserAction.mockResolvedValue({
    supabase: getUserClient(identity.jwt),
    user: { id: identity.userId },
    profile: { id: identity.userId, role: identity.role, org_id: identity.orgId, status: 'ACTIVE' },
  });
}

function seedOrder(id: string, opts: {
  shipperOrg: string; agencyOrg?: string | null; shipperName?: string;
  recipientName?: string; country?: string; tracking?: string; basisAt?: string;
  /** 소수 금액 fixture — 'base'(줄당 10.10) | 'fuel'(줄당 20.20). 두 줄 합 30.30이 float에선 30.299999999999997 */
  decimal?: 'base' | 'fuel';
  /** 청구중량 (metadata.platform.billingWeightKg) */
  weight?: number;
}) {
  psql(`
    INSERT INTO public.zen_orders
      (id, order_no, cargo_details, transport_mode, status, shipper_id, agency_org_id,
       shipper_name, recipient_name, recipient_country_code,
       cost_settlement_status, cost_settled_at, cost_settled_by, created_at)
    VALUES ('${id}', 'ZEN-EXP-${id.slice(-4)}', '{}'::jsonb, 'UPS', 'DELIVERED',
            '${opts.shipperOrg}', ${opts.agencyOrg ? `'${opts.agencyOrg}'` : 'NULL'},
            ${opts.shipperName ? `'${opts.shipperName}'` : 'NULL'},
            ${opts.recipientName ? `'${opts.recipientName}'` : 'NULL'},
            ${opts.country ? `'${opts.country}'` : 'NULL'},
            'SETTLED', now(), '${admin.userId}', now())
    ON CONFLICT (id) DO UPDATE SET
      recipient_name = EXCLUDED.recipient_name,
      recipient_country_code = EXCLUDED.recipient_country_code,
      shipper_id = EXCLUDED.shipper_id, agency_org_id = EXCLUDED.agency_org_id,
      shipper_name = EXCLUDED.shipper_name, cost_settlement_status = EXCLUDED.cost_settlement_status;
    INSERT INTO public.order_status_history (order_id, prev_status, next_status, changed_by, created_at)
    VALUES ('${id}', 'IN_TRANSIT', 'DELIVERED', '${admin.userId}', '${opts.basisAt ?? '2026-11-10T10:00:00Z'}')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.zen_order_rate_snapshots
      (id, order_id, applied_unit_price, applied_currency, applied_rule, metadata, snapshot_at)
    VALUES (gen_random_uuid(), '${id}', 1000, 'KRW', 'TEST',
            ('{"platform":{"billingWeightKg":${opts.weight ?? 5},"chargeableWeightKg":4.78,"baseSellingPrice":100000,"fuelSurchargeSellingAmount":20000,"surgeFeeSellingAmount":5000,"otherChargesSellingTotal":1000,"currency":"KRW"},
              "agency":{"baseSellingPrice":80000,"fuelSurchargeSellingAmount":16000,"surgeFeeSellingAmount":4000,"otherChargesSellingTotal":800,"agencyCostPrice":100800}}')::jsonb, now())
    ON CONFLICT (order_id) DO UPDATE SET metadata = EXCLUDED.metadata;
    INSERT INTO public.zen_order_costs (id, order_id, cost_type, unit_price, quantity, currency, is_revenue, created_at)
    VALUES (gen_random_uuid(), '${id}', 'BASE_FREIGHT', ${opts.decimal === 'base' ? '10.10' : opts.decimal ? '0' : '100000'}, 1, 'KRW', true, now()),
          (gen_random_uuid(), '${id}', 'FUEL_SURCHARGE', ${opts.decimal === 'fuel' ? '20.20' : opts.decimal ? '0' : '20000'}, 1, 'KRW', true, now()),
          (gen_random_uuid(), '${id}', 'SURGE_FEE', ${opts.decimal ? '0' : '5000'}, 1, 'KRW', true, now()),
          (gen_random_uuid(), '${id}', 'OTHER_CHARGE', ${opts.decimal ? '0' : '1000'}, 1, 'KRW', true, now())
    ON CONFLICT DO NOTHING;
    ALTER TABLE public.zen_ups_settlement_runs DISABLE TRIGGER USER;
    DELETE FROM public.zen_ups_settlement_runs WHERE order_id = '${id}';
    ALTER TABLE public.zen_ups_settlement_runs ENABLE TRIGGER USER;
    WITH r AS (
      INSERT INTO public.zen_ups_settlement_runs (order_id, version, charge_weight_kg, settled_at, settled_by)
      VALUES ('${id}', 1, ${opts.weight ?? 5}, now(), '${admin.userId}')
      RETURNING id
    )
    INSERT INTO public.zen_ups_settlement_run_amounts
      (run_id, tier, base_freight, fuel_surcharge, surge_fee, other_charges,
       freight_adjustment, settlement_charges_total, line_total)
    SELECT r.id, v.tier, v.b, v.f, v.s, v.o, 0, 0, v.b + v.f + v.s + v.o
    FROM r, (VALUES
      ('ADMIN_TO_AGENCY',
        ${opts.decimal === 'base' ? '10.10' : opts.decimal ? '0' : '80000'}::numeric,
        ${opts.decimal === 'fuel' ? '20.20' : opts.decimal ? '0' : '16000'}::numeric,
        ${opts.decimal ? '0' : '4000'}::numeric,
        ${opts.decimal ? '0' : '800'}::numeric),
      ('SHIPPER',
        ${opts.decimal === 'base' ? '10.10' : opts.decimal ? '0' : '100000'}::numeric,
        ${opts.decimal === 'fuel' ? '20.20' : opts.decimal ? '0' : '20000'}::numeric,
        ${opts.decimal ? '0' : '5000'}::numeric,
        ${opts.decimal ? '0' : '1000'}::numeric)
    ) AS v(tier, b, f, s, o);
  `);
  if (opts.tracking) {
    psql(`
      INSERT INTO public.zen_order_packages (id, order_id, packing_unit)
      VALUES (gen_random_uuid(), '${id}', 'BOX') ON CONFLICT DO NOTHING;
      INSERT INTO public.zen_ups_labels
        (id, order_id, package_id, reference_no, tracking_number, label_format, storage_path, is_voided)
      SELECT gen_random_uuid(), '${id}', p.id, 'REF-EXP-${id.slice(-4)}', '${opts.tracking}', 'PDF', 'test/label.pdf', false
      FROM public.zen_order_packages p WHERE p.order_id = '${id}'
      ON CONFLICT DO NOTHING;
    `);
  }
}

/**
 * `createTestOrg`는 `auth.users`를 id·email·raw_user_meta_data만 넣어 INSERT 한다.
 * 이 상태로는 GoTrue `GET /user`(세션 검증)가 `instance_id`/`aud`/`confirmation_token` NULL을
 * 스캔하지 못해 403/500이 난다(범위 밖 헬퍼 결함 — [발견 이슈]에 등록).
 * 본 테스트는 **실제 authenticated 세션** 검증이 필수라, 해당 행만 GoTrue가 읽을 수 있게 채운다.
 */
function makeGoTrueVisible(identity: Identity) {
  psql(`
    UPDATE auth.users SET
      instance_id = '00000000-0000-0000-0000-000000000000',
      aud = 'authenticated', role = 'authenticated',
      encrypted_password = COALESCE(encrypted_password, ''),
      confirmation_token = '', recovery_token = '', email_change_token_new = '', email_change = '',
      phone_change_token = '', phone_change = '', email_change_token_current = '', reauthentication_token = '',
      email_change_confirm_status = 0,
      created_at = COALESCE(created_at, now()), updated_at = now(),
      email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = '${identity.userId}';
  `);
}

/** JWT로 **실제 세션**을 만든다 — setSession이 GoTrue `/user`로 토큰을 검증한다(세션 저장 없이) */
async function sessionClient(identity: Identity) {
  const client = getUserClient(identity.jwt);
  const { error } = await client.auth.setSession({
    access_token: identity.jwt,
    refresh_token: 'refresh-not-used-with-non-expired-jwt',
  });
  expect(error, `setSession 실패: ${error?.message}`).toBeNull();
  return client;
}

/** Route Handler를 **실제 authenticated 세션**으로 호출한다 (service_role 미사용) */
async function httpExport(id: string, identity: Identity | null): Promise<Response> {
  if (identity) {
    mockCreateClient.mockResolvedValue(await sessionClient(identity));
  } else {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    });
  }
  return GET(new Request(`http://localhost/api/finance/statements/${id}/export`), {
    params: Promise.resolve({ id }),
  });
}

async function parseWorkbook(res: Response): Promise<ExcelJS.Workbook> {
  const buffer = Buffer.from(await res.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  // @types/node 버전 차이로 exceljs의 Buffer 선언과 제네릭이 어긋난다 — 런타임은 동일한 Uint8Array
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb;
}

function sheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const ws = wb.getWorksheet(name);
  expect(ws, `시트 "${name}" 없음`).toBeTruthy();
  return ws!;
}

function text(ws: ExcelJS.Worksheet, address: string): string {
  const v = ws.getCell(address).value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'text' in (v as any)) return String((v as any).text);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

/** 이전 실행 잔여물 purge — 고정 오더 ID를 점유한 ISSUED/CLOSED 청구서가 `order_already_inclusive`로 조용히 실패하는 것을 차단 (멱등) */
function purgeLeftover() {
  const ids = ALL_ORDERS.map((o) => `'${o}'`).join(',');
  // ISSUED/CLOSED 헤더는 상태 트리거로 삭제가 차단된다 — purge 중에만 비활성화
  psql(`ALTER TABLE public.zen_billing_statements DISABLE TRIGGER trg_billing_statement_before_delete;`);
  psql(`DELETE FROM public.zen_billing_statements
        WHERE id IN (SELECT statement_id FROM public.zen_billing_statement_items WHERE order_id IN (${ids}))
           OR issuer_org_id IN (SELECT id FROM public.zen_organizations WHERE name LIKE 'excel360_%');`);
  psql(`ALTER TABLE public.zen_billing_statements ENABLE TRIGGER trg_billing_statement_before_delete;`);
  psql(`DELETE FROM public.zen_ups_labels WHERE order_id IN (${ids});`);
  psql(`DELETE FROM public.zen_order_packages WHERE order_id IN (${ids});`);
  psql(`DELETE FROM public.zen_order_costs WHERE order_id IN (${ids});`);
  psql(`ALTER TABLE public.zen_ups_settlement_runs DISABLE TRIGGER USER;`);
  psql(`ALTER TABLE public.zen_ups_settlement_run_amounts DISABLE TRIGGER USER;`);
  psql(`ALTER TABLE public.zen_ups_settlement_run_charges DISABLE TRIGGER USER;`);
  psql(`DELETE FROM public.zen_ups_settlement_runs WHERE order_id IN (${ids});`);
  psql(`ALTER TABLE public.zen_ups_settlement_runs ENABLE TRIGGER USER;`);
  psql(`ALTER TABLE public.zen_ups_settlement_run_amounts ENABLE TRIGGER USER;`);
  psql(`ALTER TABLE public.zen_ups_settlement_run_charges ENABLE TRIGGER USER;`);
  psql(`DELETE FROM public.zen_order_rate_snapshots WHERE order_id IN (${ids});`);
  psql(`DELETE FROM public.order_status_history WHERE order_id IN (${ids});`);
  psql(`DELETE FROM public.zen_orders WHERE id IN (${ids});`);
  psql(`DELETE FROM public.zen_agency_shippers
        WHERE agency_org_id IN (SELECT id FROM public.zen_organizations WHERE name LIKE 'excel360_%')
           OR shipper_org_id IN (SELECT id FROM public.zen_organizations WHERE name LIKE 'excel360_%');`);
  psql(`DELETE FROM public.order_status_history WHERE changed_by IN (SELECT id FROM auth.users WHERE email LIKE 'excel360_%');`);
  psql(`DELETE FROM public.zen_profiles WHERE email LIKE 'excel360_%';`);
  psql(`DELETE FROM auth.users WHERE email LIKE 'excel360_%';`);
  psql(`DELETE FROM public.zen_organizations WHERE name LIKE 'excel360_%';`);
}

beforeAll(async () => {
  purgeLeftover();
  supabase = getServiceClient();
  const run = randomUUID().slice(0, 8);
  agency = await createTestOrg({ prefix: `excel360_agency_${run}`, role: 'AGENCY', orgType: 'AGENCY' });
  otherAgency = await createTestOrg({ prefix: `excel360_other_${run}`, role: 'AGENCY', orgType: 'AGENCY' });
  shipper = await createTestOrg({ prefix: `excel360_shipper_${run}`, role: 'SHIPPER', orgType: 'INDIVIDUAL' });
  admin = await createTestOrg({ prefix: `excel360_admin_${run}`, role: 'ADMIN', orgType: 'PLATFORM' });
  stranger = await createTestOrg({ prefix: `excel360_stranger_${run}`, role: 'SHIPPER', orgType: 'INDIVIDUAL' });
  assertOrgIdClaim(agency.jwt, agency.orgId);
  for (const identity of [agency, otherAgency, shipper, admin, stranger]) makeGoTrueVisible(identity);

  psql(`
    INSERT INTO public.zen_agency_shippers (id, agency_org_id, shipper_org_id, shipper_type, is_active, created_at)
    VALUES (gen_random_uuid(), '${agency.orgId}', '${shipper.orgId}', 'INDIVIDUAL', TRUE, now())
    ON CONFLICT DO NOTHING;
  `);
  seedOrder(ORDER_A2A, {
    shipperOrg: shipper.orgId, agencyOrg: agency.orgId,
    recipientName: '김수하인', country: 'US', tracking: '1Z999AA10123456784', basisAt: '2026-11-25T14:30:00Z',
  });
  seedOrder(ORDER_SHIP, {
    shipperOrg: shipper.orgId, agencyOrg: agency.orgId,
    recipientName: '朴수하인', country: 'JP', tracking: '1Z999AA10123456785', basisAt: '2026-11-26T02:10:00Z',
  });
  seedOrder(ORDER_DRAFT, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, recipientName: '초안수하인', country: 'KR' });
  seedOrder(ORDER_ADH, {
    shipperOrg: agency.orgId, agencyOrg: null, shipperName: INJECTION_NAME,
    recipientName: '수기수하인', country: 'CN',
  });
  // 소수 금액·중량 fixture — 줄당 10.10 / 20.20, 두 줄 합 30.30(float에선 30.299999999999997) · 중량 0.10+0.20=0.30
  seedOrder(ORDER_DEC1, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, decimal: 'base', weight: 0.1, recipientName: '소수수하인1', country: 'US' });
  seedOrder(ORDER_DEC2, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, decimal: 'fuel', weight: 0.2, recipientName: '소수수하인2', country: 'JP' });
  seedOrder(ORDER_PAID, { shipperOrg: shipper.orgId, agencyOrg: agency.orgId, recipientName: '입금수하인', country: 'KR' });

  // ① Admin → 대리점 (ISSUED) — 화주명 열 있는 tier
  asUser(admin);
  const a2a = await createBillingStatement({
    billedTarget: { type: 'ORG', orgId: agency.orgId }, year: 2026, month: 11, orderIds: [ORDER_A2A],
  });
  expect(a2a.success, a2a.error).toBe(true);
  stmtA2A = a2a.statementId!;
  expect((await issueBillingStatement(stmtA2A)).success, 'issue A2A').toBe(true);

  // ② 대리점 → 화주 (CLOSED) — 읽기 전용 청구받은 경로
  asUser(agency);
  const ship = await createBillingStatement({
    billedTarget: { type: 'ORG', orgId: shipper.orgId }, year: 2026, month: 11, orderIds: [ORDER_SHIP],
  });
  expect(ship.success, ship.error).toBe(true);
  stmtShip = ship.statementId!;
  expect((await issueBillingStatement(stmtShip)).success, 'issue SHIP').toBe(true);
  const total = Number(psql(`SELECT total_amount FROM public.zen_billing_statements WHERE id='${stmtShip}'`));
  expect((await confirmStatementPayment(stmtShip, { amount: total, paidAt: '2026-12-05' })).success, 'confirm').toBe(true);

  // ③ DRAFT — 청구받은 화주에게 미노출(404)
  const draft = await createBillingStatement({
    billedTarget: { type: 'ORG', orgId: shipper.orgId }, year: 2026, month: 10, orderIds: [ORDER_DRAFT],
  });
  expect(draft.success, draft.error).toBe(true);
  stmtDraft = draft.statementId!;

  // ④ ADHOC + 수식 주입 시도 (billed_name에 `=HYPERLINK(...)`)
  const adh = await createBillingStatement({
    billedTarget: { type: 'ADHOC', shipperName: INJECTION_NAME },
    year: 2026, month: 9, orderIds: [ORDER_ADH],
  });
  expect(adh.success, adh.error).toBe(true);
  stmtAdh = adh.statementId!;

  // ⑤ 소수 금액 DRAFT — 부동소수 합산 결함 재현용 (합 60.60, 중량 0.30)
  const dec = await createBillingStatement({
    billedTarget: { type: 'ORG', orgId: shipper.orgId }, year: 2026, month: 8, orderIds: [ORDER_DEC1, ORDER_DEC2],
  });
  expect(dec.success, dec.error).toBe(true);
  stmtDec = dec.statementId!;

  // ⑥ 입금일 KST 검증용 (발행만 해 두고 테스트에서 입금확인)
  const paid = await createBillingStatement({
    billedTarget: { type: 'ORG', orgId: shipper.orgId }, year: 2026, month: 7, orderIds: [ORDER_PAID],
  });
  expect(paid.success, paid.error).toBe(true);
  stmtPaid = paid.statementId!;
  expect((await issueBillingStatement(stmtPaid)).success).toBe(true);
});

afterAll(async () => {
  try {
    // ISSUED/CLOSED 헤더는 상태 트리거로 삭제가 차단된다 — 정리 중에만 비활성화
    psql(`ALTER TABLE public.zen_billing_statements DISABLE TRIGGER trg_billing_statement_before_delete;`);
    psql(`DELETE FROM public.zen_billing_statements
          WHERE issuer_org_id IN ('${agency.orgId}','${otherAgency.orgId}');`);
    psql(`ALTER TABLE public.zen_billing_statements ENABLE TRIGGER trg_billing_statement_before_delete;`);
    const ids = ALL_ORDERS.map((o) => `'${o}'`).join(',');
    psql(`DELETE FROM public.zen_ups_labels WHERE order_id IN (${ids});`);
    psql(`DELETE FROM public.zen_order_packages WHERE order_id IN (${ids});`);
    psql(`DELETE FROM public.zen_order_costs WHERE order_id IN (${ids});`);
    psql(`DELETE FROM public.zen_order_rate_snapshots WHERE order_id IN (${ids});`);
    psql(`DELETE FROM public.order_status_history WHERE order_id IN (${ids});`);
    psql(`DELETE FROM public.zen_orders WHERE id IN (${ids});`);
    psql(`DELETE FROM public.zen_agency_shippers WHERE agency_org_id IN ('${agency.orgId}','${otherAgency.orgId}');`);
  } catch { /* best-effort */ }
  try { purgeLeftover(); } catch { /* best-effort */ }
  try {
    await Promise.all([agency, otherAgency, shipper, admin, stranger]
      .filter((i): i is Identity => !!i)
      .map((i) => i.cleanup()));
  } catch { /* best-effort */ }
});

// ───────────────────────────────────────────── 파싱 헬퍼

/** 상세 시트 3행(열 머리글)을 파일에서 읽어 라벨·열 문자를 얻는다 (구현 배열에 의존하지 않음) */
function detailHeader(ws: ExcelJS.Worksheet): { labels: string[]; letters: string[] } {
  const labels: string[] = [];
  const letters: string[] = [];
  for (let i = 1; i <= 30; i++) {
    const letter = String.fromCharCode(64 + i);
    const v = ws.getCell(`${letter}3`).value;
    if (v === null || v === undefined || v === '') break;
    labels.push(String(v));
    letters.push(letter);
  }
  return { labels, letters };
}

function addrOf(ws: ExcelJS.Worksheet, key: string, row: number): string {
  const { labels, letters } = detailHeader(ws);
  const idx = labels.indexOf(key);
  expect(idx, `상세 시트에 열 "${key}" 없음`).toBeGreaterThanOrEqual(0);
  return `${letters[idx]}${row}`;
}

function statementNoOf(id: string): string {
  return String(psql(`SELECT statement_no FROM public.zen_billing_statements WHERE id='${id}'`));
}

const HEADERS_WITH_SHIPPER = ['No', '오더번호', '운송장번호', '기준일', '화주명', '수하인', '도착국가', '청구중량(kg)', '기본운임', '유류할증료', '할증료', '기타', '부가운임 항목', '부가운임', '운임 조정분', '합계'];
const HEADERS_PLAIN = ['No', '오더번호', '운송장번호', '기준일', '수하인', '도착국가', '청구중량(kg)', '기본운임', '유류할증료', '할증료', '기타', '부가운임 항목', '부가운임', '운임 조정분', '합계'];

// ───────────────────────────────────────────── §8-1 인쇄 설정 (재파싱 단언)

describe('인쇄 설정 (부록A §8-1 — 생성 파일을 exceljs로 재파싱)', () => {
  it('시트1 A4 세로 · 시트2 A4 가로, 두 시트 모두 paperSize=9', async () => {
    const res = await httpExport(stmtA2A, admin);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(XLSX_TYPE);
    expect(res.headers.get('Cache-Control')).toContain('no-store');
    const wb = await parseWorkbook(res);

    const s1 = sheet(wb, SHEET_SUMMARY);
    expect(s1.pageSetup.paperSize).toBe(9);
    expect(s1.pageSetup.orientation).toBe('portrait');
    const s2 = sheet(wb, SHEET_DETAIL);
    expect(s2.pageSetup.paperSize).toBe(9);
    expect(s2.pageSetup.orientation).toBe('landscape');
  });

  it('배율(fitToWidth/fitToHeight)·좁은 여백·가운데 맞춤·눈금선', async () => {
    const wb = await parseWorkbook(await httpExport(stmtA2A, admin));
    const s1 = sheet(wb, SHEET_SUMMARY);
    const s2 = sheet(wb, SHEET_DETAIL);

    expect(s1.pageSetup.fitToPage).toBe(true);
    expect(s1.pageSetup.fitToWidth).toBe(1);
    expect(s1.pageSetup.fitToHeight).toBe(1);       // 요약은 1페이지
    expect(s2.pageSetup.fitToPage).toBe(true);
    expect(s2.pageSetup.fitToWidth).toBe(1);
    expect(s2.pageSetup.fitToHeight).toBe(0);       // 상세는 세로 자동

    const margins = { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 };
    expect(s1.pageSetup.margins).toMatchObject(margins);
    expect(s2.pageSetup.margins).toMatchObject(margins);
    expect(s1.pageSetup.horizontalCentered).toBe(true);
    expect(s2.pageSetup.horizontalCentered).toBe(true);

    // 눈금선: 시트1 화면·인쇄 모두 숨김 / 시트2 화면 표시·인쇄 숨김
    expect(s1.pageSetup.showGridLines).toBe(false);
    expect(s1.views[0].showGridLines).toBe(false);
    expect(s2.pageSetup.showGridLines).toBe(false);
    expect(s2.views[0].showGridLines).toBe(true);
    // 틀 고정: 시트2 3행까지
    const frozen = s2.views[0] as ExcelJS.WorksheetViewFrozen;
    expect(frozen.state).toBe('frozen');
    expect(frozen.ySplit).toBe(3);
  });

  it('인쇄 제목행(상세 3행 반복)·인쇄 영역·머리글·바닥글', async () => {
    const no = statementNoOf(stmtA2A);
    const wb = await parseWorkbook(await httpExport(stmtA2A, admin));
    const s1 = sheet(wb, SHEET_SUMMARY);
    const s2 = sheet(wb, SHEET_DETAIL);
    const lastRow = Number((s2.pageSetup.printArea ?? '').match(/(\d+)$/)?.[1] ?? 0);

    expect(s2.pageSetup.printTitlesRow).toBe('3:3');
    expect(s1.pageSetup.printTitlesRow).toBeFalsy();          // 요약은 제목행 반복 없음
    expect(s1.pageSetup.printArea).toBe('A1:F25');            // 요약 6열 고정 (부가운임 행 +1)
    expect(s2.pageSetup.printArea).toBe(`A1:P${lastRow}`);    // tier별 열 문자 = 배열에서 계산 (ADMIN_TO_AGENCY 16열=P)
    expect(lastRow).toBeGreaterThan(3);

    expect(s1.headerFooter?.oddHeader).toBe(`&R${no}`);
    expect(s1.headerFooter?.oddFooter).toBe('&C페이지 &P / &N');
    expect(s2.headerFooter?.oddHeader).toBe(`&L${no}&R오더별 상세`);
    expect(s2.headerFooter?.oddFooter).toBe('&C페이지 &P / &N');
  });
});

// ───────────────────────────────────────────── §8-2 값 단언

describe('값 단언 (부록A §8-2)', () => {
  it('오더 행 수 = 항목 수, 합계 행 = 헤더 total_amount, 오더 행은 숫자 셀', async () => {
    const res = await httpExport(stmtShip, shipper);
    expect(res.status).toBe(200);
    const wb = await parseWorkbook(res);
    const s2 = sheet(wb, SHEET_DETAIL);
    const total = Number(psql(`SELECT total_amount FROM public.zen_billing_statements WHERE id='${stmtShip}'`));

    // 3행 머리글 / 4행 오더 / 5행 합계 (항목 1건)
    expect(detailHeader(s2).labels).toEqual(HEADERS_PLAIN);
    expect(text(s2, addrOf(s2, 'No', 4))).toBe('1');
    expect(typeof s2.getCell(addrOf(s2, 'No', 4)).value).toBe('number');   // 순번도 숫자 셀
    expect(text(s2, addrOf(s2, '오더번호', 4))).toBe('ZEN-EXP-0002');
    expect(text(s2, addrOf(s2, '운송장번호', 4))).toBe('1Z999AA10123456785');
    expect(s2.getCell(addrOf(s2, '기준일', 4)).value).toBeInstanceOf(Date); // 날짜 값(문자열 아님)
    expect(text(s2, addrOf(s2, '기준일', 4))).toBe('2026-11-26');          // KST 달력일
    expect(s2.getCell(addrOf(s2, '기준일', 4)).numFmt).toBe('yyyy-mm-dd');
    expect(text(s2, addrOf(s2, '수하인', 4))).toBe('朴수하인');
    expect(text(s2, addrOf(s2, '도착국가', 4))).toBe('JP');

    for (const key of ['청구중량(kg)', '기본운임', '유류할증료', '할증료', '기타', '부가운임', '합계']) {
      const v = s2.getCell(addrOf(s2, key, 4)).value;
      expect(typeof v, `${key} 셀은 숫자여야 한다`).toBe('number');
    }
    expect(s2.getCell(addrOf(s2, '합계', 5)).value).toBe(total);           // 합계 행 = 헤더 총액
    expect(text(s2, addrOf(s2, 'No', 5))).toBe('합계');
    expect(s2.getCell(addrOf(s2, '합계', 5)).font.bold).toBe(true);
    expect(s2.rowCount).toBe(5);
  });

  it('상세 4개 금액 열 합 = 요약의 4개 금액 (재계산 없이 저장값 대조)', async () => {
    const wb = await parseWorkbook(await httpExport(stmtA2A, admin));
    const s1 = sheet(wb, SHEET_SUMMARY);
    const s2 = sheet(wb, SHEET_DETAIL);

    const sumOf = (key: string) => {
      let sum = 0;
      for (let row = 4; row < s2.rowCount; row++) {
        const v = s2.getCell(addrOf(s2, key, row)).value;
        if (typeof v === 'number') sum += v;
      }
      return sum;
    };
    // ADMIN_TO_AGENCY 스냅샷: agency 값(80000/16000/4000/800) 합 100800
    expect(sumOf('기본운임')).toBe(80000);
    expect(sumOf('유류할증료')).toBe(16000);
    expect(sumOf('할증료')).toBe(4000);
    expect(sumOf('기타')).toBe(800);
    expect(sumOf('합계')).toBe(100800);

    // 요약 금액(15~19행 B열) = 상세 열 합 — 부가운임 19행, 조정 0원 비표시 → 공급가액 21행
    expect(s1.getCell('B15').value).toBe(sumOf('기본운임'));
    expect(s1.getCell('B16').value).toBe(sumOf('유류할증료'));
    expect(s1.getCell('B17').value).toBe(sumOf('할증료'));
    expect(s1.getCell('B18').value).toBe(sumOf('기타'));
    expect(s1.getCell('B19').value).toBe(sumOf('부가운임')); // 부가운임(항목 합)
    expect(s1.getCell('B21').value).toBe(sumOf('합계')); // 공급가액 합계
    expect(s1.getCell('B21').font.size).toBe(14);
    expect(text(s1, 'A21')).toBe('공급가액 합계');
    expect(text(s1, 'A22')).toContain('부가가치세 별도');
    expect(text(s1, 'A24')).toContain('오더 건수 1건');
    expect(text(s1, 'A25')).toBe('상태');
  });
});

// ───────────────────────────────────────────── §8-3 권한

describe('권한 (부록A §8-3 — 실제 authenticated 세션, service_role 금지)', () => {
  it('발행자·Admin 감독 · 청구받은 화주(ISSUED/CLOSED)는 성공', async () => {
    expect((await httpExport(stmtA2A, agency)).status).toBe(200);   // 발행자(대리점)
    expect((await httpExport(stmtA2A, admin)).status).toBe(200);    // Admin 감독
    expect((await httpExport(stmtShip, shipper)).status).toBe(200); // 청구받은 화주 (CLOSED)
    expect((await httpExport(stmtShip, agency)).status).toBe(200);  // 발행자
  });

  it('타 대리점은 404 — 미존재 청구서와 **동일한 응답** (존재 비노출)', async () => {
    const visible = await httpExport(stmtDraft, otherAgency);
    const missing = await httpExport('00000000-0000-4000-8000-0000000000ff', otherAgency);
    expect(visible.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await visible.text()).toBe(await missing.text());
  });

  it('DRAFT를 청구받은 화주는 404 (ISSUED/CLOSED만 조회 가능)', async () => {
    const draft = await httpExport(stmtDraft, shipper);
    const missing = await httpExport('00000000-0000-4000-8000-0000000000ff', shipper);
    expect(draft.status).toBe(404);
    expect(await draft.text()).toBe(await missing.text());
  });

  it('비소속 화주는 404, 미인증은 401', async () => {
    expect((await httpExport(stmtShip, stranger)).status).toBe(404);
    expect((await httpExport(stmtShip, null)).status).toBe(401);
  });
});

// ───────────────────────────────────────────── §8-4 수식 주입 방지

describe('수식 주입 방지 (부록A §8-4)', () => {
  it('청구 대상명이 `=HYPERLINK(...)`여도 문자열 셀로 기록된다', async () => {
    const res = await httpExport(stmtAdh, agency);
    expect(res.status).toBe(200);
    const wb = await parseWorkbook(res);
    const s1 = sheet(wb, SHEET_SUMMARY);

    const cell = s1.getCell('E7'); // 공급받는자 상호
    expect(typeof cell.value).toBe('string');
    expect(cell.value).toBe(INJECTION_NAME);
    expect(cell.formula).toBeUndefined(); // 수식으로 해석되지 않았다

    // 상세 시트 제목·금액 셀에도 수식이 없다
    const s2 = sheet(wb, SHEET_DETAIL);
    expect(typeof s2.getCell('A1').value).toBe('string');
    expect(s2.getCell(addrOf(s2, '합계', 4)).formula).toBeUndefined();
  });
});

// ───────────────────────────────────────────── §8-5 tier별 구성

describe('tier별 상세 구성 (부록A §4·§8-5)', () => {
  it('ADMIN_TO_AGENCY는 화주명 열(12개 비-No), 나머지는 없음(11개 비-No)', async () => {
    const withShipper = sheet(await parseWorkbook(await httpExport(stmtA2A, admin)), SHEET_DETAIL);
    const plain = sheet(await parseWorkbook(await httpExport(stmtShip, shipper)), SHEET_DETAIL);

    const a2a = detailHeader(withShipper);
    const ship = detailHeader(plain);
    expect(a2a.labels).toEqual(HEADERS_WITH_SHIPPER);   // 16열 (No 포함) = 지정 15열 + No
    expect(ship.labels).toEqual(HEADERS_PLAIN);         // 15열 (No 포함) = 지정 14열 + No
    expect(a2a.labels.length - 1).toBe(15);             // 부록A "총 15열" (No 제외 계수 — B-402 부가운임 3열 포함)
    expect(ship.labels.length - 1).toBe(14);            // 부록A "열 14개" (No 제외 계수)

    // 열 문자는 열 정의 배열 길이에서 계산 (하드코딩 없음)
    expect(withShipper.pageSetup.printArea).toMatch(new RegExp(`^A1:P\\d+$`));  // 16열 → P
    expect(plain.pageSetup.printArea).toMatch(new RegExp(`^A1:O\\d+$`));        // 15열 → O

    // 화주명 값은 오더의 화주 조직명
    expect(text(withShipper, addrOf(withShipper, '화주명', 4))).toMatch(/^excel360_shipper_/);
  });

  it('금액 열은 합계 열만 굵게, 나머지는 정렬·형식이 열 정의와 일치한다', async () => {
    const s2 = sheet(await parseWorkbook(await httpExport(stmtA2A, admin)), SHEET_DETAIL);
    expect(s2.getCell(addrOf(s2, '합계', 4)).font.bold).toBe(true);
    expect(s2.getCell(addrOf(s2, '기본운임', 4)).font.bold).toBeFalsy();
    expect(s2.getCell(addrOf(s2, '기본운임', 4)).alignment.horizontal).toBe('right');
    expect(s2.getCell(addrOf(s2, '기본운임', 4)).numFmt).toBe('#,##0.00;-#,##0.00');
    expect(s2.getCell(addrOf(s2, 'No', 4)).alignment.horizontal).toBe('center');
    expect(s2.getCell(addrOf(s2, '오더번호', 4)).alignment.horizontal).toBe('left');
    // 머리글 회색 배경(§6)
    expect(s2.getCell(addrOf(s2, '오더번호', 3)).fill).toMatchObject({
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7ECF3' },
    });
  });
});

// ───────────────────────────────────────────── §8-6 합계 불일치

describe('합계 불일치 (부록A §1-1·§8-6)', () => {
  it('항목 합 ≠ 헤더 합이면 파일을 만들지 않고 500을 반환한다', async () => {
    // 항목 스냅샷은 발행 후 잠긴다(`items_locked_after_issue`) — DRAFT 청구서로 조작한다
    const before = Number(psql(`SELECT line_total FROM public.zen_billing_statement_items WHERE statement_id='${stmtDraft}'`));
    const updated = psql(`UPDATE public.zen_billing_statement_items SET line_total = ${before} + 1
                          WHERE statement_id='${stmtDraft}' RETURNING line_total::text`);
    expect(updated, '항목 조작(DRAFT)이 적용되어야 한다').toBe(`${before + 1}.00`);

    const res = await httpExport(stmtDraft, agency);
    expect(res.status).toBe(500);
    const body = Buffer.from(await res.arrayBuffer());
    expect(res.headers.get('Content-Type')).not.toContain('spreadsheetml'); // xlsx가 아니다
    expect(body.length).toBeLessThan(64);                                    // 부분 파일 금지
    expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('total mismatch'));

    // 복원하면 다시 200
    psql(`UPDATE public.zen_billing_statement_items SET line_total = ${before} WHERE statement_id='${stmtDraft}'`);
    expect((await httpExport(stmtDraft, agency)).status).toBe(200);
  });
});

// ───────────────────────────────────────────── §6 DRAFT 표시 · §2 파일명

describe('DRAFT 표시와 파일명 (부록A §2·§6)', () => {
  it('DRAFT는 빨간 초안 배너 + [초안] 접두, ISSUED는 공백', async () => {
    const draftWb = await parseWorkbook(await httpExport(stmtDraft, agency));
    const d1 = sheet(draftWb, SHEET_SUMMARY);
    expect(text(d1, 'A2')).toBe('초안 — 발행 전 문서');
    expect(d1.getCell('A2').font.color).toMatchObject({ argb: 'FFFF0000' });
    expect(text(sheet(draftWb, SHEET_DETAIL), 'A1')).toContain('[초안]');
    expect(text(d1, 'B25')).toBe('초안');

    const issuedWb = await parseWorkbook(await httpExport(stmtA2A, agency));
    const i1 = sheet(issuedWb, SHEET_SUMMARY);
    expect(text(i1, 'A2')).toBe('');                                  // 행 숨김 없이 공백
    expect(text(i1, 'B25')).toBe('발행됨');
    expect(text(i1, 'B3')).toBe(statementNoOf(stmtA2A));              // 청구서 번호 (A3 라벨 · B3 값)
    expect(text(i1, 'A6')).toBe('공급자 (청구하는 쪽)');
    expect(text(i1, 'D6')).toBe('공급받는자 (청구 대상)');
  });

  it('CLOSED는 입금 확인 정보를 보여준다', async () => {
    const s1 = sheet(await parseWorkbook(await httpExport(stmtShip, shipper)), SHEET_SUMMARY);
    expect(text(s1, 'B25')).toContain('입금완료');
    expect(text(s1, 'B25')).toContain('입금 확인 2026-12-05');
  });

  it('파일명은 금지 문자를 치환하고 RFC 5987 헤더를 쓴다', async () => {
    const res = await httpExport(stmtAdh, agency);
    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toContain("filename*=UTF-8''");
    expect(disposition).toContain(statementNoOf(stmtAdh));
    const ascii = disposition.match(/filename="([^"]*)"/)?.[1] ?? '';
    expect(ascii).not.toMatch(/[\\/:*?"<>|]/); // ASCII fallback에 금지 문자 없음
  });
});

// ───────────────────────────── PR #1411 수정 요청 — 소수 금액·KST 입금일·0.01 정밀도

describe('소수 금액·중량 (PR #1411 🔴1·🔴2)', () => {
  it('10.10+20.20 두 줄(합 30.30)·중량 0.10+0.20(0.30)도 200이고 표시값에 노이즈가 없다', async () => {
    const res = await httpExport(stmtDec, agency);
    expect(res.status).toBe(200);
    const wb = await parseWorkbook(res);
    const s1 = sheet(wb, SHEET_SUMMARY);
    const s2 = sheet(wb, SHEET_DETAIL);

    // 요약 금액 — 분 단위 정수 합산이라 부동소수 노이즈가 없다
    expect(s1.getCell('B15').value).toBe(10.1);   // 기본운임 10.10
    expect(s1.getCell('B16').value).toBe(20.2);   // 유류할증료 20.20
    expect(s1.getCell('B17').value).toBe(0);      // 할증료 0.00
    expect(s1.getCell('B18').value).toBe(0);      // 기타 0.00
    expect(s1.getCell('B19').value).toBe(0);      // 부가운임 0.00 (charge_details 없음)
    expect(s1.getCell('B21').value).toBe(30.3);   // 공급가액 합계 (float 합이면 30.299999999999997)

    // 중량 문자열 — float 합이면 "0.30000000000000004 kg"
    expect(text(s1, 'D24')).toBe('총 청구중량 0.30 kg');

    // 상세 합계 행(마지막 행) = 헤더 총액, 개별 금액은 숫자 셀
    const lastRow = s2.rowCount; // 3행 머리글 + 항목 2행 + 합계 1행 = 6
    expect(lastRow).toBe(6);
    expect(s2.getCell(addrOf(s2, '합계', lastRow)).value).toBe(30.3);
    expect(s2.getCell(addrOf(s2, '청구중량(kg)', lastRow)).value).toBe(0.3);
    expect(s2.getCell(addrOf(s2, '기본운임', 4)).value).toBe(10.1);
    expect(s2.getCell(addrOf(s2, '유류할증료', 5)).value).toBe(20.2);
    expect(typeof s2.getCell(addrOf(s2, '합계', 4)).value).toBe('number');

    const headerTotal = Number(psql(`SELECT total_amount FROM public.zen_billing_statements WHERE id='${stmtDec}'`));
    expect(headerTotal).toBe(30.3);
  });

  it('합계를 0.01만 어긋나도 500 (분 단위 정밀도 — 1원 미만 조작 차단)', async () => {
    const totalBefore = Number(psql(`SELECT sum(line_total) FROM public.zen_billing_statement_items WHERE statement_id='${stmtDec}'`));
    const rowBefore = Number(psql(`SELECT line_total FROM public.zen_billing_statement_items
                                   WHERE statement_id='${stmtDec}' AND order_id='${ORDER_DEC1}'`));
    expect(totalBefore).toBe(30.3);
    expect(rowBefore).toBe(10.1);

    const updated = psql(`UPDATE public.zen_billing_statement_items
                          SET line_total = line_total + 0.01
                          WHERE statement_id='${stmtDec}' AND order_id='${ORDER_DEC1}'
                          RETURNING line_total::text`);
    expect(Number(updated)).toBeCloseTo(rowBefore + 0.01, 2); // 10.10 → 10.11 (합 30.31)

    const res = await httpExport(stmtDec, agency);
    expect(res.status).toBe(500); // 30.31 ≠ 30.30 — 분 단위 정밀도로 감지
    expect(res.headers.get('Content-Type')).not.toContain('spreadsheetml');

    psql(`UPDATE public.zen_billing_statement_items SET line_total = ${rowBefore}
          WHERE statement_id='${stmtDec}' AND order_id='${ORDER_DEC1}'`);
    expect((await httpExport(stmtDec, agency)).status).toBe(200);
  });

  it('기본 입금일은 KST 날짜다 (UTC 18:00 = KST 다음날 03:00)', async () => {
    asUser(agency);
    const total = Number(psql(`SELECT total_amount FROM public.zen_billing_statements WHERE id='${stmtPaid}'`));
    // Date만 fake — 네트워크·타이머는 실제. UTC 2026-11-30 18:00 = KST 2026-12-01 03:00
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-30T18:00:00Z') });
    try {
      const res = await confirmStatementPayment(stmtPaid, { amount: total });
      expect(res.success, res.error).toBe(true);
    } finally {
      vi.useRealTimers();
    }
    // UTC slice면 '2026-11-30'(전날), KST면 '2026-12-01'
    expect(psql(`SELECT paid_date FROM public.zen_billing_statements WHERE id='${stmtPaid}'`)).toBe('2026-12-01');
  });
});
