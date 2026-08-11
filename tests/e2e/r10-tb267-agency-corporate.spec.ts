import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// ─── TASK-B-267 / Issue #1028 — R-10 실브라우저 검증 ─────────────────────────
// AGENCY 역할 계정으로 로그인 → 사이드바 "법인정보 관리" 메뉴 노출 확인 →
// /mypage/corporate 진입 → 정보 수정·저장 → DB 직접 조회로 실제 반영 확인.

dotenv.config({ path: '.env.local' });

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_267_Result';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

const AGENCY_EMAIL = 'r10_agency_1028@zenith.kr';
const AGENCY_PASSWORD = 'password1234';
const AGENCY_ORG_NAME = 'R10 Agency Corp (1028)';

let supabase: ReturnType<typeof createClient>;
let agencyOrgId: string;

async function ensureDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function setupTestData() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  supabase = createClient(SUPABASE_URL, key);

  // 기존 잔여 정리
  const emails = [AGENCY_EMAIL];
  const { data: profiles } = await supabase.from('zen_profiles').select('id').in('email', emails);
  if (profiles && profiles.length > 0) await supabase.from('zen_profiles').delete().in('email', emails);
  const { data: authUsersRes } = await supabase.auth.admin.listUsers();
  for (const email of emails) {
    const u = (authUsersRes?.users || []).find((au: any) => au.email === email);
    if (u) await supabase.auth.admin.deleteUser(u.id);
  }
  const { data: existingOrg } = await supabase.from('zen_organizations').select('id').eq('name', AGENCY_ORG_NAME);
  if (existingOrg && existingOrg.length > 0) await supabase.from('zen_organizations').delete().in('id', existingOrg.map((o: any) => o.id));

  // AGENCY 조직 + 계정 생성
  const { data: org } = await supabase.from('zen_organizations').insert({
    name: AGENCY_ORG_NAME, type: 'AGENCY', status: 'ACTIVE',
    rep_name: '초기대표자', contact_phone: '010-1111-2222',
  }).select().single();
  agencyOrgId = org.id;

  const { data: authUser } = await supabase.auth.admin.createUser({
    email: AGENCY_EMAIL, password: AGENCY_PASSWORD, email_confirm: true,
    user_metadata: { full_name: 'R10 Agency', role: 'AGENCY' },
  });
  if (authUser?.user) {
    await supabase.auth.admin.updateUserById(authUser.user.id, {
      app_metadata: { role: 'AGENCY', org_id: agencyOrgId, status: 'ACTIVE', org_type: 'AGENCY' },
    });
    await supabase.from('zen_profiles').upsert({
      id: authUser.user.id, org_id: agencyOrgId, email: AGENCY_EMAIL,
      full_name: 'R10 Agency', role: 'AGENCY', status: 'ACTIVE',
    }, { onConflict: 'id' });
  }
}

async function cleanupTestData() {
  const emails = [AGENCY_EMAIL];
  const { data: profiles } = await supabase.from('zen_profiles').select('id').in('email', emails);
  if (profiles && profiles.length > 0) await supabase.from('zen_profiles').delete().in('email', emails);
  const { data: authUsersRes } = await supabase.auth.admin.listUsers();
  for (const email of emails) {
    const u = (authUsersRes?.users || []).find((au: any) => au.email === email);
    if (u) await supabase.auth.admin.deleteUser(u.id);
  }
  const { data: existingOrg } = await supabase.from('zen_organizations').select('id').eq('name', AGENCY_ORG_NAME);
  if (existingOrg && existingOrg.length > 0) await supabase.from('zen_organizations').delete().in('id', existingOrg.map((o: any) => o.id));
}

async function loginAs(page: any, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/ko/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[data-action="login"]');
  await page.waitForURL((url: URL) => url.pathname !== '/ko/login', { timeout: 30000 });
}

test.describe('TASK-B-267 R-10: AGENCY 법인정보 메뉴 노출 + 수정 저장 DB 반영', () => {
  test.beforeAll(async () => {
    await ensureDir();
    await setupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('AGENCY 역할 로그인 → 사이드바 "법인정보 관리" 메뉴 → /mypage/corporate 수정·저장 → DB 반영', async ({ page }) => {
    test.setTimeout(120000);

    await loginAs(page, AGENCY_EMAIL, AGENCY_PASSWORD);
    await page.waitForLoadState('networkidle');

    // 사이드바에 "법인 관리"(corporate_mgmt) 메뉴 노출 확인
    await page.waitForSelector('text=법인 관리', { timeout: 30000 });
    console.log('SIDEBAR: 법인 관리 메뉴 노출 확인');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_sidebar_menu.png'), fullPage: true });

    // /mypage/corporate 진입
    await page.goto('/ko/mypage/corporate');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[name="representative"]', { timeout: 30000 });

    // 법인정보 수정
    const repValue = `R10대표자_${Date.now()}`;
    await page.fill('input[name="representative"]', repValue);
    await page.fill('input[name="contact"]', '010-9999-8888');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_form_filled.png'), fullPage: true });

    // 정보 저장
    await page.click('button:has-text("정보 저장")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_saved.png'), fullPage: true });

    // DB 직접 조회로 실제 반영 확인 (service role)
    const { data: org } = await supabase
      .from('zen_organizations')
      .select('rep_name, contact_phone')
      .eq('id', agencyOrgId)
      .single();
    console.log('DB 반영 확인:', JSON.stringify(org));

    expect(org?.rep_name).toBe(repValue);
    expect(org?.contact_phone).toBe('010-9999-8888');
    console.log('R-10 PASSED: AGENCY 법인정보 수정 → DB 실제 반영 확인');
  });
});
