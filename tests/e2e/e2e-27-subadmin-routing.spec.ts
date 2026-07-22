import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_27_Result';

const SUB_ADMIN_ROUTES = [
  { path: '/ko/admin/ups-rates', label: 'admin/ups-rates' },
  { path: '/ko/voc', label: 'voc' },
  { path: '/ko/support', label: 'support', redirectTo: '/ko/support/qna' },
  { path: '/ko/mypage', label: 'mypage' },
  { path: '/ko/address-book', label: 'address-book' },
];

const { mkdirSync } = require('fs');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe('TASK-200: SUB_ADMIN 5개 경로 접근 회귀 테스트 — proxy.ts 화이트리스트 버그 재발 방지', () => {

  test('sntl@zenith.kr(SUB_ADMIN)로 로그인 후 5개 경로 전부 정상 접속 확인', async ({ page }) => {
    // 1. 로그인
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01_login_page.png`, fullPage: true });
    await page.fill('input[name="email"]', 'sntl@zenith.kr');
    await page.fill('input[name="password"]', 'password1234');
    await page.click('button[data-action="login"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02_login_success.png`, fullPage: true });

    // 현재 URL이 로그인 페이지가 아닌지 확인
    expect(page.url()).not.toContain('/login');

    // 2. 각 경로 순회
    for (const route of SUB_ADMIN_ROUTES) {
      await test.step(route.label, async () => {
        await page.goto(route.path, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/03_${route.label.replace('/', '_')}.png`, fullPage: true });

        const currentUrl = page.url();
        // 공개 랜딩('/ko' 또는 '/en')으로 리다이렉트되지 않아야 함
        const isRedirectedToRoot = !currentUrl.includes(route.path);
        if (isRedirectedToRoot) {
          console.log(`[TASK-200] ❌ ${route.path} → 리다이렉트 감지: ${currentUrl}`);
        }
        expect(currentUrl).toContain(route.path);
        console.log(`[TASK-200] ✅ ${route.path} — 정상 접속: ${currentUrl}`);
      });
    }
  });
});
