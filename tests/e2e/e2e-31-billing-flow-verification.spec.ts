// TASK-B-371 (Issue #1439) — 청구서관리 전 구간 통합 E2E (WBS 8.1 전 구간 + 8.2 권한 교차)
//
// 원칙(이슈 [지켜야 할 것]):
//  · **mock 없음** — 실제 로그인(`page.goto`) + 실DB + **실제 Excel 다운로드**(exceljs 재파싱 단언)
//  · 소스 문자열 검사·함수 타입 단언·테스트 생략으로 대체하는 것은 금지 (이슈 위반이력 대응)
//  · 테스트 계정/fixture는 **자기완결형**(`b371-fixture.ts`), `seed-local.ts` 의존 없음
//  · 금액은 **정수 센트** 기준 비교, KST 날짜는 `date-kst.ts` 계열(로케일 `Asia/Seoul`)
//  · 환경: **로컬 Supabase 한정 (R-14)**
import { test, expect, type Page } from '@playwright/test';
import { evidenceDir } from './evidence-dir';
import fs from 'fs';
import ExcelJS from 'exceljs';
import {
  seedFixture, cleanupFixture, serviceClient,
  IDS, ORDER_NOS, ACCOUNTS, PASSWORD, ADHOC_NAME, type Fixture,
} from './b371-fixture';
import { loginAs } from './b371-login';

const EVIDENCE_DIR = evidenceDir('E2E_B371_Result');

// KST 기준 오늘/월초/년월 (인쇄·기간 입력에 사용)
const kstToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
const kstMonthStart = () => `${kstToday().slice(0, 8)}01`;
const kstYear = () => kstToday().slice(0, 4);
const kstMonthNum = () => String(Number(kstToday().slice(5, 7)));

type StatementRef = { id: string; no: string };
let fx: Fixture;
const stmtA: StatementRef = { id: '', no: '' }; // 대리점 A → 화주 A (orderX) · 발행→마감
const stmtAD: StatementRef = { id: '', no: '' }; // 대리점 A 수기 화주 (orderAd) · DRAFT(A5용)
const stmtB: StatementRef = { id: '', no: '' }; // 대리점 B → 화주 B (orderB) · 차단 대상

const sb = serviceClient();

function shot(name: string) {
  return `${EVIDENCE_DIR}/${name}.png`;
}

/** 청구서 행에서 상태·범위 배지 텍스트를 읽는다 */
async function rowOf(page: Page, statementNo: string) {
  const row = page.getByRole('row', { name: new RegExp(statementNo.replace(/[-]/g, '\\$&')) });
  await expect(row).toBeVisible({ timeout: 30_000 });
  return row;
}

/** 후보 테이블에서 오더번호 행의 체크박스를 선택한다 */
async function checkOrder(page: Page, orderNo: string) {
  const row = page.getByRole('row', { name: new RegExp(orderNo.replace(/[-]/g, '\\$&')) });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByRole('checkbox').check();
}

/** S4 청구서 생성 (등록 대상) — 조회→선택→초안 저장 → 상세로 이동 */
async function createStatementViaUi(
  page: Page, opts: { targetMode: 'ORG' | 'ADHOC'; targetLabel?: string; adhocName?: string; orderNos: string[] },
): Promise<string> {
  await page.goto('/ko/agency/statements/new');
  await expect(page.getByRole('heading', { name: '청구서 생성' })).toBeVisible({ timeout: 30_000 });

  await page.getByLabel('청구 대상 방식').selectOption(opts.targetMode);
  if (opts.targetMode === 'ORG') {
    await page.getByLabel('청구 대상').nth(1).selectOption({ label: opts.targetLabel! });
  } else {
    await page.getByLabel('화주명').fill(opts.adhocName!);
  }
  await page.getByLabel('년').fill(kstYear());
  await page.getByLabel('월').fill(kstMonthNum());
  await page.getByLabel('기준').selectOption('DELIVERED');
  await page.getByLabel('시작일').fill(kstMonthStart());
  await page.getByLabel('종료일').fill(kstToday());

  await page.getByRole('button', { name: '후보 오더 조회' }).click();
  for (const no of opts.orderNos) await checkOrder(page, no);

  await page.getByRole('button', { name: '초안 저장' }).click();
  await page.waitForURL(/\/ko\/agency\/statements\/[0-9a-f-]{36}/, { timeout: 30_000 });
  return new URL(page.url()).pathname.split('/').pop()!;
}

/** 상세에서 상태 배지 텍스트를 읽는다 (초안/발행/마감) */
async function statusBadge(page: Page): Promise<string> {
  for (const t of ['초안', '발행', '마감']) {
    if (await page.getByText(t, { exact: true }).first().isVisible().catch(() => false)) return t;
  }
  return '(배지 없음)';
}

test.describe.configure({ mode: 'serial' });

// 파일 레벨 훅 — describe별 훅으로 두면 **첫 describe 종료 시 fixture가 정리**되어
// 이후 describe의 로그인 계정이 사라진다(실측: A4-1 로그인 401).
test.beforeAll(async () => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fx = await seedFixture();
});
test.afterAll(async () => {
  await cleanupFixture();
});

