// TASK-B-371 (Issue #1439) — E2E 로그인 헬퍼 (자기완결형 계정)
import type { Page } from '@playwright/test';

/** 실제 브라우저 로그인 (`/ko/login` → 대시보드/소속 라우트로 이동 확인) */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/ko/login');
  await page.fill('input#email', email);
  await page.fill('input#password', password);
  await Promise.all([
    page.waitForURL(/.*(dashboard|orders|finance|agency|shipper)/, { timeout: 30_000 }),
    page.click('button[data-action="login"]'),
  ]);
}
