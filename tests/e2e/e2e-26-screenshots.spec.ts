import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_26_Result';
const SUPABASE_URL = 'http://127.0.0.1:54321';
const MANAGER_EMAIL = 'manager@zenith.kr';
const MANAGER_PASSWORD = 'password1234';

test('TASK-B-024: UPS 레이블 UI 3종 스크린샷', async ({ page }) => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  const { data: warehousedOrders } = await supabase
    .from('zen_orders')
    .select('id')
    .eq('status', 'WAREHOUSED')
    .limit(1);
  const testOrderId = warehousedOrders?.[0]?.id;
  if (!testOrderId) throw new Error('No WAREHOUSED order found');

  await supabase.from('zen_ups_labels').delete().eq('order_id', testOrderId);
  await supabase.from('zen_order_packages')
    .update({ intl_ref_locked: false, intl_ref_no: null, intl_ref_issued_at: null })
    .eq('order_id', testOrderId);

  await page.goto('/ko/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', MANAGER_EMAIL);
  await page.fill('input[name="password"]', MANAGER_PASSWORD);
  await page.click('button[data-action="login"]');
  await expect(page).toHaveURL(/\/warehouse|\/orders/, { timeout: 30000 });

  await page.goto('/ko/warehouse/outbound');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('UPS 미발급').first()).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_ups_label_not_issued.png'), fullPage: false });

  const { data: whPackages } = await supabase
    .from('zen_order_packages')
    .select('id, order_id')
    .eq('order_id', testOrderId)
    .limit(1);
  const pkg = whPackages?.[0];
  if (pkg) {
    await supabase
      .from('zen_order_packages')
      .update({ intl_ref_locked: true, intl_ref_no: '1Z999AA10123456784', intl_ref_issued_at: new Date().toISOString() })
      .eq('id', pkg.id);
  }

  await page.goto('/ko/warehouse/outbound?t=' + Date.now());
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('UPS 발급 완료').first()).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_ups_label_issued.png'), fullPage: false });

  if (pkg) {
    await supabase.from('zen_ups_labels').insert({
      order_id: pkg.order_id,
      package_id: pkg.id,
      reference_no: pkg.id,
      tracking_number: '1Z999AA10123456784',
      label_format: 'PDF',
      storage_path: '/tmp/test-label.pdf',
      is_voided: false,
      generated_by: 'f442a60b-f1ef-403c-bf85-f1037c9f4030',
    });
  }

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const voidBtn = page.getByRole('button', { name: '폐기' }).first();
  await expect(voidBtn).toBeVisible({ timeout: 15000 });
  await voidBtn.click();

  await expect(page.getByText('UPS 레이블 폐기').first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_void_confirm_dialog.png'), fullPage: false });
});
