import { defineConfig, devices } from '@playwright/test';

// 병렬 R-10 검증 시 포트 충돌 방지용 — PLAYWRIGHT_PORT=3007 npx playwright test 형태로 사용.
// 과거엔 포트별로 playwright.r10-XXX.config.ts 파일을 매번 복사해 root에 남기던 것을 대체.
const PORT = process.env.PLAYWRIGHT_PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
