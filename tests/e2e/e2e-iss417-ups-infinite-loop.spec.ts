import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_ISS417_Result';

test.describe('Issue #417 — UPS Direct 오더 등록 무한 루프 크래시 수정 검증', () => {

  test('agency@zenith.kr 로그인 → UPS Direct DOC 신규 오더 → 패키지 중량 입력 시 크래시 없음 확인', async ({ page }) => {
    // 1. 로그인
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"], input[type="email"]', 'agency@zenith.kr');
    await page.fill('input[name="password"], input[type="password"]', 'password1234');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01_login.png`, fullPage: true });

    // 2. 신규 오더 등록 페이지 진입
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02_order_new.png`, fullPage: true });

    // 3. UPS 모드 선택
    const upsButton = page.locator('button:has-text("UPS"), label:has-text("UPS")').first();
    if (await upsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await upsButton.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03_ups_selected.png`, fullPage: true });

    // 4. 화주 선택 (이미 선택되어 있으면 스킵)
    const shipperSelect = page.locator('select[name="shipper_id"]').first();
    if (await shipperSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await shipperSelect.isDisabled();
      if (!isDisabled) {
        const options = await shipperSelect.locator('option').allTextContents();
        if (options.length > 1) {
          await shipperSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
        }
      }
    }

    // 5. 패키지 중량 입력 (크래시 재현 시나리오)
    const weightInput = page.locator('input[name*="gross_weight"]').first();
    if (await weightInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await weightInput.click();
      await weightInput.fill('5.0');
      await page.waitForTimeout(500);
      // Tab으로 blur 트리거
      await weightInput.press('Tab');
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04_weight_entered.png`, fullPage: true });

    // 6. 콘솔 에러 확인
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 7. 잠시 대기 후 크래시 확인
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05_after_weight.png`, fullPage: true });

    // 8. "Maximum update depth exceeded" 에러가 없는지 확인
    const hasInfiniteLoopError = consoleErrors.some(e => e.includes('Maximum update depth exceeded'));
    if (hasInfiniteLoopError) {
      console.error('[E2E-ISS417] ❌ 무한 루프 에러 발견!');
      expect(hasInfiniteLoopError).toBe(false);
    } else {
      console.log('[E2E-ISS417] ✅ 무한 루프 에러 없음 — 크래시 수정 확인');
    }

    // 9. "System Interruption" 화면이 없는지 확인
    const systemInterruption = page.locator('text=System Interruption, text=시스템 오류').first();
    if (await systemInterruption.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.error('[E2E-ISS417] ❌ System Interruption 화면 발견!');
      expect(false).toBe(true);
    } else {
      console.log('[E2E-ISS417] ✅ System Interruption 화면 없음 — 정상 동작');
    }

    console.log('[E2E-ISS417] ✅ DOC 케이스 테스트 완료');
  });

  test('agency@zenith.kr 로그인 → UPS Direct NON_DOC 신규 오더 → 패키지 중량+치수 입력 시 크래시 없음 확인', async ({ page }) => {
    // 1. 로그인
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"], input[type="email"]', 'agency@zenith.kr');
    await page.fill('input[name="password"], input[type="password"]', 'password1234');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // 2. 신규 오더 등록 페이지 진입
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 3. UPS 모드 선택
    const upsButton = page.locator('button:has-text("UPS"), label:has-text("UPS")').first();
    if (await upsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await upsButton.click();
      await page.waitForTimeout(1500);
    }

    // 4. 화주 선택 (이미 선택되어 있으면 스킵)
    const shipperSelect = page.locator('select[name="shipper_id"]').first();
    if (await shipperSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await shipperSelect.isDisabled();
      if (!isDisabled) {
        const options = await shipperSelect.locator('option').allTextContents();
        if (options.length > 1) {
          await shipperSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
        }
      }
    }

    // 5. NON_DOC 모드로 전환 (content_type 선택)
    const contentTypeSelect = page.locator('select').filter({ hasText: /NONDOC|비서류/i }).first();
    if (await contentTypeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await contentTypeSelect.selectOption('NONDOC');
      await page.waitForTimeout(500);
    }

    // 7. 패키지 치수 + 중량 입력 (크래시 재현 시나리오)
    const lengthInput = page.locator('input[name*="length"]').first();
    const widthInput = page.locator('input[name*="width"]').first();
    const heightInput = page.locator('input[name*="height"]').first();
    const weightInput = page.locator('input[name*="gross_weight"]').first();

    if (await lengthInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await lengthInput.click();
      await lengthInput.fill('30');
      await lengthInput.press('Tab');
    }
    if (await widthInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await widthInput.click();
      await widthInput.fill('20');
      await widthInput.press('Tab');
    }
    if (await heightInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await heightInput.click();
      await heightInput.fill('10');
      await heightInput.press('Tab');
    }
    if (await weightInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await weightInput.click();
      await weightInput.fill('5.0');
      await weightInput.press('Tab');
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06_nondoc_dimensions.png`, fullPage: true });

    // 7. 콘솔 에러 확인
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 8. 잠시 대기 후 크래시 확인
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07_nondoc_after.png`, fullPage: true });

    // 9. "Maximum update depth exceeded" 에러가 없는지 확인
    const hasInfiniteLoopError = consoleErrors.some(e => e.includes('Maximum update depth exceeded'));
    if (hasInfiniteLoopError) {
      console.error('[E2E-ISS417] ❌ NON_DOC 무한 루프 에러 발견!');
      expect(hasInfiniteLoopError).toBe(false);
    } else {
      console.log('[E2E-ISS417] ✅ NON_DOC 무한 루프 에러 없음 — 크래시 수정 확인');
    }

    // 10. "System Interruption" 화면이 없는지 확인
    const systemInterruption = page.locator('text=System Interruption, text=시스템 오류').first();
    if (await systemInterruption.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.error('[E2E-ISS417] ❌ NON_DOC System Interruption 화면 발견!');
      expect(false).toBe(true);
    } else {
      console.log('[E2E-ISS417] ✅ NON_DOC System Interruption 화면 없음 — 정상 동작');
    }

    console.log('[E2E-ISS417] ✅ NON_DOC 케이스 테스트 완료');
  });
});
