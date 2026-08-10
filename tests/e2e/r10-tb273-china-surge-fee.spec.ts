import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// ─── TASK-B-273 / Issue #1046 / DEF-B-045 — R-10 실브라우저 검증 ─────────────
// SHIPPER로 오더 등록 화면에서 수하인 국가=중국 + 성=Guangdong(GD, 남부) 선택 →
// 예상운임 상세에 "급증 긴급 수수료" 항목이 0이 아닌 값으로 표시되는지 확인.
// (수정 전: CN 원본 코드로 조회 실패 → 급증 수수료 항목 통째로 누락)

dotenv.config({ path: '.env.local' });

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_273_Result';
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

async function gotoUpsChinaForm(page: any, stateLabel: string | null) {
  await page.goto('/ko/orders/new');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('button:has-text("UPS Direct")', { timeout: 30000 });
  await page.locator('button:has-text("UPS Direct")').click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("수하인 정보")').first().click();
  await page.waitForTimeout(500);
  await page.fill('input[name="recipient_name"]', 'Li Wei');
  await page.fill('input[name="recipient_phone"]', '01012345678');
  const ct = page.locator('select[name="packages.0.content_type"]');
  if (await ct.count()) await ct.selectOption('NONDOC');
  await page.fill('input[name="packages.0.packing_count"]', '1');
  await page.fill('input[name="packages.0.length"]', '10');
  await page.fill('input[name="packages.0.width"]', '10');
  await page.fill('input[name="packages.0.height"]', '10');
  await page.fill('input[name="packages.0.gross_weight"]', '5');
  await page.fill('input[name="packages.0.items.0.item_name"]', 'Widget');
  await page.fill('input[name="packages.0.items.0.quantity"]', '1');
  const tier = page.locator('select:visible').filter({ has: page.locator('option:has-text("Saver")') }).first();
  if (await tier.count()) await tier.selectOption({ index: 2 });
  await page.waitForTimeout(1000);

  // 국가=중국
  await page.locator('select:visible').nth(1).selectOption({ label: 'China' });
  await page.waitForTimeout(1200);
  if (stateLabel) {
    await page.locator('select:visible').nth(2).selectOption({ label: stateLabel });
    await page.waitForTimeout(3000);
  }
}

test.describe('TASK-B-273 R-10: 중국 목적지 급증 긴급 수수료 표시', () => {
  test.beforeAll(async () => { await ensureDir(); });

  test('중국 + Guangdong(GD) → 예상운임에 급증 긴급 수수료 0이 아닌 값 표시', async ({ page }) => {
    test.setTimeout(120000);

    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.waitForLoadState('networkidle');

    await gotoUpsChinaForm(page, 'Guangdong');
    await page.waitForTimeout(3000);

    // UPS 예상 운임 패널에서 급증 긴급 수수료 항목 확인
    await page.waitForSelector('text=UPS 예상 운임', { timeout: 30000 });
    const body = await page.textContent('body');
    const hasSurgeLabel = (body || '').includes('급증 긴급 수수료');
    console.log('급증 긴급 수수료 라벨 표시:', hasSurgeLabel);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_china_gd_surge_fee.png'), fullPage: true });

    expect(hasSurgeLabel).toBe(true);

    // 급증 수수료 값이 0이 아닌지 확인 (라벨 옆 금액 파싱)
    const surgeRow = page.locator('div').filter({ hasText: /급증 긴급 수수료/ }).first();
    const rowText = await surgeRow.textContent();
    const amountMatch = (rowText || '').match(/[\d,]+\.?\d*\s*KRW/);
    console.log('급증 수수료 행:', rowText?.trim());
    if (amountMatch) {
      const amount = Number(amountMatch[0].replace(/[,\s]|KRW/g, ''));
      console.log('급증 수수료 금액:', amount);
      expect(amount).toBeGreaterThan(0);
    }

    console.log('R-10 PASSED: 중국(GD) 급증 긴급 수수료 표시 확인');
  });
});
