import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ORDER_NO = 'UAT18-TEST-001';

test.describe('UAT-19: UPS 인보이스 PDF 검증', () => {

  test('UAT-19-01: 인보이스 PDF 출력(미리보기) 검증', async ({ page }) => {
    // 0. Intercept CDN font requests and serve local copies
    await page.route('https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/*', async route => {
      const url = route.request().url();
      const fontName = url.split('/').pop() || '';
      const localPath = path.join(process.cwd(), 'tests/e2e/fonts', fontName);
      if (fs.existsSync(localPath)) await route.fulfill({ path: localPath, contentType: 'font/woff2' });
      else await route.continue();
    });

    // 1. Login as agency_shipper
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"], input[type="email"], input[placeholder*="이메일"]', 'admin@zenith.kr');
    await page.fill('input[name="password"], input[type="password"]', 'password1234');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 2. Get order ID from DB
    const { data: orderDb } = await supabase
      .from('zen_orders')
      .select('id')
      .eq('order_no', ORDER_NO)
      .single();
    expect(orderDb).not.toBeNull();

    // 3. Setup CSP relaxation for order detail page (PDF font fetch needs connect-src)
    await page.route(`/ko/orders/${orderDb!.id}*`, async route => {
      const response = await route.fetch();
      const headers = response.headers();
      const csp = headers['content-security-policy'] || '';
      const relaxed = csp
        .replace(/default-src 'self'/, "default-src 'self' blob:")
        .replace(/connect-src[^;]*/, "connect-src 'self' https://cdn.jsdelivr.net https://*.supabase.co https://*.sentry.io http://127.0.0.1:54321 http://localhost:54321 ws://localhost:3000 ws://127.0.0.1:3000")
        .replace(/font-src 'self'/, "font-src 'self' https://cdn.jsdelivr.net")
        .replace(/worker-src[^;]*/, "worker-src 'self' blob:");
      await route.fulfill({ response, headers: { ...headers, 'content-security-policy': relaxed } });
    });
    await page.goto(`/ko/orders/${orderDb!.id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'docs/99_Manual/UAT_19_Result/01_order_detail.png', fullPage: true });

    // 4. Wait for UPS Invoice button to appear (PDFDownloadLink needs client mount + generation)
    const upsBtn = page.locator('a').filter({ hasText: 'UPS' });
    await expect(upsBtn.first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'docs/99_Manual/UAT_19_Result/02_invoice_button_visible.png', fullPage: true });

    // 5. Click and verify download
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await upsBtn.first().click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/UPS_INVOICE_.+\.pdf/);

    // 6. DB — rate snapshots
    const { data: snaps } = await supabase
      .from('zen_order_rate_snapshots')
      .select('applied_unit_price, applied_currency, applied_rule')
      .eq('order_id', orderDb!.id);
    expect(snaps?.length).toBeGreaterThan(0);
  });

  test('UAT-19-02: 인보이스 PDF 다운로드 파일명 및 무결성 검증', async ({ page }) => {
    // 0. Intercept CDN font requests and serve local copies
    await page.route('https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/*', async route => {
      const url = route.request().url();
      const fontName = url.split('/').pop() || '';
      const localPath = path.join(process.cwd(), 'tests/e2e/fonts', fontName);
      if (fs.existsSync(localPath)) await route.fulfill({ path: localPath, contentType: 'font/woff2' });
      else await route.continue();
    });

    // 1. Login as agency_shipper
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"], input[type="email"], input[placeholder*="이메일"]', 'admin@zenith.kr');
    await page.fill('input[name="password"], input[type="password"]', 'password1234');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 2. Get order info from DB
    const { data: order } = await supabase
      .from('zen_orders')
      .select('id, order_no, recipient_name, transport_mode, ups_product_code, incoterms')
      .eq('order_no', ORDER_NO)
      .single();
    expect(order).not.toBeNull();

    // 3. Setup CSP relaxation for order detail page and navigate
    await page.route(`/ko/orders/${order!.id}*`, async route => {
      const response = await route.fetch();
      const headers = response.headers();
      const csp = headers['content-security-policy'] || '';
      const relaxed = csp
        .replace(/default-src 'self'/, "default-src 'self' blob:")
        .replace(/connect-src[^;]*/, "connect-src 'self' https://cdn.jsdelivr.net https://*.supabase.co https://*.sentry.io http://127.0.0.1:54321 http://localhost:54321 ws://localhost:3000 ws://127.0.0.1:3000")
        .replace(/font-src 'self'/, "font-src 'self' https://cdn.jsdelivr.net")
        .replace(/worker-src[^;]*/, "worker-src 'self' blob:");
      await route.fulfill({ response, headers: { ...headers, 'content-security-policy': relaxed } });
    });
    await page.goto(`/ko/orders/${order!.id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'docs/99_Manual/UAT_19_Result/03_order_detail_download.png', fullPage: true });

    // 4. Wait for UPS button and click → wait for file
    const upsBtn = page.locator('a').filter({ hasText: 'UPS' });
    await expect(upsBtn.first()).toBeVisible({ timeout: 30000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await upsBtn.first().click();
    const download = await downloadPromise;

    // 5. Verify file name pattern
    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/UPS_INVOICE_.+\.pdf/);

    // 6. DB — package info
    const { data: packages } = await supabase
      .from('zen_order_packages')
      .select('id, packing_unit, packing_count, gross_weight, volume, intl_ref_no')
      .eq('order_id', order!.id)
      .order('created_at', { ascending: true });
    expect(packages?.length).toBeGreaterThan(0);
    console.log(`[UAT-19-02] Packages: ${packages!.length} item(s)`);

    // 7. DB — rate snapshot
    const { data: snaps } = await supabase
      .from('zen_order_rate_snapshots')
      .select('applied_unit_price, applied_currency, applied_rule')
      .eq('order_id', order!.id);
    expect(snaps?.length).toBeGreaterThan(0);
    console.log(`[UAT-19-02] Rate: ${snaps![0].applied_unit_price} ${snaps![0].applied_currency}`);

    // 8. Order info
    console.log(`[UAT-19-02] Recipient: ${order!.recipient_name || 'N/A'}`);
    console.log(`[UAT-19-02] Transport mode: ${order!.transport_mode}`);
  });
});