test.describe('TASK-B-371: 청구서관리 전 구간 통합 E2E (WBS 8.1·8.2)', () => {

  // ───────────────────────────── A1. Admin 정산 완료 (SETTLED)

  test('A1. Admin: 오더정산 S1→S2 입력·임시저장·정산 완료 → SETTLED', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, ACCOUNTS.admin.email, PASSWORD);
    await page.goto('/ko/finance/order-settlement');
    await expect(page.getByRole('heading', { name: '오더정산' })).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: shot('A1-1_S1_목록'), fullPage: true });

    const row = await rowOf(page, ORDER_NOS.settle);
    await expect(row.getByText('미정산', { exact: true })).toBeVisible();
    await row.getByRole('link', { name: '정산' }).click();
    await expect(page).toHaveURL(new RegExp(`/ko/finance/order-settlement/${IDS.orderSettle}`), { timeout: 30_000 });

    // S2 입력 → 임시저장 → 정산 완료(확인 모달)
    await page.getByLabel('UPS 청구서번호').fill('B371-UPS-001');
    await page.getByLabel('기본운임 (HKD)').fill('1000');
    await page.getByLabel('유류할증료 (HKD)').fill('300');
    await page.getByLabel('급증수수료 (HKD)').fill('50');
    await page.getByRole('button', { name: /임시저장/ }).click();
    await expect(page.getByText(/저장했습니다\. 원가 합계/)).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: shot('A1-2_S2_임시저장'), fullPage: true });

    await page.getByRole('button', { name: /정산 완료/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/청구서 포함 전까지만 되돌릴 수 있습니다/)).toBeVisible();
    await dialog.getByRole('button', { name: '정산 완료' }).click();
    await expect(page.getByText('정산 완료 처리했습니다.')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('정산완료', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: shot('A1-3_S2_정산완료'), fullPage: true });

    // 실DB 확인 (서비스 클라이언트)
    const { data } = await sb.from('zen_orders').select('cost_settlement_status').eq('id', IDS.orderSettle).single();
    expect(data?.cost_settlement_status).toBe('SETTLED');
  });

  // ───────────────────────────── A2. 대리점 청구서 생성 (S4)

  test('A2-1. 대리점: 후보에 정산 오더 포함 + 미정산 오더 제외 + 등록 대상 청구서 생성', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, ACCOUNTS.agencyA.email, PASSWORD);
    await page.goto('/ko/agency/statements/new');
    await expect(page.getByRole('heading', { name: '청구서 생성' })).toBeVisible({ timeout: 30_000 });

    await page.getByLabel('청구 대상 방식').selectOption('ORG');
    await page.getByLabel('청구 대상').nth(1).selectOption({ label: 'B371 Shipper A' });
    await page.getByLabel('년').fill(kstYear());
    await page.getByLabel('월').fill(kstMonthNum());
    await page.getByLabel('기준').selectOption('DELIVERED');
    await page.getByLabel('시작일').fill(kstMonthStart());
    await page.getByLabel('종료일').fill(kstToday());
    await page.getByRole('button', { name: '후보 오더 조회' }).click();

    // 정산 완료 오더는 후보에 포함
    const table = page.getByRole('table');
    await expect(table.getByText(ORDER_NOS.x, { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(table.getByText(ORDER_NOS.settle, { exact: true })).toBeVisible();
    await expect(table.getByText(ORDER_NOS.free, { exact: true })).toBeVisible();
    await expect(table.getByText(ORDER_NOS.draft, { exact: true })).toBeVisible();
    // 미정산 오더는 후보에서 제외 + 안내 문구
    await expect(table.getByText(ORDER_NOS.u, { exact: true })).toHaveCount(0);
    await expect(page.getByText(/미정산 1건은 제외됨/)).toBeVisible();
    await page.screenshot({ path: shot('A2-1_S4_후보조회'), fullPage: true });

    // orderX만 선택 → 초안 저장
    await checkOrder(page, ORDER_NOS.x);
    await expect(page.getByText(/선택 1건 \/ 후보 4건/)).toBeVisible();
    await expect(page.getByText(/선택 합계 126,000원/)).toBeVisible();
    await page.getByRole('button', { name: '초안 저장' }).click();
    await page.waitForURL(/\/ko\/agency\/statements\/[0-9a-f-]{36}/, { timeout: 30_000 });

    stmtA.id = new URL(page.url()).pathname.split('/').pop()!;
    const { data: row } = await sb.from('zen_billing_statements')
      .select('statement_no, status, total_amount, tier').eq('id', stmtA.id).single();
    stmtA.no = row!.statement_no;
    expect(row!.status).toBe('DRAFT');
    expect(Number(row!.total_amount)).toBe(126000); // 센트 12,600,000 = 126,000.00
    expect(row!.tier).toBe('AGENCY_TO_SHIPPER');
    await expect(page.getByText('초안', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: shot('A2-2_S5_DRAFT'), fullPage: true });
  });

  test('A2-2. 대리점: 수기 화주명(R11) 오더가 후보에 포함되어 청구서 생성', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, ACCOUNTS.agencyA.email, PASSWORD);
    const id = await createStatementViaUi(page, {
      targetMode: 'ADHOC', adhocName: ADHOC_NAME, orderNos: [ORDER_NOS.ad],
    });
    stmtAD.id = id;
    const { data: row } = await sb.from('zen_billing_statements')
      .select('statement_no, status, billed_party_type, billed_name, total_amount').eq('id', id).single();
    stmtAD.no = row!.statement_no;
    expect(row!.billed_party_type).toBe('ADHOC');
    expect(row!.billed_name).toBe(ADHOC_NAME);
    expect(row!.status).toBe('DRAFT');
    expect(Number(row!.total_amount)).toBe(126000);
    await page.screenshot({ path: shot('A2-3_S4_ADHOC_생성'), fullPage: true });
  });

  test('A2-3. 대리점 B: 타 생성자 차단용 청구서 생성 (B1 대상)', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, ACCOUNTS.agencyB.email, PASSWORD);
    const id = await createStatementViaUi(page, {
      targetMode: 'ORG', targetLabel: 'B371 Shipper B', orderNos: [ORDER_NOS.b],
    });
    stmtB.id = id;
    const { data: row } = await sb.from('zen_billing_statements')
      .select('statement_no, issuer_org_id').eq('id', id).single();
    stmtB.no = row!.statement_no;
    expect(row!.issuer_org_id).toBe(IDS.agencyBOrg);
    await page.screenshot({ path: shot('A2-4_대리점B_생성'), fullPage: true });
  });

  // ───────────────────────────── A3. 발행 → 화주 읽기전용 → 입금확인

  test('A3. 발행(ISSUED) → 화주 RECEIVED 읽기전용 열람 → 입금확인(CLOSED)', async ({ page }) => {
    test.setTimeout(300_000);

    // ① 대리점: 발행
    await loginAs(page, ACCOUNTS.agencyA.email, PASSWORD);
    await page.goto(`/ko/agency/statements/${stmtA.id}`);
    await expect(page.getByRole('heading', { name: '청구서 상세' })).toBeVisible({ timeout: 30_000 });
    expect(await statusBadge(page)).toBe('초안');
    await page.getByRole('button', { name: '발행', exact: true }).click();
    const issueDialog = page.getByRole('dialog');
    await expect(issueDialog.getByText('발행하면 취소·삭제할 수 없습니다.')).toBeVisible();
    await issueDialog.getByRole('button', { name: '발행 확정' }).click();
    // 위양성 방지: 다이얼로그 제목도 '발행'이라 텍스트 존재로는 성공을 확인할 수 없다 → **모달이 닫히고 배지가 바뀌는지**로 확인
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText('발행', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    expect(await statusBadge(page)).toBe('발행');
    await page.screenshot({ path: shot('A3-1_발행_ISSUED'), fullPage: true });
    {
      const { data } = await sb.from('zen_billing_statements').select('status').eq('id', stmtA.id).single();
      expect(data?.status).toBe('ISSUED');
    }

    // ② 화주: RECEIVED 읽기 전용 (변형 버튼 없음)
    await loginAs(page, ACCOUNTS.shipperA.email, PASSWORD);
    await page.goto('/ko/shipper/statements');
    const shipperRow = await rowOf(page, stmtA.no);
    await expect(shipperRow.getByText('나에게 청구된', { exact: true })).toBeVisible();
    await shipperRow.getByRole('link', { name: '보기' }).click();
    await expect(page).toHaveURL(new RegExp(`/ko/shipper/statements/${stmtA.id}`), { timeout: 30_000 });
    await expect(page.getByText('조회 전용', { exact: true })).toBeVisible();
    // 변형 버튼 미노출 (UI 숨김)
    await expect(page.getByRole('button', { name: '발행', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '취소(삭제)' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '입금확인', exact: true })).toHaveCount(0);
    // 읽기 전용에도 Excel 저장은 남는다
    await expect(page.getByRole('link', { name: 'Excel 저장' })).toBeVisible();
    await page.screenshot({ path: shot('A3-2_화주_읽기전용'), fullPage: true });

    // ③ 대리점: 입금확인 → CLOSED
    await loginAs(page, ACCOUNTS.agencyA.email, PASSWORD);
    await page.goto(`/ko/agency/statements/${stmtA.id}`);
    await page.getByRole('button', { name: '입금확인', exact: true }).click();
    const payDialog = page.getByRole('dialog');
    await expect(payDialog.getByLabel('입금일')).toBeVisible();
    await expect(payDialog.getByLabel('입금액')).toHaveValue('126000');
    await payDialog.getByRole('button', { name: '입금확인 완료' }).click();
    // 모달이 닫히고 배지가 마감으로 바뀌는지로 성공 확인 (토스트만으로는 위양성)
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 30_000 });
    expect(await statusBadge(page)).toBe('마감');
    await expect(page.getByText('입금확인 완료').first()).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: shot('A3-3_입금확인_CLOSED'), fullPage: true });
    {
      const { data } = await sb.from('zen_billing_statements')
        .select('status, paid_amount, paid_date').eq('id', stmtA.id).single();
      expect(data?.status).toBe('CLOSED');
      expect(Number(data?.paid_amount)).toBe(126000);
      expect(data?.paid_date).toBe(kstToday()); // KST 입금일 (기본값)
    }
  });
});

