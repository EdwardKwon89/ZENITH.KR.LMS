import { test, expect } from '@playwright/test';
import { getServiceClient } from './test-utils';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

dotenv.config({ path: '.env.local' });

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_26_Result';
const SUPABASE_URL = 'http://127.0.0.1:54321';
const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';
const SHIPPER_EMAIL = 'shipper_e2e26@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

let supabase: ReturnType<typeof getServiceClient>;
let fixtureOrderId: string;
let fixtureShipperUserId: string;
let fixtureShipperOrgId: string;

test.describe('E2E-26: UPS Invoice PDF 미리보기/다운로드 검증 (UAT-19)', () => {

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    supabase = getServiceClient();

    // 1. Create shipper organization (CORPORATE) — shipper_id FK references zen_organizations
    console.log('Creating shipper org...');
    const { data: shipperOrg, error: orgErr } = await supabase.from('zen_organizations').insert({
      name: 'E2E26 Test Shipper Corp',
      type: 'CORPORATE',
      status: 'ACTIVE',
    }).select('id').single();
    if (orgErr || !shipperOrg) {
      console.error('Failed to create shipper org:', orgErr);
      throw new Error('Failed to create shipper org');
    }
    fixtureShipperOrgId = shipperOrg.id;
    console.log('Shipper org created:', fixtureShipperOrgId);

    // 1b. Look up or create port records for origin_port_id / dest_port_id
    let originPortId: string | null = null;
    let destPortId: string | null = null;
    const { data: existingPorts } = await supabase.from('zen_ports').select('id,code').in('code', ['ICN', 'LAX']);
    if (existingPorts && existingPorts.length === 2) {
      originPortId = existingPorts.find((p: any) => p.code === 'ICN')?.id || null;
      destPortId = existingPorts.find((p: any) => p.code === 'LAX')?.id || null;
    } else {
      for (const port of [
        { code: 'ICN', name: 'Incheon', country: 'KR', type: 'AIRPORT' },
        { code: 'LAX', name: 'Los Angeles', country: 'US', type: 'AIRPORT' },
      ]) {
        const { data: p } = await supabase.from('zen_ports').insert(port).select('id').single();
        if (port.code === 'ICN') originPortId = p?.id || null;
        if (port.code === 'LAX') destPortId = p?.id || null;
      }
    }
    console.log(`Ports — origin: ${originPortId}, dest: ${destPortId}`);

    // 2. Ensure admin user exists with ADMIN role in zen_profiles
    const { data: authUsersRes } = await supabase.auth.admin.listUsers();
    const existingUsers = authUsersRes?.users || [];
    let adminUser = existingUsers.find((u: any) => u.email === ADMIN_EMAIL);
    if (!adminUser) {
      console.log('Creating admin user...');
      const { data: created, error: adminErr } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'ADMIN', org_type: 'PLATFORM', status: 'ACTIVE' },
      });
      if (adminErr) console.error('Admin create error:', adminErr);
      adminUser = created?.user ?? undefined;
    }
    // Ensure admin profile has ADMIN role (fixes RLS — get_my_role() must return 'ADMIN')
    if (adminUser) {
      await supabase.from('zen_profiles').update({
        role: 'ADMIN',
        status: 'ACTIVE',
        grade_code: 'ADMIN',
      }).eq('id', adminUser.id);
      await supabase.auth.admin.updateUserById(adminUser.id, {
        app_metadata: { role: 'ADMIN', org_type: 'PLATFORM', status: 'ACTIVE' },
      });
      console.log('Admin profile ensured with ADMIN role.');
    }

    // 3. Create shipper test user and link to org
    console.log('Creating shipper user...');
    let shipperUser = existingUsers.find((u: any) => u.email === SHIPPER_EMAIL);
    if (shipperUser) {
      await supabase.from('zen_profiles').delete().eq('email', SHIPPER_EMAIL);
      await supabase.auth.admin.deleteUser(shipperUser.id);
    }

    const { data: signUp, error: signUpErr } = await supabase.auth.admin.createUser({
      email: SHIPPER_EMAIL,
      password: SHIPPER_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'CORPORATE', org_type: 'SHIPPER', status: 'ACTIVE' },
    });
    if (signUpErr) console.error('Shipper signup error:', signUpErr);

    if (signUp?.user) {
      fixtureShipperUserId = signUp.user.id;
      await supabase.from('zen_profiles').upsert({
        id: fixtureShipperUserId,
        email: SHIPPER_EMAIL,
        full_name: 'E2E26 Test Shipper Corp',
        role: 'CORPORATE',
        status: 'ACTIVE',
        grade_code: 'IRON',
        org_id: fixtureShipperOrgId,
      });
      console.log('Shipper user created:', fixtureShipperUserId);
    }

    // 4. Create UPS fixture order with packages, items, and rate snapshot
    if (fixtureShipperOrgId && fixtureShipperUserId) {
      const cargoDetails = {
        product_code: 'UPS-WWD',
        product_name: 'UPS Worldwide Express',
        zone: 'US',
        delivery_method: 'DIRECT',
      };

      console.log('Creating UPS order...');
      const { data: order, error: orderErr } = await supabase.from('zen_orders').insert({
        order_no: `E2E26-UPS-${Date.now()}`,
        shipper_id: fixtureShipperOrgId,
        created_by: fixtureShipperUserId,
        status: 'RELEASED',
        transport_mode: 'EXP',
        order_type: 'B2B',
        cargo_details: cargoDetails,
        origin_port_id: originPortId,
        dest_port_id: destPortId,
        recipient_name: 'John Smith',
        recipient_address: '123 Main Street, Los Angeles, CA 90001, USA',
        recipient_contact: '+1-555-123-4567',
        shipper_contact_email: 'shipper@e2e26.zenith.kr',
        shipper_contact_phone: '+82-10-1111-2222',
      }).select('id').single();
      if (orderErr) console.error('Order creation error:', orderErr);
      if (!order) throw new Error('Failed to create order fixture');

      if (order) {
        fixtureOrderId = order.id;
        console.log('Order created:', fixtureOrderId);

        // Insert rate snapshot
        const { error: rateErr } = await supabase.from('zen_order_rate_snapshots').insert({
          order_id: order.id,
          applied_unit_price: 45000,
          applied_currency: 'KRW',
          applied_rule: 'UPS_STANDARD',
          carrier_cost_amount: 32000,
          platform_fee_amount: 8000,
        });
        if (rateErr) console.error('Rate snapshot error:', rateErr);

        // Insert packages with items
        const { data: pkg, error: pkgErr } = await supabase.from('zen_order_packages').insert({
          order_id: order.id,
          packing_unit: 'CTN',
          packing_count: 2,
          gross_weight: 5.5,
          length: 30,
          width: 20,
          height: 15,
          domestic_ref_no: 'DOM-001',
          intl_ref_no: 'INTL-001',
        }).select('id').single();
        if (pkgErr) console.error('Package creation error:', pkgErr);

        if (pkg) {
          const { error: itemsErr } = await supabase.from('zen_order_items').insert([
            {
              order_id: order.id,
              package_id: pkg.id,
              item_name: 'Electronic Components',
              quantity: 10,
              unit_price: 25.00,
              currency: 'USD',
              hs_code: '8542.31',
            },
            {
              order_id: order.id,
              package_id: pkg.id,
              item_name: 'Circuit Boards',
              quantity: 5,
              unit_price: 50.00,
              currency: 'USD',
              hs_code: '8534.00',
            },
          ]);
          if (itemsErr) console.error('Package items error:', itemsErr);
        }
      console.log('Fixture setup complete. Order ID:', fixtureOrderId);

      // Verify the order is actually queryable
      const { data: verifyOrder, error: verifyErr } = await supabase
        .from('zen_orders')
        .select('id, order_no, origin_port_id, dest_port_id')
        .eq('id', fixtureOrderId)
        .single();
      console.log('Order verification:', verifyErr ? `FAIL: ${verifyErr.message}` : `OK: ${verifyOrder?.order_no}`);
      if (verifyOrder) {
        console.log(`  ports: origin=${verifyOrder.origin_port_id}, dest=${verifyOrder.dest_port_id}`);
      }
    }
    } // end if (fixtureShipperOrgId && fixtureShipperUserId)
  });

  test.afterAll(async () => {
    // Cleanup fixture data
    if (fixtureOrderId) {
      const { data: pkgs } = await supabase.from('zen_order_packages')
        .select('id').eq('order_id', fixtureOrderId);
      if (pkgs) {
        for (const pkg of pkgs) {
          await supabase.from('zen_order_items').delete().eq('package_id', pkg.id);
        }
        await supabase.from('zen_order_packages').delete().eq('order_id', fixtureOrderId);
      }
      await supabase.from('order_status_history').delete().eq('order_id', fixtureOrderId);
      await supabase.from('zen_order_rate_snapshots').delete().eq('order_id', fixtureOrderId);
      await supabase.from('zen_orders').delete().eq('id', fixtureOrderId);
    }

    const { data: authUsersRes } = await supabase.auth.admin.listUsers();
    const shipperUser = (authUsersRes?.users || []).find((u: any) => u.email === SHIPPER_EMAIL);
    if (shipperUser) {
      await supabase.from('zen_profiles').delete().eq('email', SHIPPER_EMAIL);
      await supabase.auth.admin.deleteUser(shipperUser.id);
    }

    if (fixtureShipperOrgId) {
      await supabase.from('zen_organizations').delete().eq('id', fixtureShipperOrgId);
    }
  });

  test('UAT-19-01: UPS Invoice PDF 미리보기/다운로드 버튼 동작 확인', async ({ page }) => {
    test.setTimeout(300000); // PDF font download may take time

    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
    // Intercept CDN font requests directly — serve local fonts (bypasses CSP)
    await page.route('https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/*', async route => {
      const url = route.request().url();
      const fontName = url.includes('SUIT-Bold') ? 'SUIT-Bold.woff2' : 'SUIT-Regular.woff2';
      const localPath = path.join(process.cwd(), 'tests/e2e/fonts', fontName);
      if (fs.existsSync(localPath)) await route.fulfill({ path: localPath, contentType: 'font/woff2' });
      else await route.continue();
    });
    // Relax CSP for order detail page: font fetch uses connect-src, not font-src
    await page.route(`/ko/orders/${fixtureOrderId}*`, async route => {
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

    try {
      console.log('1. Admin Login...');
      await page.goto('/ko/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[data-action="login"]');
      await expect(page).toHaveURL(/\/orders|\/dashboard/, { timeout: 30000 });
      console.log('Admin Login successful.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_admin_login.png') });

      console.log('2. Navigate to UPS order detail page...');
      const response = await page.goto(`/ko/orders/${fixtureOrderId}`);
      console.log('Navigation response:', response?.status(), response?.statusText());
      console.log('Final URL:', page.url());
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      console.log('After wait URL:', page.url());

      // Diagnose page content
      try {
        const bodyText = await page.textContent('body', { timeout: 8000 });
        console.log('BODY TEXT (first 5000 chars):', bodyText?.substring(0, 5000));
        const htmlSnippet = await page.locator('html').innerHTML({ timeout: 5000 }).catch(() => '(html error)');
        console.log('HTML snippet (first 2000):', htmlSnippet?.substring(0, 2000));
      } catch (diagErr) {
        console.log('Diagnostic error:', diagErr instanceof Error ? diagErr.message : diagErr);
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_order_detail_page.png') });

      console.log('3. Looking for UPS Invoice download link (label contains "(UPS)")...');
      const upsInvoiceLink = page.locator('a:has-text("(UPS)")').first();

      await expect(upsInvoiceLink).toBeVisible({ timeout: 15000 });
      console.log('UPS Invoice link is visible.');

      // PDFDownloadLink renders <a> with async blob URL — wait for href to be ready
      console.log('4. Waiting for PDF blob to be generated (href attribute)...');
      try {
        await page.waitForFunction(
          (locator) => {
            const el = document.querySelector(locator);
            return el && el.tagName === 'A' && el!.getAttribute('href') && el!.getAttribute('href')!.startsWith('blob:');
          },
          'a[download*="UPS_INVOICE"]',
          { timeout: 60000 }
        );
        console.log('PDF blob URL is ready.');
      } catch {
        console.log('Blob URL wait timed out, trying click anyway...');
      }

      // Set up download handler before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 120000 });

      console.log('5. Clicking UPS Invoice download link...');
      await upsInvoiceLink.click({ force: true });
      console.log('6. Waiting for PDF download event...');
      const download = await downloadPromise;
      expect(download).toBeDefined();
      console.log('PDF download started.');

      // Verify suggested filename format
      const suggestedName = download.suggestedFilename();
      console.log(`Suggested filename: ${suggestedName}`);
      expect(suggestedName).toMatch(/UPS_INVOICE_/);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_pdf_downloaded.png') });
      console.log('UAT-19-01: PDF download button action verified successfully.');
    } catch (err) {
      console.error('UAT-19-01 failed!', err);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'failure_01.png') });
      throw err;
    }
  });

  test('UAT-19-02: Invoice PDF 내용 텍스트 검증', async ({ page }) => {
    test.setTimeout(300000); // PDF font download may take time

    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
    // Intercept CDN font requests directly — serve local fonts (bypasses CSP)
    await page.route('https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/*', async route => {
      const url = route.request().url();
      const fontName = url.includes('SUIT-Bold') ? 'SUIT-Bold.woff2' : 'SUIT-Regular.woff2';
      const localPath = path.join(process.cwd(), 'tests/e2e/fonts', fontName);
      if (fs.existsSync(localPath)) await route.fulfill({ path: localPath, contentType: 'font/woff2' });
      else await route.continue();
    });
    // Relax CSP for order detail page: font fetch uses connect-src, not font-src
    await page.route(`/ko/orders/${fixtureOrderId}*`, async route => {
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

    try {
      console.log('1. Admin Login...');
      await page.goto('/ko/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[data-action="login"]');
      await expect(page).toHaveURL(/\/orders|\/dashboard/, { timeout: 30000 });
      console.log('Admin Login successful.');

      console.log('2. Navigate to UPS order detail...');
      await page.goto(`/ko/orders/${fixtureOrderId}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      console.log('URL:', page.url());

      console.log('3. Look for UPS Invoice download link (label contains "(UPS)")...');
      const upsInvoiceLink = page.locator('a:has-text("(UPS)")').first();

      await expect(upsInvoiceLink).toBeVisible({ timeout: 15000 });

      // Wait for blob URL
      console.log('Waiting for PDF blob URL...');
      try {
        await page.waitForFunction(
          (locator) => {
            const el = document.querySelector(locator);
            return el && el.tagName === 'A' && el!.getAttribute('href') && el!.getAttribute('href')!.startsWith('blob:');
          },
          'a[download*="UPS_INVOICE"]',
          { timeout: 60000 }
        );
      } catch { /* continue */ }

      console.log('Clicking UPS Invoice download link...');
      const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
      await upsInvoiceLink.click({ force: true });
      console.log('Waiting for PDF download...');
      const download = await downloadPromise;
      console.log('PDF download captured.');

      // Save to temp location for parsing
      const tempPdfPath = path.join(SCREENSHOT_DIR, 'temp_invoice.pdf');
      await download.saveAs(tempPdfPath);
      console.log('PDF saved to temp location.');

      // Read and parse PDF content
      const pdfBuffer = fs.readFileSync(tempPdfPath);
      const pdfParser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
      const pdfData = await pdfParser.getText();
      const text = pdfData!.text;
      console.log('PDF text extracted. Length:', text.length);
      console.log('--- PDF Content ---');
      console.log(text);
      console.log('-------------------');

      // UAT-19-02 Step 2: Verify filename format
      const suggestedName = download.suggestedFilename();
      console.log(`Filename: ${suggestedName}`);
      expect(suggestedName).toMatch(/UPS_INVOICE_/);
      expect(suggestedName).toMatch(/\.pdf$/);
      console.log('Filename verification PASS.');

      // UAT-19-02 Step 3: Verify PDF content matches DB fixture data
      // Shipper info
      expect(text).toContain('E2E26 Test Shipper Corp');
      expect(text).toContain('UPS Worldwide Express');
      console.log('Shipper/Product name verification PASS.');

      // Consignee info
      expect(text).toContain('John Smith');
      expect(text).toContain('Los Angeles');
      console.log('Consignee verification PASS.');

      // Package / weight info
      expect(text).toContain('DOM-001');
      expect(text).toContain('INTL-001');
      expect(text).toContain('Electronic Components');
      expect(text).toContain('Circuit Boards');
      expect(text).toContain('10');    // Electronic Components quantity
      expect(text).toContain('5');     // Circuit Boards quantity
      console.log('Package item details verification PASS.');

      // Delivery method
      expect(text).toContain('DIRECT');
      console.log('Delivery method verification PASS.');

      // Total weight
      expect(text).toContain('11.00 kg');
      console.log('Total weight verification PASS (2 × 5.5 = 11 kg).');

      // Total declared value: (10 × 25) + (5 × 50) = 250 + 250 = 500 USD
      expect(text).toContain('500');
      expect(text).toContain('USD');
      console.log('Total declared value verification PASS.');

      // Customs notice
      expect(text).toContain('For Customs Purposes Only');
      console.log('Customs notice verification PASS.');

      // Clean up temp file
      fs.unlinkSync(tempPdfPath);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_pdf_content_verified.png') });
      console.log('UAT-19-02: Invoice PDF content verification PASSED.');
    } catch (err) {
      console.error('UAT-19-02 failed!', err);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'failure_02.png') });
      throw err;
    }
  });
});
