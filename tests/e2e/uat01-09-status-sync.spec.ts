import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000/ko';

test.describe('UAT-01-09: SUSPENDED 계정 접근 차단', () => {
  const ADMIN_EMAIL = 'admin@zenith.kr';
  const ADMIN_PW = 'password1234';
  const TARGET_EMAIL = 'shipper@zenith.kr';
  const TARGET_PW = 'password1234';

  test('STEP 2: ADMIN 로그인 → 회원 관리 → SHIPPER 정지 → DB+JWT 동기화', async ({ page }) => {
    // 1. Admin 로그인
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PW);
    await page.click('button[type="submit"]');
    await page.waitForURL(/orders|dashboard/, { timeout: 15000 });

    // 2. 회원 관리 페이지
    await page.goto(`${BASE}/admin/members`);
    await page.waitForSelector('table');

    // 3. 검색
    await page.fill('input[placeholder*="검색"]', TARGET_EMAIL);
    await page.waitForTimeout(500);

    // 4. 정지 버튼
    const suspendBtn = page.getByRole('button', { name: '정지' }).first();
    await expect(suspendBtn).toBeVisible({ timeout: 5000 });

    // 5. confirm → 수락
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('이용 제한');
      await dialog.accept();
    });
    await suspendBtn.click();
    await page.waitForTimeout(1000);

    // 6. "해제" 버튼 확인 (정지 후에는 해제 버튼이 나타남)
    const reactivateBtn = page.getByRole('button', { name: '해제' }).first();
    await expect(reactivateBtn).toBeVisible({ timeout: 5000 });
  });

  test('STEP 3: SUSPENDED 계정 로그인 차단', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', TARGET_EMAIL);
    await page.fill('input[name="password"]', TARGET_PW);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // SUSPENDED → /ko/suspended 페이지로 리디렉션되어야 함 (또는 login 페이지에 에러 표시)
    await expect(page).toHaveURL(/suspended|login/);
  });

  test('STEP 4: 재활성화 → 로그인 가능', async ({ page }) => {
    // Admin 로그인
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PW);
    await page.click('button[type="submit"]');
    await page.waitForURL(/orders|dashboard/, { timeout: 15000 });

    // 회원 관리 페이지 → 검색 → 해제
    await page.goto(`${BASE}/admin/members`);
    await page.waitForSelector('table');
    await page.fill('input[placeholder*="검색"]', TARGET_EMAIL);
    await page.waitForTimeout(500);

    // 해제 버튼
    const reactivateBtn = page.getByRole('button', { name: '해제' }).first();
    await expect(reactivateBtn).toBeVisible({ timeout: 5000 });

    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('해제');
      await dialog.accept();
    });
    await reactivateBtn.click();
    await page.waitForTimeout(1000);

    // 정지 버튼으로 돌아왔는지 확인 (재활성화 성공)
    const suspendBtn = page.getByRole('button', { name: '정지' }).first();
    await expect(suspendBtn).toBeVisible({ timeout: 5000 });

    // 로그인
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', TARGET_EMAIL);
    await page.fill('input[name="password"]', TARGET_PW);
    await page.click('button[type="submit"]');
    await page.waitForURL(/orders|dashboard/, { timeout: 15000 });
    await expect(page).toHaveURL(/orders|dashboard/);
  });
});
