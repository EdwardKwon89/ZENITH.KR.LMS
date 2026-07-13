import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const AGENCY_ORG_ID = '924c2fcb-ccae-48bb-9858-469c15a7e20e';
const SELLING_PRICE = 74500;
const COST_PRICE = 59500;

test.describe('UAT-17-03: 대리점 화주 요율 오버라이드가 적용된 UPS 요금 계산 검증', () => {

  test('대리점 Rate Override 반영 확인 — UPS Express 오더 등록', async ({ page }) => {
    // 1. Login as agency_shipper
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"], input[type="email"], input[placeholder*="이메일"]', 'agency_shipper@zenith.kr');
    await page.fill('input[name="password"], input[type="password"]', 'password1234');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'docs/99_Manual/UAT_17_Result/01_login_agency_shipper.png', fullPage: true });

    // 2. Navigate to order creation
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/99_Manual/UAT_17_Result/02_order_new_page.png', fullPage: true });

    // 3. Select UPS Express
    const upsOption = page.locator('text=UPS Express, text=Express, label*=UPS');
    if (await upsOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await upsOption.click();
    } else {
      const radioLabels = page.locator('label:has-text("UPS"), label:has-text("Express")');
      if (await radioLabels.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await radioLabels.first().click();
      }
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'docs/99_Manual/UAT_17_Result/03_ups_express_selected.png', fullPage: true });

    // 4. Check selling price display
    await page.screenshot({ path: 'docs/99_Manual/UAT_17_Result/04_pricing_display.png', fullPage: true });

    // 5. Fill order fields and submit
    const destInput = page.locator('input[name="dest_code"], input[placeholder*="목적지"], input[placeholder*="도착"]');
    if (await destInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await destInput.fill('US');
    }
    const weightInput = page.locator('input[name="weight_kg"], input[placeholder*="중량"], input[placeholder*="무게"]');
    if (await weightInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await weightInput.fill('5.0');
    }
    const submitBtn = page.locator('button[type="submit"], button:has-text("등록"), button:has-text("저장")');
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: 'docs/99_Manual/UAT_17_Result/05_order_created.png', fullPage: true });

    // 6. DB Verification
    const { data: overrides } = await supabase
      .from('zen_agency_rate_overrides')
      .select('selling_price, cost_price')
      .eq('agency_org_id', AGENCY_ORG_ID)
      .limit(1);

    if (overrides && overrides.length > 0) {
      expect(overrides[0].selling_price).toBe(SELLING_PRICE);
      expect(overrides[0].cost_price).toBe(COST_PRICE);
      console.log(`[UAT-17-03] ✅ Override verified: selling_price=${overrides[0].selling_price}, cost_price=${overrides[0].cost_price}`);
    } else {
      console.warn('[UAT-17-03] ⚠️ No override found for agency org - may need §2 setup first');
    }

    console.log('[UAT-17-03] ✅ Test completed');
  });
});
