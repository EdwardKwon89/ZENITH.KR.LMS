import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_ISS432_Result';

test.describe('Issue #432 — UPS Direct 1단계 직접 제출 검증', () => {

  test('UPS Direct → 전체 필드 입력 → "오더 등록" → 오더 생성 + DB 검증', async ({ page }) => {
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

    // 3. UPS Direct 선택
    const upsButton = page.locator('button:has-text("UPS Direct")').first();
    await upsButton.click();
    await page.waitForTimeout(1500);

    // 4. "오더 등록" 버튼 확인 (하드 assertion)
    const submitBtn = page.locator('button:has-text("오더 등록")').first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    // 5. "다음 단계" 버튼이 없는지 확인 (하드 assertion)
    const nextStepBtn = page.locator('button:has-text("다음 단계")').first();
    const hasNextStep = await nextStepBtn.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasNextStep).toBe(false);

    // 6. 수하인 정보 입력 — "수하인 정보" 탭 클릭
    await page.locator('button:has-text("수하인 정보")').click({ timeout: 5000 });
    await page.waitForTimeout(1500);

    // 수하인 필드에 값 입력 — Playwright fill + change 이벤트 트리거
    await page.fill('input[name="recipient_name"]', 'Test Recipient', { force: true });
    await page.fill('input[name="recipient_phone"]', '010-1234-5678', { force: true });
    await page.fill('input[name="recipient_address"]', '123 Test Street, Seoul, Korea', { force: true });
    await page.waitForTimeout(500);

    // 9. 패키지 중량 입력
    const weightInput = page.locator('input[name*="gross_weight"]').first();
    await weightInput.click();
    await weightInput.fill('3.0');
    await weightInput.press('Tab');
    await page.waitForTimeout(500);

    // 10. 품명 입력
    const itemNameInput = page.locator('input[name*="item_name"], input[placeholder*="품명"]').first();
    await itemNameInput.click();
    await itemNameInput.fill('UPS 테스트 상품');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01_form_filled.png`, fullPage: true });

    // 11. "오더 등록" 클릭
    await submitBtn.click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02_after_submit.png`, fullPage: true });

    // 12. 오더 생성 확인 (강화된 하드 assertion)
    const currentUrl = page.url();
    const hasOrderDetail = !currentUrl.includes('/orders/new') && /\/orders\/[0-9a-f-]{36}/i.test(currentUrl);
    const hasToast = await page.locator('text=오더가 성공적으로, text=Order No').first().isVisible({ timeout: 5000 }).catch(() => false);
    
    const orderCreated = hasOrderDetail || hasToast;
    expect(orderCreated).toBe(true);

    // 13. order_no 추출
    let orderId = '';
    if (hasOrderDetail) {
      const orderMatch = currentUrl.match(/\/orders\/([0-9a-f-]{36})/i);
      if (orderMatch) orderId = orderMatch[1];
    }
    if (!orderId && hasToast) {
      const toastText = await page.locator('text=Order No').first().textContent().catch(() => '');
      const noMatch = toastText?.match(/Order No:\s*(\S+)/);
      if (noMatch) orderId = noMatch[1];
    }
    console.log('[E2E-ISS432] ✅ 오더 생성 성공, orderId: ' + orderId);

    // 14. DB에서 estimated_cost 검증
    if (orderId) {
      const { data: order, error } = await supabase
        .from('zen_orders')
        .select('id, order_no, estimated_cost, transport_mode, ups_product_code')
        .eq('id', orderId)
        .single();

      expect(error).toBeNull();
      expect(order).not.toBeNull();
      expect(order!.transport_mode).toBe('UPS');
      expect(order!.estimated_cost).not.toBeNull();
      expect(Number(order!.estimated_cost)).toBeGreaterThan(0);
      console.log('[E2E-ISS432] ✅ DB 검증: estimated_cost=' + order!.estimated_cost + ', ups_product_code=' + order!.ups_product_code);

      // 테스트 정리
      await supabase.from('zen_orders').delete().eq('id', orderId);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03_order_detail.png`, fullPage: true });
    console.log('[E2E-ISS432] ✅ UPS Direct 테스트 완료');
  });

  test('항공 모드 → 1→2→3 흐름 확인', async ({ page }) => {
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"], input[type="email"]', 'agency@zenith.kr');
    await page.fill('input[name="password"], input[type="password"]', 'password1234');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    await page.goto('/ko/orders/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const airButton = page.locator('button:has-text("항공")').first();
    await airButton.click();
    await page.waitForTimeout(1000);

    const nextStepBtn = page.locator('button:has-text("다음 단계")').first();
    await expect(nextStepBtn).toBeVisible({ timeout: 5000 });

    const submitBtn = page.locator('button:has-text("오더 등록")').first();
    const hasSubmitBtn = await submitBtn.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasSubmitBtn).toBe(false);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04_air_mode.png`, fullPage: true });
    console.log('[E2E-ISS432] ✅ 항공 모드 테스트 완료');
  });
});
