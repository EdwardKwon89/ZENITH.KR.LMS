import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3000', screenshot: 'on' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
