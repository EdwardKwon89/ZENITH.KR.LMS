import { defineConfig, devices } from '@playwright/test';

// PLAYWRIGHT_PORT=3007 형태로 병렬 검증 시 포트 지정 가능 (playwright.config.ts와 동일 관례)
const PORT = process.env.PLAYWRIGHT_PORT || 3000;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
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