// ───────────────────────────────────── A4. Excel 실제 다운로드 (WBS 8.1-4)

/** 열 인덱스 → 문자 (A..Z, 상세 시트 최대 13열) */
function columnLetter(index: number): string {
  return String.fromCharCode(64 + index);
}

/** Node 타이머 상한 — 멈춘 페이지/무한 대기에도 셀이 반드시 종료되게 한다(실측: 한 셀 44분) */
function alarm<T>(label: string, ms: number, fn: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const a = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`ALARM:${label}:${ms}ms`)), ms);
  });
  return Promise.race([fn(), a]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/** dev 서버 재컴파일 시 `ECONNRESET`이 나므로 export 요청은 재시도한다(실측) */
async function exportResponse(page: Page, statementId: string): Promise<import('@playwright/test').APIResponse> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await page.request.get(`/api/finance/statements/${statementId}/export`, {
        failOnStatusCode: false,
        timeout: 30_000,
      });
    } catch (err) {
      lastError = err;
      console.log(`[B371-export] attempt ${attempt} 실패: ${(err as Error).message.slice(0, 120)}`);
      await page.waitForTimeout(2000);
    }
  }
  throw lastError;
}

/** 상세 시트 3행 머리글에서 '합계' 열 주소(예: L5)를 찾는다 */
function totalCellAddress(ws: ExcelJS.Worksheet): string {
  for (let c = 1; c <= 30; c++) {
    if (String(ws.getCell(3, c).value ?? '') === '합계') return `${columnLetter(c)}${ws.rowCount}`;
  }
  throw new Error('합계 열을 찾지 못했습니다');
}

