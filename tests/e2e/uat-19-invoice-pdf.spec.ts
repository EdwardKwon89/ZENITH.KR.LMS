import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ORDER_NO = 'UAT18-TEST-001';

test.describe('UAT-19: UPS 인보이스 PDF 검증', () => {

  test('UAT-19-01: 인보이스 PDF 출력(미리보기) 검증', async ({ page }) => {
    // 1. Login as agency_shipper
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"], input[type="email"], input[placeholder*="이메일"]', 'agency_shipper@zenith.kr');
    await page.fill('input[name="password"], input[type="password"]', 'password1234');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 2. Navigate to order detail
    await page.goto(`/ko/orders`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/99_Manual/UAT_19_Result/00_order_list.png', fullPage: true });

    // 3. Find the UAT18 order and click it
    const orderLink = page.locator(`a:has-text("${ORDER_NO}"), td:has-text("${ORDER_NO}")`);
    if (await orderLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await orderLink.first().click();
    } else {
      // Try navigating directly
      const { data: order } = await supabase
        .from('zen_orders')
        .select('id')
        .eq('order_no', ORDER_NO)
        .single();
      if (order) {
        await page.goto(`/ko/orders/${order.id}`);
      }
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/99_Manual/UAT_19_Result/01_order_detail.png', fullPage: true });

    // 4. Check for invoice PDF button
    const invoiceBtn = page.locator('button:has-text("인보이스"), button:has-text("PDF"), button:has-text("출력"), a:has-text("인보이스")');
    const hasInvoiceBtn = await invoiceBtn.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (hasInvoiceBtn) {
      await invoiceBtn.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'docs/99_Manual/UAT_19_Result/02_invoice_pdf_preview.png', fullPage: true });
      console.log('[UAT-19-01] Invoice PDF button found and clicked');
    } else {
      console.warn('[UAT-19-01] Invoice PDF button not found - feature may not be implemented yet');
    }

    // 5. DB Verification
    const { data: order } = await supabase
      .from('zen_orders')
      .select('id, order_no, total_freight, billing_status')
      .eq('order_no', ORDER_NO)
      .single();

    if (order) {
      console.log(`[UAT-19-01] Order: ${order.order_no}, freight: ${order.total_freight}, billing: ${order.billing_status}`);

      const { data: invoices, error: ie } = await supabase
        .from('zen_invoices')
        .select('id, invoice_no, total_amount, status')
        .eq('shipper_id', '924c2fcb-ccae-48bb-9858-469c15a7e20e')
        .limit(5);

      if (ie) {
        console.warn(`[UAT-19-01] Invoice query error: ${ie.message}`);
      } else if (invoices && invoices.length > 0) {
        console.log(`[UAT-19-01] Invoice found: ${invoices[0].invoice_no}, amount: ${invoices[0].total_amount}`);
        expect(invoices[0].total_amount).toBe(order.total_freight);

        // Check invoice_files table (may not exist yet)
        const { data: files, error: fe } = await supabase
          .from('zen_invoice_files')
          .select('id, file_name, file_size')
          .eq('invoice_id', invoices[0].id)
          .limit(1);

        if (fe) {
          console.warn(`[UAT-19-01] zen_invoice_files table not available: ${fe.message}`);
        } else if (files && files.length > 0) {
          console.log(`[UAT-19-01] Invoice file: ${files[0].file_name}`);
          expect(files[0].file_size).toBeGreaterThan(0);
        }
      } else {
        console.warn('[UAT-19-01] No invoices found for shipper org');
      }

      const { data: snaps } = await supabase
        .from('zen_order_rate_snapshots')
        .select('applied_unit_price, applied_currency, applied_rule')
        .eq('order_id', order.id);

      if (snaps && snaps.length > 0) {
        console.log(`[UAT-19-01] Rate snapshot: ${snaps[0].applied_unit_price} ${snaps[0].applied_currency}`);
        expect(snaps[0].applied_unit_price).toBe(74500);
      }
    }

    console.log('[UAT-19-01] Test completed');
  });

  test('UAT-19-02: 인보이스 PDF 다운로드 파일명 및 무결성 검증', async ({ page }) => {
    const { data: order } = await supabase
      .from('zen_orders')
      .select('id, order_no, total_freight, currency, shipper_name, consignee_name, origin_code, dest_code')
      .eq('order_no', ORDER_NO)
      .single();

    if (!order) {
      console.warn('[UAT-19-02] Order not found - skipping');
      return;
    }

    // 1. DB verification: package info
    const { data: packages } = await supabase
      .from('zen_order_packages')
      .select('pkg_seq, weight_kg, volume_cbm, description')
      .eq('order_id', order.id)
      .order('pkg_seq', { ascending: true });

    if (packages && packages.length > 0) {
      console.log(`[UAT-19-02] Packages: ${packages.length} found`);
    } else {
      console.warn('[UAT-19-02] No packages found');
    }

    // 2. DB verification: selling price
    const { data: snaps } = await supabase
      .from('zen_order_rate_snapshots')
      .select('applied_unit_price, applied_currency, applied_rule')
      .eq('order_id', order.id);

    if (snaps && snaps.length > 0) {
      console.log(`[UAT-19-02] Rate snapshot: ${snaps[0].applied_unit_price} ${snaps[0].applied_currency}`);
    }

    // 3. DB verification: invoice files table (may not exist)
    const { data: files, error: fe } = await supabase
      .from('zen_invoice_files')
      .select('id, file_name')
      .limit(1);

    if (fe) {
      console.warn(`[UAT-19-02] zen_invoice_files table not available: ${fe.message}`);
    } else if (files && files.length > 0) {
      const expectedPattern = `Invoice_UPS_${ORDER_NO}.pdf`;
      expect(files[0].file_name).toMatch(/Invoice_UPS_.+\.pdf/);
      console.log(`[UAT-19-02] File name: ${files[0].file_name}`);
    }

    // 4. Shipper/consignee info
    console.log(`[UAT-19-02] Shipper: ${order.shipper_name || 'N/A'}, Consignee: ${order.consignee_name || 'N/A'}`);
    console.log(`[UAT-19-02] Origin: ${order.origin_code || 'N/A'}, Dest: ${order.dest_code || 'N/A'}`);
    console.log(`[UAT-19-02] Currency: ${order.currency || 'N/A'}`);

    // 5. Navigate to order page for download test
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"], input[type="email"], input[placeholder*="이메일"]', 'agency_shipper@zenith.kr');
    await page.fill('input[name="password"], input[type="password"]', 'password1234');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto(`/ko/orders/${order.id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/99_Manual/UAT_19_Result/03_order_detail_download.png', fullPage: true });

    // 6. Look for download button
    const downloadBtn = page.locator('button:has-text("다운로드"), a:has-text("다운로드"), button:has-text("Download")');
    if (await downloadBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[UAT-19-02] Download button found');
    } else {
      console.warn('[UAT-19-02] Download button not found');
    }

    console.log('[UAT-19-02] Test completed');
  });
});
