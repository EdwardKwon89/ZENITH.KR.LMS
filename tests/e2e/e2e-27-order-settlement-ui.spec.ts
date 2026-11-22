// TASK-B-369 (Issue #1425) — R-10 실구동: Admin 로그인 → S1 목록 → S2 정산/되돌리기.
// 서버 액션 mock 없이 실제 Next dev 서버 + 로컬 Supabase로 동작을 확인한다.
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import { getServiceClient } from './test-utils';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_27_Result';
// 전용 계정 — 공용 admin@zenith.kr(다른 E2E/개발) 삭제를 피한다.
const ADMIN_EMAIL = 'e2e27_admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';
const SHIPPER_ORG_ID = '36900000-0000-4000-8000-000000000002';
const ORDER_ID = '36900000-0000-4000-8000-000000000010';
const ORDER_NO = 'ZEN-369-E2E';

const supabase = getServiceClient();

async function cleanup() {
  await supabase.from('order_status_history').delete().eq('order_id', ORDER_ID);
  await supabase.from('zen_ups_actual_other_charges').delete().eq('order_id', ORDER_ID);
  await supabase.from('zen_ups_actual_cost').delete().eq('order_id', ORDER_ID);
  await supabase.from('zen_invoices').delete().like('invoice_no', 'INV-369-E2E%');
  await supabase.from('zen_orders').delete().eq('id', ORDER_ID);
  await supabase.from('zen_profiles').delete().eq('email', ADMIN_EMAIL);
  await supabase.from('zen_organizations').delete().eq('id', SHIPPER_ORG_ID);
  const { data: users } = await supabase.auth.admin.listUsers();
  const existing = users?.users?.find((u) => u.email === ADMIN_EMAIL);
  if (existing) await supabase.auth.admin.deleteUser(existing.id);
}

async function login(page: Page) {
  await page.goto('/ko/login');
  await page.fill('input#email', ADMIN_EMAIL);
  await page.fill('input#password', ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL(/.*(dashboard|orders|finance)/, { timeout: 30000 }),
    page.click('button[data-action="login"]'),
  ]);
}

test.describe('E2E-27: 오더정산 화면 (TASK-B-369)', () => {
  test.beforeAll(async () => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await cleanup();

    const { data: platformOrg } = await supabase
      .from('zen_organizations')
      .select('id')
      .eq('type', 'PLATFORM')
      .limit(1)
      .single();

    const { error: orgError } = await supabase
      .from('zen_organizations')
      .insert({ id: SHIPPER_ORG_ID, name: 'E2E27 Shipper', type: 'SHIPPER', status: 'ACTIVE' });
    if (orgError) throw new Error(`shipper org insert failed: ${orgError.message}`);

    const { data: created, error: userError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'E2E27 Admin' },
    });
    if (userError || !created.user) throw new Error(`admin user create failed: ${userError?.message}`);

    // auth.users 생성 트리거가 프로필을 만들 수 있으므로 upsert로 역할/조직을 보정한다.
    const { error: profileError } = await supabase.from('zen_profiles').upsert({
      id: created.user.id,
      org_id: platformOrg!.id,
      email: ADMIN_EMAIL,
      role: 'ADMIN',
      status: 'ACTIVE',
      full_name: 'E2E27 Admin',
    }, { onConflict: 'id' });
    if (profileError) throw new Error(`admin profile insert failed: ${profileError.message}`);

    const { error: orderError } = await supabase.from('zen_orders').insert({
      id: ORDER_ID,
      order_no: ORDER_NO,
      shipper_id: SHIPPER_ORG_ID,
      transport_mode: 'UPS',
      status: 'DELIVERED',
      recipient_name: 'E2E Recipient',
      recipient_phone: '01000000000',
      recipient_country_code: 'US',
      cargo_details: {},
      cost_settlement_status: 'NOT_SETTLED',
    });
    if (orderError) throw new Error(`order insert failed: ${orderError.message}`);

    const { error: historyError } = await supabase.from('order_status_history').insert({
      order_id: ORDER_ID,
      prev_status: 'IN_TRANSIT',
      next_status: 'DELIVERED',
      created_at: new Date().toISOString(),
    });
    if (historyError) throw new Error(`history insert failed: ${historyError.message}`);
  });

  test.afterAll(async () => {
    await cleanup();
  });

  test('S1 목록 → S2 저장 → 정산 완료 → 되돌리기', async ({ page }) => {
    test.setTimeout(180_000);

    await login(page);
    await page.goto('/ko/finance/order-settlement');
    await expect(page.getByRole('heading', { name: '오더정산' })).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/S1-목록.png`, fullPage: true });

    const row = page.getByRole('row', { name: new RegExp(ORDER_NO) });
    await expect(row).toBeVisible();
    await expect(row.getByText('미정산', { exact: true })).toBeVisible();
    await row.getByRole('link', { name: '정산' }).click();

    await expect(page).toHaveURL(new RegExp(`/ko/finance/order-settlement/${ORDER_ID}`), { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: new RegExp(ORDER_NO) })).toBeVisible();

    // S2 입력 → 저장
    await page.getByLabel('UPS 청구서번호').fill('E2E-UPS-369');
    await page.getByLabel('기본운임 (HKD)').fill('1000');
    await page.getByLabel('유류할증료 (HKD)').fill('300');
    await page.getByLabel('급증수수료 (HKD)').fill('50');
    await page.getByRole('button', { name: /임시저장/ }).click();
    await expect(page.getByText(/저장했습니다\. 원가 합계/)).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/S2-임시저장.png`, fullPage: true });

    // 정산 완료 확인 모달
    await page.getByRole('button', { name: /정산 완료/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/청구서 포함 전까지만 되돌릴 수 있습니다/)).toBeVisible();
    await dialog.getByRole('button', { name: '정산 완료' }).click();
    await expect(page.getByText('정산 완료 처리했습니다.')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('정산완료', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/S2-정산완료.png`, fullPage: true });

    // 되돌리기
    await page.getByRole('button', { name: /정산 되돌리기/ }).click();
    const unmarkDialog = page.getByRole('dialog');
    await unmarkDialog.getByRole('button', { name: '되돌리기' }).click();
    await expect(page.getByText('정산을 되돌렸습니다.')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('미정산', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/S2-되돌리기.png`, fullPage: true });
  });
});