/** 정수 센트 비교 (부동소수 오탐 방지) */
function toCents(v: number): number {
  return Math.round(v * 100);
}

/** 생성된 .xlsx를 exceljs로 재파싱해 구조·값을 DB와 대조한다 (파일 존재/확자자만 보는 검증 금지) */
async function assertWorkbookMatchesDb(filePath: string, statementId: string, opts: { minItemRows: number }) {
  const { data: hdr } = await sb.from('zen_billing_statements')
    .select('total_amount, statement_no').eq('id', statementId).single();
  const { data: items } = await sb.from('zen_billing_statement_items')
    .select('order_id, line_total, charge_weight_kg').eq('statement_id', statementId);
  expect(hdr, '헤더 조회 실패').toBeTruthy();
  expect(items?.length ?? 0).toBeGreaterThanOrEqual(opts.minItemRows);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  expect(wb.worksheets.map((w) => w.name)).toEqual(['청구서', '오더별 상세']);

  const s1 = wb.getWorksheet('청구서')!;
  const s2 = wb.getWorksheet('오더별 상세')!;
  const totalCents = toCents(Number(hdr!.total_amount));

  // 시트1: 공급가액 합계(B20) = 헤더 총액
  expect(toCents(Number(s1.getCell('B20').value))).toBe(totalCents);
  // 시트1: 청구서 번호 표기
  expect(String(s1.getCell('B3').value)).toBe(hdr!.statement_no);

  // 시트2: 열 머리글(3행)에서 합계 열 인덱스를 찾고, 항목 행 수·합계 행을 DB와 대조
  const labels: string[] = [];
  for (let c = 1; c <= 30; c++) {
    const v = s2.getCell(3, c).value;
    if (v === null || v === undefined || v === '') break;
    labels.push(String(v));
  }
  expect(labels).toContain('오더번호');
  const totalCol = labels.indexOf('합계') + 1;
  expect(totalCol).toBeGreaterThan(0);

  const expectedRows = 3 + items!.length + 1; // 머리글 3행 + 항목 + 합계
  expect(s2.rowCount).toBe(expectedRows);
  const totalCell = s2.getCell(expectedRows, totalCol);
  expect(toCents(Number(totalCell.value))).toBe(totalCents);
  expect(totalCell.font.bold).toBe(true);

  // 항목 행 = DB 값(주문번호 존재 + 센트 단위 금액)
  const orderNos = new Set(
    (await sb.from('zen_orders').select('order_no').in('id', items!.map((i) => i.order_id))).data?.map((o) => o.order_no) ?? [],
  );
  let matched = 0;
  for (let r = 4; r <= 3 + items!.length; r++) {
    const no = String(s2.getCell(r, 2).value);
    if (orderNos.has(no)) matched++;
    expect(typeof s2.getCell(r, totalCol).value).toBe('number'); // 숫자 셀
  }
  expect(matched).toBe(items!.length);
  return { totalCents, itemCount: items!.length, totalCell: `${columnLetter(totalCol)}${expectedRows}` };
}


