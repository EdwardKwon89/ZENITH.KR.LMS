import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * R-10 검증: /admin/error-logs 필터·검색·우선순위 정렬 (Issue #1186 / TASK-1140)
 *
 * 사전 조건: 로컬 Supabase에 zen_error_logs 시드 6건 필요 (task file 참조)
 * - CRITICAL 미해결 1건('UPS label generation failed...')이 기본 진입 시 최상단 노출되어야 함
 * - Severity/Status 드롭다운, 메시지 키워드 검색(ilike) 동작 검증
 */

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_31_Result/TASK1140_2026-08-23';
const ADMIN_EMAIL = 'admin@zenith.kr';
const PASSWORD = 'password1234';

async function loginAndGoto(page: any) {
  await page.goto('/ko/login');
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[data-action="login"]');
  await page.waitForURL((u: URL) => !u.pathname.includes('/login'), { timeout: 30000 });
  await page.goto('/ko/admin/error-logs');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

const rows = (p: any) => p.locator('table tbody tr');

test.describe('R-10: 에러로그 필터·검색 (Issue #1186)', () => {
  test.beforeEach(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('[TC-A] 기본 진입 — 미해결 CRITICAL이 최상단 + 전체 6건 노출', async ({ page }) => {
    await loginAndGoto(page);

    // 기본 정렬: 첫 행 = 미해결 CRITICAL(최신)
    await expect(rows(page).first()).toContainText('UPS label generation failed', { timeout: 10000 });
    await expect(rows(page).first()).toContainText('CRITICAL');

    // resolved 로그도 하단에 함께 노출 (기본 필터 없음)
    await expect(page.getByText('Sentry transport flush failed')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_default_critical_top.png'), fullPage: true });
  });

  test('[TC-B] Severity 필터 = CRITICAL — CRITICAL 2건만 노출', async ({ page }) => {
    await loginAndGoto(page);

    await page.selectOption('select[aria-label="Severity filter"]', 'CRITICAL');
    await expect(page.getByText('Database connection timeout')).toBeHidden({ timeout: 10000 });
    await expect(rows(page)).toHaveCount(2);
    await expect(page.getByText('UPS label retry exhausted')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_filter_severity_critical.png'), fullPage: true });
  });

  test('[TC-C] Status 필터 = Resolved — 해결된 로그 3건만 노출', async ({ page }) => {
    await loginAndGoto(page);

    await page.selectOption('select[aria-label="Status filter"]', 'RESOLVED');
    await expect(page.getByText('Session expired warning banner render error')).toBeVisible({ timeout: 10000 });
    await expect(rows(page)).toHaveCount(3);
    await expect(page.getByText('UPS label generation failed')).toBeHidden();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_filter_status_resolved.png'), fullPage: true });
  });

  test('[TC-D] 키워드 검색 "UPS label" — ilike 매칭 2건 → Open 결합 시 1건', async ({ page }) => {
    await loginAndGoto(page);

    await page.fill('input[aria-label="Keyword search"]', 'UPS label');
    await expect(rows(page)).toHaveCount(2, { timeout: 10000 });

    // Status=Open 결합 필터
    await page.selectOption('select[aria-label="Status filter"]', 'OPEN');
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('UPS label generation failed');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_search_keyword_combined.png'), fullPage: true });
  });
});
