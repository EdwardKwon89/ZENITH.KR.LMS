import { test, expect } from '@playwright/test';
import { getServiceClient } from './test-utils';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_16_Result';
const SHIPPER_EMAIL = 'shipper@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';
const MANAGER_EMAIL = 'manager@zenith.kr';
const MANAGER_PASSWORD = 'password1234';

test.describe('E2E-16: 창고 통합 플로우 (입고·출고·특수화물)', () => {
  let supabase: ReturnType<typeof getServiceClient>;
  let shipperUserId: string | null = null;
  let managerUserId: string | null = null;

  test.beforeAll(async () => {
    // Ensure screenshot directory exists
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    // Initialize Supabase admin client
    supabase = getServiceClient();

    // Ensure test shipper account exists (CORPORATE role for order creation)
    const { data: existingShipper } = await supabase
      .from('zen_profiles')
      .select('id, role')
      .eq('email', SHIPPER_EMAIL)
      .maybeSingle();

    if (!existingShipper) {
      const { data: signUp } = await supabase.auth.admin.createUser({
        email: SHIPPER_EMAIL,
        password: SHIPPER_PASSWORD,
        email_confirm: true,
      });
      if (signUp?.user) {
        await supabase.from('zen_profiles').upsert({
          id: signUp.user.id,
          email: SHIPPER_EMAIL,
          full_name: 'E2E16 Test Shipper',
          role: 'CORPORATE', // Can create orders
          status: 'ACTIVE',
          grade_code: 'IRON',
        });
        shipperUserId = signUp.user.id;
      }
    } else {
      shipperUserId = existingShipper.id;
      // Ensure ACTIVE and correct role
      await supabase
        .from('zen_profiles')
        .update({ status: 'ACTIVE', role: 'CORPORATE' })
        .eq('id', shipperUserId);
    }

    // Ensure test manager account exists (MANAGER role for warehouse operations)
    const { data: existingManager } = await supabase
      .from('zen_profiles')
      .select('id, role')
      .eq('email', MANAGER_EMAIL)
      .maybeSingle();

    if (!existingManager) {
      const { data: signUp } = await supabase.auth.admin.createUser({
        email: MANAGER_EMAIL,
        password: MANAGER_PASSWORD,
        email_confirm: true,
      });
      if (signUp?.user) {
        await supabase.from('zen_profiles').upsert({
          id: signUp.user.id,
          email: MANAGER_EMAIL,
          full_name: 'E2E16 Test Manager',
          role: 'MANAGER', // Can process warehouse
          status: 'ACTIVE',
          grade_code: 'IRON',
        });
        managerUserId = signUp.user.id;
      }
    } else {
      managerUserId = existingManager.id;
      // Ensure ACTIVE and correct role
      await supabase
        .from('zen_profiles')
        .update({ status: 'ACTIVE', role: 'MANAGER' })
        .eq('id', managerUserId);
    }
  });

  test('시나리오 A: 특수화물 오더 등록 → 입고 처리', async ({ page }) => {
    test.setTimeout(120000);

    // Console logs redirect
    page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    try {
      // 1. SHIPPER 로그인
      console.log('1. SHIPPER Login...');
      await page.goto('/ko/login');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[name="email"]', SHIPPER_EMAIL);
      await page.fill('input[name="password"]', SHIPPER_PASSWORD);
      await Promise.all([
        page.waitForURL(/.*(dashboard|orders)/, { timeout: 30000 }),
        page.click('button[data-action="login"]')
      ]);
      console.log('SHIPPER Login successful.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_shipper_login_success.png') });

      // 2. 특수화물 오더 등록
      console.log('2. 특수화물 오더 등록 시작...');
      await page.goto('/ko/orders/new');
      await page.waitForLoadState('domcontentloaded');

      // 특수화물 타입 선택 - 버튼 클릭으로 변경
      console.log('특수화물 타입 DANGEROUS 선택');
      const dangerousButton = page.locator('button:has-text("위험물"), button:has-text("DANGEROUS")');
      await expect(dangerousButton).toBeVisible();
      await dangerousButton.click();
      
      // 기본 오더 정보 입력 (간소화)
      await page.fill('input[placeholder="상품명"]', 'Test Dangerous Goods');
      await page.fill('input[placeholder="수량"]', '1');
      await page.fill('input[placeholder="중량 (kg)"]', '10');
      await page.fill('input[placeholder="가로 (cm)"]', '10');
      await page.fill('input[placeholder="세로 (cm)"]', '10');
      await page.fill('input[placeholder="높이 (cm)"]', '10');
      
      // 오더 생성
      await page.click('button:has-text("오더 생성")');
      await expect(page.locator('text=오더가 성공적으로 생성되었습니다.')).toBeVisible({ timeout: 15000 });
      
      // 오더 번호 추출
      const orderNumberElement = page.locator('text=오더 번호:').first();
      const orderNumberText = await orderNumberElement.textContent();
      const orderNumber = orderNumberText?.split(':')[1].trim() || 'UNKNOWN';
      console.log(`Generated Order Number: ${orderNumber}`);
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_order_created.png') });

      // 3. MANAGER 로그인 (컨텍스트 변경)
      console.log('3. MANAGER Login...');
      await page.context().clearCookies();
      await page.goto('/ko/login');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[name="email"]', MANAGER_EMAIL);
      await page.fill('input[name="password"]', MANAGER_PASSWORD);
      await Promise.all([
        page.waitForURL(/.*(dashboard|orders)/, { timeout: 30000 }),
        page.click('button[data-action="login"]')
      ]);
      console.log('MANAGER Login successful.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_manager_login_success.png') });

      // 4. 입고 처리 화면 이동
      console.log('4. 입고 처리 화면 이동...');
      await page.goto('/ko/warehouse/inbound');
      await page.waitForLoadState('domcontentloaded');
      // Check for the form or a known element instead of exact h1 text
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_inbound_page.png') });

      // 5. 오더 검색 및 입고 처리
      console.log('5. 오더 검색 및 입고 처리...');
      const searchInput = page.locator('input[placeholder*="Order No"], input[placeholder*="오더 번호"]');
      await expect(searchInput).toBeVisible();
      await searchInput.fill(orderNumber);
      await page.keyboard.press('Enter');
      
      // 오더 행 찾기
      const orderRow = page.locator(`tr:has-text("${orderNumber}")`);
      await expect(orderRow).toBeVisible({ timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_order_found.png') });

      // 특수화물 타입 확인
      const specialCargoCell = orderRow.locator('td').nth(2); // Assuming special cargo is in column 2
      const specialCargoText = await specialCargoCell.textContent();
      expect(specialCargoText?.trim()).toBe('DANGEROUS');
      console.log(`Special cargo type verified: ${specialCargoText}`);

      // 검수 '정상' 선택 및 입고 확정 - 라디오 버튼으로 변경
      console.log('검수 "정상" 선택 및 입고 확정...');
      const normalRadio = orderRow.locator('input[type="radio"][value="NORMAL"]');
      await expect(normalRadio).toBeVisible();
      await normalRadio.check();
      
      const confirmButton = orderRow.locator('button:has-text("입고 확정"), button:has-text("Confirm Inbound")');
      await expect(confirmButton).toBeVisible();
      await confirmButton.click();
      
      await expect(page.locator('text=입고가 성공적으로 처리되었습니다.')).toBeVisible({ timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_inbound_confirmed.png') });

      // 6. 오더 상태 WAREHOUSED 전이 확인
      console.log('6. 오더 상태 WAREHOUSED 전이 확인...');
      await page.waitForTimeout(2000); // 상태 전이 대기
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const updatedOrderRow = page.locator(`tr:has-text("${orderNumber}")`);
      const statusCell = updatedOrderRow.locator('td').nth(3); // Assuming status is in column 3
      const statusText = await statusCell.textContent();
      expect(statusText?.trim()).toMatch(/WAREHOUSED|입고완료/);
      console.log(`Order status updated to: ${statusText}`);

      // 7. zen_last_activity 쿠키 존재 확인
      console.log('7. zen_last_activity 쿠키 존재 확인...');
      const cookies = await page.context().cookies();
      const lastActivityCookie = cookies.find(cookie => cookie.name === 'zen_last_activity');
      expect(lastActivityCookie).toBeTruthy();
      console.log('zen_last_activity cookie verified:', lastActivityCookie?.value);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_flow_completed.png') });
      console.log('시나리오 A PASSED: 특수화물 오더 등록 → 입고 처리');
    } catch (err) {
      console.error('Test A failed! Capturing failure_diagnostic.png');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'failure_diagnostic_a.png') });
      throw err;
    }
  });

  test('시나리오 B: 출고 처리 + 운송장 PDF 생성', async ({ page }) => {
    test.setTimeout(120000);

    // Console logs redirect
    page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    try {
      // 1. MANAGER 로그인
      console.log('1. MANAGER Login...');
      await page.context().clearCookies();
      await page.goto('/ko/login');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[name="email"]', MANAGER_EMAIL);
      await page.fill('input[name="password"]', MANAGER_PASSWORD);
      await Promise.all([
        page.waitForURL(/.*(dashboard|orders)/, { timeout: 30000 }),
        page.click('button[data-action="login"]')
      ]);
      console.log('MANAGER Login successful.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_manager_login_success_b.png') });

      // 2. 출고 처리 화면 이동
      console.log('2. 출고 처리 화면 이동...');
      await page.goto('/ko/warehouse/outbound');
      await page.waitForLoadState('domcontentloaded');
      // Check for the form or a known element instead of exact h1 text
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_outbound_page.png') });

      // 3. WAREHOUSED 상태 오더 검색
      console.log('3. WAREHOUSED 상태 오더 검색...');
      // First, try to filter by WAREHOUSED status if possible
      const statusFilter = page.locator('select[name*="status"], select[name*="상태"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('WAREHOUSED');
      }
      
      const searchInput = page.locator('input[placeholder*="Order No"], input[placeholder*="오더 번호"]');
      await expect(searchInput).toBeVisible();
      
      // Wait for table to load
      await page.waitForTimeout(2000);
      
      // Find the first WAREHOUSED order
      const firstWarehousedRow = page.locator('tr:has-text("WAREHOUSED"), tr:has-text("입고완료")').first();
      await expect(firstWarehousedRow).toBeVisible({ timeout: 15000 });
      
      const orderNumberElementB = firstWarehousedRow.locator('td').nth(0); // Assuming first column is order number
      const orderNumberB = await orderNumberElementB.textContent();
      console.log(`Selected Order Number for outbound: ${orderNumberB?.trim()}`);
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_warehoused_order_selected.png') });

      // 4. 출고 처리
      console.log('4. 출고 처리...');
      const outboundButton = firstWarehousedRow.locator('button:has-text("출고 처리"), button:has-text("Process Outbound")');
      await expect(outboundButton).toBeVisible();
      await outboundButton.click();
      
      await expect(page.locator('text=출고가 성공적으로 처리되었습니다.')).toBeVisible({ timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_outbound_processed.png') });

      // 5. 오더 상태 RELEASED 전이 확인
      console.log('5. 오더 상태 RELEASED 전이 확인...');
      await page.waitForTimeout(2000); // 상태 전이 대기
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const updatedOrderRowB = page.locator(`tr:has-text("${orderNumberB?.trim()}")`);
      const statusCellB = updatedOrderRowB.locator('td').nth(2); // Assuming status column
      const statusTextB = await statusCellB.textContent();
      expect(statusTextB?.trim()).toMatch(/RELEASED|출고완료/);
      console.log(`Order status updated to: ${statusTextB}`);

      // 6. 운송장 PDF 다운로드 트리거 확인
      console.log('6. 운송장 PDF 다운로드 트리거 확인...');
      const pdfButton = updatedOrderRowB.locator('button:has-text("PDF"), button:has-text("운송장"), a:has-text("PDF")');
      await expect(pdfButton).toBeVisible();
      
      // PDF 다운로드 시작
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        pdfButton.click()
      ]);
      
      const suggestedFilename = download.suggestedFilename();
      console.log(`PDF download suggested filename: ${suggestedFilename}`);
      
      // UUID 형식 파일명 검증 (예: 123e4567-e89b-12d3-a456-426614174000.pdf)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;
      expect(suggestedFilename).toMatch(uuidPattern);
      console.log(`PDF filename UUID format verified: ${suggestedFilename}`);
      
      // 다운로드 완료 대기
      const pdfPath = path.join(SCREENSHOT_DIR, suggestedFilename);
      await download.saveAs(pdfPath);
      expect(fs.existsSync(pdfPath)).toBeTruthy();
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_pdf_download_triggered.png') });
      console.log('시나리오 B PASSED: 출고 처리 + 운송장 PDF 생성');
    } catch (err) {
      console.error('Test B failed! Capturing failure_diagnostic.png');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'failure_diagnostic_b.png') });
      throw err;
    }
  });
});