test.describe('TASK-B-371 continued: Excel·되돌리기·권한 교차', () => {
  test('A4-1. 대리점 Excel 실제 다운로드 → exceljs 재파싱 → DB 대조', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, ACCOUNTS.agencyA.email, PASSWORD);
    await page.goto('/ko/agency/statements');
    const row = await rowOf(page, stmtA.no);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      row.getByRole('link', { name: 'Excel 저장' }).click(),
    ]);
    expect(download.suggestedFilename()).toContain(stmtA.no);
    const filePath = `${EVIDENCE_DIR}/A4-1_대리점_${stmtA.no}.xlsx`;
    await download.saveAs(filePath);
    expect(fs.existsSync(filePath)).toBe(true);

    const { totalCents, itemCount } = await assertWorkbookMatchesDb(filePath, stmtA.id, { minItemRows: 1 });
    expect(totalCents).toBe(12_600_000); // 126,000.00원 → 센트
    expect(itemCount).toBe(1);
  });

  test('A4-2. 화주(읽기 전용)도 동일 Excel을 실제 다운로드해 같은 값이 나온다', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, ACCOUNTS.shipperA.email, PASSWORD);
    await page.goto('/ko/shipper/statements');
    const row = await rowOf(page, stmtA.no);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      row.getByRole('link', { name: 'Excel 저장' }).click(),
    ]);
    const filePath = `${EVIDENCE_DIR}/A4-2_화주_${stmtA.no}.xlsx`;
    await download.saveAs(filePath);
    const { totalCents } = await assertWorkbookMatchesDb(filePath, stmtA.id, { minItemRows: 1 });
    expect(totalCents).toBe(12_600_000);

    // 대리점 파일과 **값 동일** (docProps 생성 시각이 달라 바이트 비교는 성립하지 않는다 — 실측으로 확인)
    const agencyFile = `${EVIDENCE_DIR}/A4-1_대리점_${stmtA.no}.xlsx`;
    const wbS = new ExcelJS.Workbook();
    await wbS.xlsx.readFile(filePath);
    const wbA = new ExcelJS.Workbook();
    await wbA.xlsx.readFile(agencyFile);
    const [s1s, s1a] = [wbS.getWorksheet('청구서')!, wbA.getWorksheet('청구서')!];
    const [s2s, s2a] = [wbS.getWorksheet('오더별 상세')!, wbA.getWorksheet('오더별 상세')!];
    expect(s1s.getCell('B3').value).toBe(s1a.getCell('B3').value);          // 청구서 번호
    expect(toCents(Number(s1s.getCell('B20').value))).toBe(toCents(Number(s1a.getCell('B20').value))); // 공급가액
    expect(s2s.rowCount).toBe(s2a.rowCount);                                 // 항목 행 수
    expect(totalCellAddress(s2s)).toBe(totalCellAddress(s2a));               // 합계 열·행 위치
    expect(toCents(Number(s2s.getCell(totalCellAddress(s2s)).value)))
      .toBe(toCents(Number(s2a.getCell(totalCellAddress(s2a)).value)));      // 합계 값
  });

  // ───────────────────────── A5. 정산 되돌리기 (허용/차단)

  test('A5. 정산 되돌리기 — 미포함 성공 / 청구서 포함 차단 / DRAFT 취소 후 성공', async ({ page }) => {
    test.setTimeout(300_000);
    await loginAs(page, ACCOUNTS.admin.email, PASSWORD);

    // ① 청구서 미포함(orderFree) → 성공
    await page.goto(`/ko/finance/order-settlement/${IDS.orderFree}`);
    await expect(page.getByRole('button', { name: '정산 되돌리기' })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: '정산 되돌리기' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '되돌리기' }).click();
    await expect(page.getByText('정산을 되돌렸습니다.')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: shot('A5-1_미포함_unmark성공'), fullPage: true });
    {
      const { data } = await sb.from('zen_orders').select('cost_settlement_status').eq('id', IDS.orderFree).single();
      expect(data?.cost_settlement_status).toBe('NOT_SETTLED');
    }

    // ② 청구서 포함(orderX ∈ stmtA) → 서버 차단 (확인 모달 안에서 오류)
    await page.goto(`/ko/finance/order-settlement/${IDS.orderX}`);
    await page.getByRole('button', { name: '정산 되돌리기' }).click();
    const blockedDialog = page.getByRole('dialog');
    await blockedDialog.getByRole('button', { name: '되돌리기' }).click();
    await expect(blockedDialog.getByRole('alert')).toHaveText(
      '이 오더는 청구서에 포함되어 정산을 해제할 수 없습니다. 먼저 청구서를 취소하세요.',
      { timeout: 30_000 },
    );
    await page.screenshot({ path: shot('A5-2_포함_unmark차단'), fullPage: true });
    await blockedDialog.getByRole('button', { name: '닫기' }).click();
    {
      const { data } = await sb.from('zen_orders').select('cost_settlement_status').eq('id', IDS.orderX).single();
      expect(data?.cost_settlement_status).toBe('SETTLED'); // 상태 불변
    }

    // ③ 청구서 포함(orderAd ∈ stmtAD DRAFT) → 차단 → 청구서 취소 → 성공
    await page.goto(`/ko/finance/order-settlement/${IDS.orderAd}`);
    await page.getByRole('button', { name: '정산 되돌리기' }).click();
    const d1 = page.getByRole('dialog');
    await d1.getByRole('button', { name: '되돌리기' }).click();
    await expect(d1.getByRole('alert')).toHaveText(
      '이 오더는 청구서에 포함되어 정산을 해제할 수 없습니다. 먼저 청구서를 취소하세요.',
      { timeout: 30_000 },
    );
    await d1.getByRole('button', { name: '닫기' }).click();
    await page.screenshot({ path: shot('A5-3_DRAFT포함_unmark차단'), fullPage: true });

    // DRAFT 청구서 취소
    await loginAs(page, ACCOUNTS.agencyA.email, PASSWORD);
    await page.goto(`/ko/agency/statements/${stmtAD.id}`);
    await page.getByRole('button', { name: '취소(삭제)' }).click();
    const cancelDialog = page.getByRole('dialog');
    await expect(cancelDialog.getByText(/초안을 취소하면 삭제되며 복구할 수 없습니다/)).toBeVisible();
    await cancelDialog.getByRole('button', { name: '취소 확정' }).click();
    await page.waitForURL(/\/ko\/agency\/statements$/, { timeout: 30_000 });
    await expect(page.getByRole('row', { name: new RegExp(stmtAD.no) })).toHaveCount(0);
    await page.screenshot({ path: shot('A5-4_DRAFT_청구서취소'), fullPage: true });

    // 취소 후에는 unmark 성공
    await loginAs(page, ACCOUNTS.admin.email, PASSWORD);
    await page.goto(`/ko/finance/order-settlement/${IDS.orderAd}`);
    await page.getByRole('button', { name: '정산 되돌리기' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '되돌리기' }).click();
    await expect(page.getByText('정산을 되돌렸습니다.')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: shot('A5-5_취소후_unmark성공'), fullPage: true });
    const { data } = await sb.from('zen_orders').select('cost_settlement_status').eq('id', IDS.orderAd).single();
    expect(data?.cost_settlement_status).toBe('NOT_SETTLED');
  });
});

// ───────────────────────────────────── B. 권한 교차 (WBS 8.2)

