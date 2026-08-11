import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// ─── TASK-B-272 / Issue #1044 / DEF-B-044 — R-10 실브라우저 검증 ─────────────
// SHIPPER 역할로 오더 등록 화면에서 수하인 국가=중국:
//   1. 성=Guangdong(GD, 남부) 선택 → 예상운임 정상 계산 (Zone10 요율, 에러 없음)
//   2. 성=Beijing(BJ, 목록 외) 선택 → 예상운임 정상 계산 (Zone1 요율)
//   3. 성 미선택 상태로 제출 시도 → 명확한 에러로 차단

dotenv.config({ path: '.env.local' });

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_272_Result';
const SHIPPER_EMAIL = 'r10_shipper_272@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

async function ensureDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function loginAs(page: any, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/ko/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[data-action="login"]');
  await page.waitForURL((url: URL) => url.pathname !== '/ko/login', { timeout: 30000 });
}

async function gotoOrderForm(page: any) {
  await page.goto('/ko/orders/new');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('button:has-text("UPS Direct")', { timeout: 30000 });
  await page.locator('button:has-text("UPS Direct")').click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("수하인 정보")').first().click();
  await page.waitForTimeout(500);
  // 수취인 기본 정보 채움
  await page.fill('input[name="recipient_name"]', 'Li Wei');
  await page.fill('input[name="recipient_phone"]', '01012345678');
  // 패키지
  const contentType = page.locator('select[name="packages.0.content_type"]');
  if (await contentType.count()) await contentType.selectOption('NONDOC');
  await page.fill('input[name="packages.0.packing_count"]', '1');
  await page.fill('input[name="packages.0.length"]', '10');
  await page.fill('input[name="packages.0.width"]', '10');
  await page.fill('input[name="packages.0.height"]', '10');
  await page.fill('input[name="packages.0.gross_weight"]', '5');
  await page.fill('input[name="packages.0.items.0.item_name"]', 'Widget');
  await page.fill('input[name="packages.0.items.0.quantity"]', '1');
  // UPS 서비스 티어 (Saver)
  const tierSel = page.locator('select:visible').filter({ has: page.locator('option:has-text("Saver")') }).first();
  if (await tierSel.count()) await tierSel.selectOption({ index: 2 });
  await page.waitForTimeout(1000);
}

async function selectChinaAndState(page: any, stateLabel: string | null) {
  const countrySel = page.locator('select:visible').nth(1);
  await countrySel.selectOption({ label: 'China' });
  await page.waitForTimeout(1200);
  if (stateLabel) {
    const stateSel = page.locator('select:visible').nth(2);
    await stateSel.selectOption({ label: stateLabel });
    await page.waitForTimeout(2000);
  }
}

async function getEstimateError(page: any): Promise<string | null> {
  const body = await page.textContent('body');
  if (!body) return null;
  const m = body.match(/목적지 국가\([^)]*\)에 매핑된 Zone이 없습니다/);
  return m ? m[0] : null;
}

async function getEstimatePrice(page: any): Promise<number | null> {
  // UPS 예상운임 표시 (SHIPMENT SUMMARY 우측)
  const body = await page.textContent('body');
  if (!body) return null;
  const m = body.match(/UPS 예상운임([\s\S]*?)([₩$]?\s?[\d,]+\.?\d*)/);
  return m ? Number(m[2].replace(/[₩$,\s]/g, '')) : null;
}

test.describe('TASK-B-272 R-10: 중국 목적지 UPS 예상운임 (CNS/CNN) + 성 필수 검증', () => {
  test.beforeAll(async () => { await ensureDir(); });

  test('중국 + Guangdong(남부) → 예상운임 정상 계산(에러 없음), 성 미선택 제출 → 차단', async ({ page }) => {
    test.setTimeout(180000);

    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.waitForLoadState('networkidle');

    // 1) 중국 + Guangdong → 정상 계산 (Zone10, 에러 없음)
    await gotoOrderForm(page);
    await selectChinaAndState(page, 'Guangdong');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_china_guangdong_estimate.png'), fullPage: true });
    const errGD = await getEstimateError(page);
    const priceGD = await getEstimatePrice(page);
    console.log('Guangdong: error=', errGD, 'price=', priceGD);
    expect(errGD).toBeNull();
    expect(priceGD).not.toBeNull();
    expect(priceGD!).toBeGreaterThan(0);

    // 2) 중국 + Beijing(목록 외) → 정상 계산 (Zone1)
    await selectChinaAndState(page, 'Beijing');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_china_beijing_estimate.png'), fullPage: true });
    const errBJ = await getEstimateError(page);
    const priceBJ = await getEstimatePrice(page);
    console.log('Beijing: error=', errBJ, 'price=', priceBJ);
    expect(errBJ).toBeNull();
    expect(priceBJ).not.toBeNull();
    expect(priceBJ!).toBeGreaterThan(0);

    // 3) 중국 + 성 미선택 → "오더 등록" 제출 시 차단 (성 필수)
    await gotoOrderForm(page);
    await selectChinaAndState(page, null);
    await page.waitForTimeout(2000);
    const submitBtn = page.locator('button:has-text("오더 등록")').first();
    await submitBtn.click();
    await page.waitForTimeout(2500);
    const bodyAfter = await page.textContent('body');
    const hasBlock = /중국 배송은 지역|성\/직할시|recipient_state_province/i.test(bodyAfter || '');
    console.log('성 미선택 제출 차단 문구:', hasBlock);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_china_no_state_blocked.png'), fullPage: true });
    expect(hasBlock).toBe(true);
    // 오더 등록 실패 (URL이 /orders/new 유지)
    expect(page.url()).toContain('/orders/new');

    console.log('R-10 PASSED: 중국 GD/BJ 예상운임 정상 + 성 미선택 차단 확인');
  });
});
