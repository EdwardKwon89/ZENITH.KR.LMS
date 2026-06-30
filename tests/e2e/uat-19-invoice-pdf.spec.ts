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

    // NOTE(DEF-086/087): Invoice PDF button/table is not yet implemented by Team A.
    // Once DEF-086/087 are resolved, remove test.skip and uncomment the real test logic below.
    test.skip(true, 'DEF-086/087 미구현 — Team A 구현 후 활성화');

    // === Real test logic (activate when DEF-086/087 resolved) ===
    // // 4. Click 인보이스 PDF 출력 button
    // const invoiceBtn = page.locator('button:has-text("인보이스"), button:has-text("PDF"), button:has-text("출력")');
    // await expect(invoiceBtn.first()).toBeVisible({ timeout: 5000 });
    // await invoiceBtn.first().click();
    // await page.waitForTimeout(3000);
    // await page.screenshot({ path: 'docs/99_Manual/UAT_19_Result/02_invoice_pdf_preview.png', fullPage: true });
    //
    // // 5. DB — zen_invoice_files에 생성된 PDF 레코드 검증
    // const { data: order } = await supabase
    //   .from('zen_orders')
    //   .select('id, order_no, total_freight, billing_status')
    //   .eq('order_no', ORDER_NO)
    //   .single();
    // expect(order).not.toBeNull();
    //
    // const { data: invoices } = await supabase
    //   .from('zen_invoices')
    //   .select('id, invoice_no, total_amount, status')
    //   .eq('shipper_id', '924c2fcb-ccae-48bb-9858-469c15a7e20e')
    //   .limit(5);
    // expect(invoices?.length).toBeGreaterThan(0);
    // expect(invoices![0].total_amount).toBe(order!.total_freight);
    //
    // const { data: files } = await supabase
    //   .from('zen_invoice_files')
    //   .select('id, file_name, file_size')
    //   .eq('invoice_id', invoices![0].id)
    //   .limit(1);
    // expect(files?.length).toBe(1);
    // expect(files![0].file_size).toBeGreaterThan(0);
    //
    // // 6. Rate snapshot 검증
    // const { data: snaps } = await supabase
    //   .from('zen_order_rate_snapshots')
    //   .select('applied_unit_price, applied_currency, applied_rule')
    //   .eq('order_id', order!.id);
    // expect(snaps?.length).toBeGreaterThan(0);
    // expect(snaps![0].applied_unit_price).toBe(74500);
  });

  test('UAT-19-02: 인보이스 PDF 다운로드 파일명 및 무결성 검증', async ({ page }) => {
    // NOTE(DEF-086/087): Invoice PDF download is not yet implemented by Team A.
    // Once DEF-086/087 are resolved, remove test.skip and uncomment the real test logic below.
    test.skip(true, 'DEF-086/087 미구현 — Team A 구현 후 활성화');

    // === Real test logic (activate when DEF-086/087 resolved) ===
    // // 1. Login as agency_shipper
    // await page.goto('/ko/login');
    // await page.waitForLoadState('networkidle');
    // await page.fill('input[name="email"], input[type="email"], input[placeholder*="이메일"]', 'agency_shipper@zenith.kr');
    // await page.fill('input[name="password"], input[type="password"]', 'password1234');
    // await page.click('button[type="submit"]');
    // await page.waitForTimeout(2000);
    //
    // // 2. Navigate to order detail
    // const { data: order } = await supabase
    //   .from('zen_orders')
    //   .select('id, order_no, total_freight, currency, shipper_name, consignee_name, origin_code, dest_code')
    //   .eq('order_no', ORDER_NO)
    //   .single();
    // expect(order).not.toBeNull();
    //
    // await page.goto(`/ko/orders/${order!.id}`);
    // await page.waitForLoadState('networkidle');
    // await page.waitForTimeout(2000);
    // await page.screenshot({ path: 'docs/99_Manual/UAT_19_Result/03_order_detail_download.png', fullPage: true });
    //
    // // 3. Click download button → wait for file
    // const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    // const downloadBtn = page.locator('button:has-text("다운로드"), a:has-text("다운로드"), button:has-text("Download")');
    // await expect(downloadBtn.first()).toBeVisible({ timeout: 5000 });
    // await downloadBtn.first().click();
    // const download = await downloadPromise;
    //
    // // 4. Verify file name pattern
    // const fileName = download.suggestedFilename();
    // expect(fileName).toMatch(/Invoice_UPS_.+\.pdf/);
    //
    // // 5. DB — zen_invoice_files 적재 확인
    // const { data: files } = await supabase
    //   .from('zen_invoice_files')
    //   .select('id, file_name, file_size')
    //   .order('created_at', { ascending: false })
    //   .limit(1);
    // expect(files?.length).toBe(1);
    // // 기대 패턴: invoice_[오더번호]_[날짜].pdf
    // expect(files![0].file_name).toMatch(/Invoice_UPS_.+\.pdf/);
    //
    // // 6. DB — package info
    // const { data: packages } = await supabase
    //   .from('zen_order_packages')
    //   .select('pkg_seq, weight_kg, volume_cbm, description')
    //   .eq('order_id', order!.id)
    //   .order('pkg_seq', { ascending: true });
    // expect(packages?.length).toBeGreaterThan(0);
    //
    // // 7. DB — rate snapshot
    // const { data: snaps } = await supabase
    //   .from('zen_order_rate_snapshots')
    //   .select('applied_unit_price, applied_currency, applied_rule')
    //   .eq('order_id', order!.id);
    // expect(snaps?.length).toBeGreaterThan(0);
    // console.log(`[UAT-19-02] Rate: ${snaps![0].applied_unit_price} ${snaps![0].applied_currency}`);
    //
    // // 8. Shipper/consignee info
    // console.log(`[UAT-19-02] Shipper: ${order!.shipper_name || 'N/A'}, Consignee: ${order!.consignee_name || 'N/A'}`);
    // console.log(`[UAT-19-02] Origin: ${order!.origin_code || 'N/A'}, Dest: ${order!.dest_code || 'N/A'}`);
    // console.log(`[UAT-19-02] Currency: ${order!.currency || 'N/A'}`);
  });
});
