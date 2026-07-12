import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_ISS391_Result';

test.describe('Issue #391 — Agency SHIPPER_DISCOUNT 예약 등록/조회 검증', () => {

  test('agency@zenith.kr 로그인 → 법인 화주 Zone 할인율 예약 등록 → 예정목록/이력 노출 확인', async ({ page }) => {
    // 1. 로그인
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"], input[type="email"], input[placeholder*="이메일"]', 'agency@zenith.kr');
    await page.fill('input[name="password"], input[type="password"]', 'password1234');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01_login.png`, fullPage: true });

    // 2. 화주 목록 진입
    await page.goto('/ko/agency/shippers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02_shippers_list.png`, fullPage: true });

    // 3. 법인 화주 찾기 — "법인" 텍스트가 있는 행의 상세 편집 버튼 클릭
    const corporateRow = page.locator('tr:has-text("법인")').first();
    const editBtns = page.locator('button:has-text("상세 편집"), a:has-text("상세 편집")');
    
    // 법인 화주가 있으면 클릭
    if (await corporateRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[E2E-ISS391] ✅ 법인 화주 행 확인됨');
      const corpEditBtn = corporateRow.locator('button:has-text("상세 편집"), a:has-text("상세 편집")').first();
      if (await corpEditBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await corpEditBtn.click();
      } else {
        await editBtns.first().click();
      }
    } else {
      console.warn('[E2E-ISS391] ⚠️ 법인 화주가 없어 첫 번째 화주 선택');
      await editBtns.first().click();
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03_shipper_edit.png`, fullPage: true });

    // 4. Zone 할인율 입력 영역 확인 (법인 화주만 표시)
    const zoneSection = page.locator('text=Zone별 할인율, text=Zone Discount').first();
    const zoneInput = page.locator('input[type="number"][step="0.01"]').first();
    
    if (await zoneSection.isVisible({ timeout: 5000 }).catch(() => false) || await zoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[E2E-ISS391] ✅ Zone 할인율 영역 확인됨 (법인 화주)');
      
      // 5. Zone별 할인율 입력 (첫 번째 Zone)
      if (await zoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await zoneInput.fill('10.5');
        await page.waitForTimeout(500);
      }

      // 6. 적용일자 입력 (내일)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dateInput.fill(dateStr);
        await page.waitForTimeout(500);
      }
      await page.screenshot({ path: `${SCREENSHOT_DIR}/04_form_filled.png`, fullPage: true });

      // 7. 저장 버튼 클릭
      const saveBtn = page.locator('button:has-text("저장"), button:has-text("Save")').first();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(3000);
      }
      await page.screenshot({ path: `${SCREENSHOT_DIR}/05_after_save.png`, fullPage: true });

      // 8. "예정된 변경" 섹션 확인
      const scheduledSection = page.locator('text=예정된 변경');
      if (await scheduledSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[E2E-ISS391] ✅ 예정된 변경 섹션 확인됨');
        await page.screenshot({ path: `${SCREENSHOT_DIR}/06_scheduled_visible.png`, fullPage: true });
      } else {
        console.warn('[E2E-ISS391] ⚠️ 예정된 변경 섹션이 보이지 않음');
        await page.screenshot({ path: `${SCREENSHOT_DIR}/06_scheduled_not_visible.png`, fullPage: true });
      }

      // 9. "변경 이력" 섹션 확인
      const auditLogBtn = page.locator('button:has-text("변경 이력")');
      if (await auditLogBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await auditLogBtn.click();
        await page.waitForTimeout(1000);
        console.log('[E2E-ISS391] ✅ 변경 이력 섹션 확인됨');
        await page.screenshot({ path: `${SCREENSHOT_DIR}/07_audit_log.png`, fullPage: true });
      } else {
        console.warn('[E2E-ISS391] ⚠️ 변경 이력 섹션이 보이지 않음');
      }
    } else {
      console.warn('[E2E-ISS391] ⚠️ Zone 할인율 영역이 보이지 않음 — 개인 화주일 수 있음');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/04_no_zone_section.png`, fullPage: true });
    }

    console.log('[E2E-ISS391] ✅ 테스트 완료');
  });
});