/**
 * 클라이언트 번들에서 서버 액션 ID를 얻는다.
 * dev 서버는 `server-reference-manifest.json`을 갱신하지 않으므로(스테일), 실제 번들에
 * 심긴 `createServerReference("<40hex>")` 를 `"name":"<액션명>"` 모듈 블록 뒤에서 찾는다(프로브 실측).
 */
async function serverActionId(page: Page, actionName: string): Promise<string> {
  const scripts: string[] = await page.$$eval('script[src]', (els) =>
    els.map((e) => (e as HTMLScriptElement).src));
  for (const src of scripts) {
    const r = await page.request.get(src, { failOnStatusCode: false });
    if (!r.ok()) continue;
    const text = await r.text();
    const idx = text.indexOf(`"name":"${actionName}"`);
    if (idx < 0) continue;
    const m = text.slice(idx).match(/"createServerReference"\]\)\("([0-9a-f]{32,})"/);
    if (m) return m[1];
  }
  throw new Error(`[B371] server action id not found: ${actionName}`);
}

/**
 * 서버 액션을 **실제 브라우저 세션(page.request = 쿠키 공유)** 으로 직접 호출한다.
 * 요청 형식은 앱이 보내는 것과 동일하다(프로브5 실측): `text/plain;charset=UTF-8` + JSON 인자 배열.
 * `request` fixture는 쿠키를 공유하지 않아 인증이 되지 않는다(프로브4 실측: `{}` 응답).
 */
async function postServerAction(
  page: Page,
  pageUrl: string,
  actionId: string,
  args: unknown[],
): Promise<string> {
  const res = await page.request.post(pageUrl, {
    headers: {
      'Next-Action': actionId,
      'Content-Type': 'text/plain;charset=UTF-8',
      Accept: 'text/x-component',
    },
    data: JSON.stringify(args),
    failOnStatusCode: false,
    timeout: 30_000,
  });
  const text = await res.text();
  console.log(`[B371-server-action] status=${res.status()} ct=${res.headers()['content-type']} body=${text.slice(0, 300).replace(/\n/g, ' | ')}`);
  expect(res.status(), '서버 액션 직접 호출 응답 상태').toBe(200);
  expect(res.headers()['content-type'] ?? '').toContain('text/x-component');
  return text;
}


test.describe('TASK-B-371 continued: 권한 교차 (WBS 8.2)', () => {
  test('B1. 대리점 A → 대리점 B의 청구서 상세/Excel 차단', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, ACCOUNTS.agencyA.email, PASSWORD);

    // 목록에 보이지 않는다 (RLS)
    await page.goto('/ko/agency/statements');
    await expect(page.getByRole('row', { name: new RegExp(stmtB.no) })).toHaveCount(0);

    // 상세 직접 입력 → 서버가 미존재와 동일하게 응답
    const detailResp = await page.goto(`/ko/agency/statements/${stmtB.id}`);
    await expect(page.getByText('청구서를 찾을 수 없습니다.').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('조회 전용')).toHaveCount(0);
    await page.screenshot({ path: shot('B1-1_타대리점_상세차단'), fullPage: true });
    console.log(`[B371-matrix] B1 상세 HTTP status=${detailResp?.status()} path=${new URL(page.url()).pathname}`);

    // Excel 직접 요청 → 404 (존재 비노출)
    const xls = await exportResponse(page, stmtB.id);
    expect(xls.status()).toBe(404);
    expect(xls.headers()['content-type'] ?? '').not.toContain('spreadsheetml');
    await page.screenshot({ path: shot('B1-2_타대리점_Excel404'), fullPage: true });
  });

  test('B2. 화주 B → 화주 A 수신분 상세/Excel 차단', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, ACCOUNTS.shipperB.email, PASSWORD);

    await page.goto('/ko/shipper/statements');
    await expect(page.getByRole('row', { name: new RegExp(stmtA.no) })).toHaveCount(0);

    const detailResp = await page.goto(`/ko/shipper/statements/${stmtA.id}`);
    await expect(page.getByText('청구서를 찾을 수 없습니다.').first()).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: shot('B2-1_타화주_상세차단'), fullPage: true });
    console.log(`[B371-matrix] B2 상세 HTTP status=${detailResp?.status()} path=${new URL(page.url()).pathname}`);

    const xls = await exportResponse(page, stmtA.id);
    expect(xls.status()).toBe(404);
  });

  test('B3. UI 숨김과 무관하게 **서버 액션 직접 호출도 거부**된다', async ({ page }) => {
    test.setTimeout(300_000);

    // (a) 화주: 보이는 청구서에도 cancelBillingStatement 직접 호출 → 발행자 전용 거부
    await loginAs(page, ACCOUNTS.shipperA.email, PASSWORD);
    await page.goto(`/ko/shipper/statements/${stmtA.id}`); // 페이지 로드 → 서버 액션 매니페스트 갱신
    await expect(page.getByText('조회 전용', { exact: true })).toBeVisible({ timeout: 30_000 });
    const cancelId = await serverActionId(page, 'cancelBillingStatement');
    const shipperCall = await postServerAction(page, `/ko/shipper/statements/${stmtA.id}`, cancelId, [stmtA.id]);
    expect(shipperCall).toContain('권한이 없습니다.');
    await page.screenshot({ path: shot('B3-1_화주_액션직접호출_거부'), fullPage: true });

    // (b) 대리점 A: 타 생성자 청구서에 cancelBillingStatement 직접 호출 → 미존재와 동일
    await loginAs(page, ACCOUNTS.agencyA.email, PASSWORD);
    await page.goto(`/ko/agency/statements/${stmtB.id}`);
    await expect(page.getByText('청구서를 찾을 수 없습니다.').first()).toBeVisible({ timeout: 30_000 });
    const cancelIdB = await serverActionId(page, 'cancelBillingStatement');
    const agencyCall = await postServerAction(page, `/ko/agency/statements/${stmtB.id}`, cancelIdB, [stmtB.id]);
    expect(agencyCall).toContain('청구서를 찾을 수 없습니다.');
    await page.screenshot({ path: shot('B3-2_타대리점_액션직접호출_거부'), fullPage: true });
  });

  test('B4. 대리점·화주가 /finance/order-settlement(및 S2)를 직접 입력 → 서버가 차단', async ({ browser }) => {
    test.setTimeout(300_000);
    const cases: Array<{ email: string; expectedPath: string; label: string }> = [
      { email: ACCOUNTS.agencyA.email, expectedPath: '/ko/agency', label: '대리점A' },
      { email: ACCOUNTS.agencyB.email, expectedPath: '/ko/agency', label: '대리점B' },
      { email: ACCOUNTS.shipperA.email, expectedPath: '/ko/orders', label: '화주A' },
      { email: ACCOUNTS.shipperB.email, expectedPath: '/ko/orders', label: '화주B' },
    ];
    const results: string[] = [];
    for (const c of cases) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginAs(page, c.email, PASSWORD);
      for (const url of ['/ko/finance/order-settlement', `/ko/finance/order-settlement/${IDS.orderX}`]) {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });
        const finalPath = new URL(page.url()).pathname;
        results.push(`${c.label} ${url} → status=${resp?.status()} path=${finalPath}`);
        expect(finalPath, `${c.label} ${url} 차단 경로`).toBe(c.expectedPath);
      }
      await ctx.close();
    }
    console.log(`[B371-matrix] B4 실측:\n${results.join('\n')}`);
    fs.writeFileSync(`${EVIDENCE_DIR}/B4_order-settlement_차단실측.txt`, results.join('\n'));
  });

  test('B5. Admin의 AGENCY 발행분 감독 = 읽기 전용(변형 버튼 없음)', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, ACCOUNTS.admin.email, PASSWORD);
    await page.goto('/ko/finance/statements');
    const row = await rowOf(page, stmtA.no);
    await expect(row.getByText('감독 조회', { exact: true })).toBeVisible();
    await row.getByRole('link', { name: '보기' }).click();
    await expect(page).toHaveURL(new RegExp(`/ko/finance/statements/${stmtA.id}`), { timeout: 30_000 });
    await expect(page.getByText('조회 전용', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '발행', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '입금확인', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '취소(삭제)' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Excel 저장' })).toBeVisible();
    // 읽기 전용에도 Excel은 200
    const xls = await exportResponse(page, stmtA.id);
    expect(xls.status()).toBe(200);
    await page.screenshot({ path: shot('B5_Admin_감독_읽기전용'), fullPage: true });
  });
});

