import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// ─── TASK-B-270 / Issue #1039 / DEF-B-043 — R-10 실브라우저 검증 ─────────────
// AGENCY 역할로 /agency/ups-rates 진입 → Expedited 기준요금 12kg 행에서
// Zone1~10 전부 표시되는지 확인. 간헐적 버그이므로 새로고침 5회+ 반복 확인.

dotenv.config({ path: '.env.local' });

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_270_Result';
const AGENCY_EMAIL = 'r10_agency_270@zenith.kr';
const AGENCY_PASSWORD = 'password1234';

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

async function selectExpeditedAndCheck12kg(page: any, screenshotName: string): Promise<{ zonesAt12: number; summary: string }> {
  await page.goto('/ko/agency/ups-rates');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('select:has(option:has-text("UPS WorldWide Express Expedited"))', { timeout: 30000 });
  const productSelect = page.locator('select').filter({ has: page.locator('option:has-text("UPS WorldWide Express Expedited")') }).first();
  const opt = await productSelect.locator('option:has-text("UPS WorldWide Express Expedited")').first().textContent();
  if (opt) await productSelect.selectOption({ label: opt.trim() });
  await page.waitForTimeout(6000);

  // 12kg 행 헤더 존재 확인
  const weight12 = page.locator('td:text-is("12kg")').first();
  await weight12.waitFor({ state: 'visible', timeout: 30000 });

  // 12kg 행 내 Zone 셀 수 확인 — Zone1~10 전부 표시되어야 10개
  const row = weight12.locator('xpath=..');
  const zoneCells = await row.locator('td').count();
  // 첫 td는 weight 라벨(12kg)이므로 Zone 셀 = 전체 td - 1
  const zonesAt12 = zoneCells - 1;

  const body = await page.textContent('body');
  const summaryMatch = (body || '').match(/총 (\d+)건 기준요금/);
  const summary = summaryMatch ? summaryMatch[0] : '없음';
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, screenshotName), fullPage: true });
  return { zonesAt12, summary };
}

test.describe('TASK-B-270 R-10: Expedited 12kg Zone1~10 렌더링 (새로고침 5회+)', () => {
  test.beforeAll(async () => { await ensureDir(); });

  test('AGENCY 로그인 → Expedited 기준요금 12kg 행 Zone 전부 표시 확인 × 5회', async ({ page }) => {
    test.setTimeout(180000);

    await loginAs(page, AGENCY_EMAIL, AGENCY_PASSWORD);
    await page.waitForLoadState('networkidle');

    let allOk = true;
    for (let i = 1; i <= 5; i++) {
      const { zonesAt12, summary } = await selectExpeditedAndCheck12kg(page, `0${i}_expedited_12kg_run${i}.png`);
      console.log(`run ${i}: 12kg Zone 셀=${zonesAt12} / ${summary}`);
      if (zonesAt12 < 10) {
        allOk = false;
        console.log(`run ${i} FAIL: Zone 셀 ${zonesAt12}개 (10개 기대)`);
      }
    }

    expect(allOk).toBe(true);
    console.log('R-10 PASSED: Expedited 12kg Zone1~10 전부 표시 (5회 반복 모두 정상)');
  });
});
