import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// ─── TASK-B-268 / Issue #1034 / DEF-B-041 — R-10 실브라우저 검증 ─────────────
// AGENCY 역할로 /agency/ups-rates 진입 → Express NON_DOC 기준요금에서
// 20.0kg 행까지 렌더링되는지 확인 (수정 전: PostgREST 1,000행 제한으로 12kg에서 끊김).

dotenv.config({ path: '.env.local' });

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_268_Result';
const AGENCY_EMAIL = 'r10_agency_268@zenith.kr';
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

test.describe('TASK-B-268 R-10: AGENCY 기준요금 20kg 행 렌더링 검증', () => {
  test.beforeAll(async () => { await ensureDir(); });

  test('AGENCY 로그인 → /agency/ups-rates → Express NON_DOC 기준요금 20.0kg 행 표시', async ({ page }) => {
    test.setTimeout(120000);
    page.on('console', msg => { if (msg.type() === 'error') console.log(`[PAGE][error] ${msg.text()}`); });

    await loginAs(page, AGENCY_EMAIL, AGENCY_PASSWORD);
    await page.waitForLoadState('networkidle');

    await page.goto('/ko/agency/ups-rates');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_agency_ups_rates.png'), fullPage: true });

    // 기준요금 탭(기본) + 제품 select에서 Express NON_DOC(UPS WorldWide Express (비서류)) 선택
    await page.waitForSelector('select:has(option:has-text("UPS WorldWide Express (비서류)"))', { timeout: 30000 });
    const productSelect = page.locator('select').filter({ has: page.locator('option:has-text("UPS WorldWide Express (비서류)")') }).first();
    const exprOption = await productSelect.locator('option:has-text("UPS WorldWide Express (비서류)")').first().textContent();
    if (exprOption) {
      await productSelect.selectOption({ label: exprOption.trim() });
    }
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_express_nondoc_selected.png'), fullPage: true });

    // 20.0kg 행 존재 확인 — 매트릭스 weight 행 헤더가 "{w}kg" 형식으로 렌더링된다
    // 수정 전: PostgREST 1,000행 제한으로 Express NON_DOC 0.5~12kg만 렌더링(24행) → 20kg 행 없음
    const weightHeader20 = page.locator('td:text-is("20kg")').first();
    await weightHeader20.waitFor({ state: 'visible', timeout: 30000 });
    console.log('20kg 행 헤더 렌더링 확인');

    // 요약 문구로 전체 행 수 확인 (Express NON_DOC 10 Zone × 40 weight = 400건)
    const summary = await page.textContent('body');
    const rowCountMatch = (summary || '').match(/총 (\d+)건 기준요금/);
    console.log('매트릭스 요약:', rowCountMatch ? rowCountMatch[0] : '없음');
    if (rowCountMatch) {
      const count = Number(rowCountMatch[1]);
      console.log('총 기준요금 수:', count);
      expect(count).toBeGreaterThan(100);
    }
    console.log('R-10 PASSED: Express NON_DOC 20kg 행 렌더링 확인');
  });
});
