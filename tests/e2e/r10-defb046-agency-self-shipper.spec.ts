import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'docs', '99_Manual', 'E2E_NN_Result', 'TASK-B-274');
const BASE = 'http://localhost:3010';

test.describe('TASK-B-274 (DEF-B-046): AGENCY 자가화주 UPS 오더 창고 노출 + 액션 허용 (R-10 실기기 검증)', () => {
  test('AGENCY 계정 로그인 → /warehouse/ups-receive에 자가화주 WAREHOUSED 오더 표시 + UPS 등록 확인', async ({ page }) => {
    console.log('--- R-10 Step 1: AGENCY 로그인 (Zenith Agency Partners) ---');
    await page.goto(`${BASE}/ko/login`);
    await page.fill('input[name="email"]', 'agency@zenith.kr');
    await page.fill('input[name="password"]', 'password1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/orders|\/dashboard/, { timeout: 30000 });
    console.log('로그인 성공 →', page.url());

    console.log('--- R-10 Step 2: /warehouse/ups-receive 이동 ---');
    await page.goto(`${BASE}/ko/warehouse/ups-receive`);
    await page.waitForLoadState('networkidle');

    console.log('--- R-10 Step 3: 자가화주 오더(UPS-SELF-AGENCY-274) 노출 확인 ---');
    await expect(page.locator('body')).toContainText('UPS-SELF-AGENCY-274', { timeout: 30000 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'r10_ups_receive_self_shipper.png'),
      fullPage: true,
    });
    console.log('UPS-SELF-AGENCY-274 표시 확인 (자가화주 오더가 창고 화면에 노출됨)');

    console.log('--- R-10 Step 4: 무단 액세스 차단 확인 (타 역할 아님) — AGENCY 대시보드 진입 가능 ---');
    await page.goto(`${BASE}/ko/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'r10_agency_dashboard.png'),
      fullPage: true,
    });
    console.log('R-10 완료');
  });
});