// ───────────────────────────────────── B6. 역할×화면 매트릭스 (실측 기록)

test.describe('TASK-B-371: 8.2 역할×화면 매트릭스 실측', () => {
  test('B6. 5역할 × 8화면 결과를 JSON으로 기록한다 (예측 금지 → 실측값)', async ({ browser }) => {
    test.setTimeout(2_700_000); // dev 서버 라우트 컴파일까지 포함 — 45분 상한

    // 자기완결: A 시나리오를 거치지 않고 단독 실행(-g B6)해도 되도록 대리점 B 청구서를 보장한다
    if (!stmtB.id) {
      const ctx0 = await browser.newContext();
      const page0 = await ctx0.newPage();
      await loginAs(page0, ACCOUNTS.agencyB.email, PASSWORD);
      stmtB.id = await createStatementViaUi(page0, {
        targetMode: 'ORG', targetLabel: 'B371 Shipper B', orderNos: [ORDER_NOS.b],
      });
      const { data } = await sb.from('zen_billing_statements').select('statement_no').eq('id', stmtB.id).single();
      stmtB.no = data!.statement_no;
      await ctx0.close();
      console.log('[B371-matrix] 자기완결 stmtB 생성:', stmtB.no);
    }

    const screens = [
      { key: 'S1_오더정산목록', url: '/ko/finance/order-settlement' },
      { key: 'S2_오더정산상세', url: `/ko/finance/order-settlement/${IDS.orderX}` },
      { key: 'S3a_Admin청구서목록', url: '/ko/finance/statements' },
      { key: 'S3b_대리점청구서목록', url: '/ko/agency/statements' },
      { key: 'S3c_화주청구서목록', url: '/ko/shipper/statements' },
      // 순서 주의(실측): S4(`/new`)를 **먼저** 렌더링한 뒤 S5로 넘어가면 dev 서버 응답이 멈춰
      // `waitForSelector`가 무한 대기했다(한 셀 44분). S5·Excel을 앞으로 둔다.
      { key: 'S5_타인상세(대리점B문서)', url: `/ko/agency/statements/${stmtB.id}` },
      { key: 'Excel_타인문서', url: `/api/finance/statements/${stmtB.id}/export` },
      { key: 'S4_청구서생성', url: '/ko/agency/statements/new' },
    ];
    const roles = [
      { key: 'Admin', email: ACCOUNTS.admin.email },
      { key: '대리점A', email: ACCOUNTS.agencyA.email },
      { key: '대리점B', email: ACCOUNTS.agencyB.email },
      { key: '화주A', email: ACCOUNTS.shipperA.email },
      { key: '화주B', email: ACCOUNTS.shipperB.email },
    ];
    const outPath = `${EVIDENCE_DIR}/B6_역할x화면_매트릭스.json`;
    const matrix: Array<Record<string, unknown>> = [];

    for (const role of roles) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      try {
        await loginAs(page, role.email, PASSWORD);
        for (const sc of screens) {
          const cellStart = Date.now();
          const cell: Record<string, unknown> = { role: role.key, screen: sc.key, url: sc.url };
          // 셀마다 **새 페이지** — 이전 셀의 프레임 상태(미완료 클라이언트 이동 등)가 남아
          // `waitForSelector`가 무한 대기하는 사례를 실측으로 확인(44분/셀) → 격리한다.
          const cellPage = await ctx.newPage();
          // R-04 [SAR-2026-04-19-001] Runtime Console Audit — 미처리 JS 예외·console.error 수집
          const pageErrors: string[] = [];
          const consoleErrors: string[] = [];
          cellPage.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
          cellPage.on('console', (m) => {
            if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
          });
          try {
            // 셀 전체에 60초 상한 — 미존재 상세 페이지에는 `<h1>`이 없어 h1/textContent 대기가 길어진다(실측)
            await alarm('cell', 60_000, async () => {
            if (sc.url.startsWith('/api/')) {
              const res = await ctx.request.get(sc.url, { failOnStatusCode: false, timeout: 15_000 });
              cell.status = res.status();
              cell.finalPath = '(api)';
              cell.ct = (res.headers()['content-type'] ?? '').slice(0, 60);
            } else {
              const resp = await cellPage.goto(sc.url, { waitUntil: 'commit', timeout: 20_000 });
              cell.status = resp?.status() ?? null;
              // h1이 없는 화면(미존재 상세)이 있어 body + 짧은 대기로 변경
              await cellPage.waitForSelector('body', { state: 'attached', timeout: 10_000 }).catch(() => null);
              await cellPage.waitForTimeout(500);
              cell.finalPath = new URL(cellPage.url()).pathname;
              // 핵심 플래그를 먼저 읽는다 — 미존재 상세는 h1이 없어 textContent가 기본 30초를 기다린다(실측)
              cell.없음안내 = await cellPage.getByText('청구서를 찾을 수 없습니다.').first().isVisible().catch(() => false);
              cell.조회전용배지 = await cellPage.getByText('조회 전용', { exact: true }).first().isVisible().catch(() => false);
              cell.생성버튼 = await cellPage.getByRole('link', { name: '+ 청구서 생성' }).isVisible().catch(() => false);
              cell.발행버튼 = await cellPage.getByRole('button', { name: '발행', exact: true }).isVisible().catch(() => false);
              cell.입금확인버튼 = await cellPage.getByRole('button', { name: '입금확인', exact: true }).isVisible().catch(() => false);
              cell.취소삭제버튼 = await cellPage.getByRole('button', { name: '취소(삭제)' }).isVisible().catch(() => false);
              cell.Excel링크 = await cellPage.getByRole('link', { name: 'Excel 저장' }).isVisible().catch(() => false);
              cell.heading = ((await cellPage.locator('h1').first().textContent({ timeout: 5_000 }).catch(() => '')) ?? '').trim();
            }
            });
          } catch (err) {
            cell.error = (err as Error).message.slice(0, 160);
          }
          cell.pageErrors = pageErrors;
          cell.consoleErrors = consoleErrors;
          // 셀 페이지는 닫지 않는다 — `page.close()`가 로딩 중인 페이지에서 대기하면
          // 타이밍·전체 진행이 함께 멈춘다(실측). 역할 종료 시 `ctx.close()`로 일괄 정리한다.
          matrix.push(cell);
          console.log(`[B371-cell] ${role.key}/${sc.key} ${Date.now() - cellStart}ms status=${String(cell.status)} path=${String(cell.finalPath)} err=${String(cell.error ?? '')}`);
        }
      } catch (err) {
        matrix.push({ role: role.key, screen: '(로그인 실패)', error: (err as Error).message.slice(0, 200) });
      } finally {
        // 역할마다 중간 저장 — 일부 실패에도 증적이 남는다
        fs.writeFileSync(outPath, JSON.stringify(matrix, null, 2));
        await ctx.close();
      }
    }
    console.log(`[B371-matrix] ${matrix.length}개 셀 기록 → ${outPath}`);
    expect(matrix.length).toBeGreaterThanOrEqual(roles.length * screens.length);
    // 로그인 실패 셀이 없어야 한다
    expect(matrix.filter((c) => c.screen === '(로그인 실패)')).toHaveLength(0);

    // R-04 [SAR-2026-04-19-001] Runtime Console Audit — 미처리 JS 예외(pageerror) 0건
    const allPageErrors = matrix.flatMap((c) => (c.pageErrors as string[]) ?? []);
    const allConsoleErrors = matrix.flatMap((c) => (c.consoleErrors as string[]) ?? []);
    fs.writeFileSync(`${EVIDENCE_DIR}/B7_R04_콘솔점검.json`, JSON.stringify({ pageErrors: allPageErrors, consoleErrors: allConsoleErrors }, null, 2));
    console.log(`[B371-r04] pageerror=${allPageErrors.length} console.error=${allConsoleErrors.length}`);
    expect(allPageErrors).toEqual([]);
  });
});
