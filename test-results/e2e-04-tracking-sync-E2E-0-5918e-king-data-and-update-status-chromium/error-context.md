# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-04-tracking-sync.spec.ts >> E2E-04: Tracking Sync & Notification Engine >> should synchronize external tracking data and update status
- Location: tests/e2e/e2e-04-tracking-sync.spec.ts:30:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Z-HOU-E2E03-01')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Z-HOU-E2E03-01')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]: ZENITH_LMS
        - button [ref=e6]:
          - img [ref=e7]
      - navigation [ref=e9]:
        - generic [ref=e11] [cursor=pointer]:
          - img [ref=e12]
          - generic [ref=e17]: 대시보드
        - generic [ref=e19] [cursor=pointer]:
          - img [ref=e20]
          - generic [ref=e24]: 기본 정보
          - img [ref=e25]
        - generic [ref=e28] [cursor=pointer]:
          - img [ref=e29]
          - generic [ref=e33]: 오더 관리
          - img [ref=e34]
        - generic [ref=e37] [cursor=pointer]:
          - img [ref=e38]
          - generic [ref=e43]: 물류 관리
          - img [ref=e44]
        - generic [ref=e47] [cursor=pointer]:
          - img [ref=e48]
          - generic [ref=e50]: 정산/재무
          - img [ref=e51]
        - generic [ref=e54] [cursor=pointer]:
          - img [ref=e55]
          - generic [ref=e59]: 통계 대시보드
        - generic [ref=e61] [cursor=pointer]:
          - img [ref=e62]
          - generic [ref=e64]: 운항 스케줄
        - generic [ref=e66] [cursor=pointer]:
          - img [ref=e67]
          - generic [ref=e69]: VOC 관리
        - generic [ref=e71] [cursor=pointer]:
          - img [ref=e72]
          - generic [ref=e75]: 고객지원센터
          - img [ref=e76]
        - generic [ref=e79] [cursor=pointer]:
          - img [ref=e80]
          - generic [ref=e82]: 클레임 관리
        - generic [ref=e84] [cursor=pointer]:
          - img [ref=e85]
          - generic [ref=e88]: 등급 승급 심사
        - generic [ref=e90] [cursor=pointer]:
          - img [ref=e91]
          - generic [ref=e94]: 회원사 승인
        - generic [ref=e96] [cursor=pointer]:
          - img [ref=e97]
          - generic [ref=e100]: 통관 관리
        - generic [ref=e102] [cursor=pointer]:
          - img [ref=e103]
          - generic [ref=e106]: 거버넌스
        - generic [ref=e108] [cursor=pointer]:
          - img [ref=e109]
          - generic [ref=e111]: 에러 로그
        - generic [ref=e113] [cursor=pointer]:
          - img [ref=e114]
          - generic [ref=e118]: 마이페이지
          - img [ref=e119]
        - generic [ref=e122] [cursor=pointer]:
          - img [ref=e123]
          - generic [ref=e126]: 설정
      - generic [ref=e128]:
        - generic [ref=e129]: Pl
        - generic [ref=e130]:
          - paragraph [ref=e131]: Platform Admin
          - paragraph [ref=e132]: ZENITH_LMS
    - generic [ref=e133]:
      - banner [ref=e134]:
        - generic [ref=e135]:
          - navigation [ref=e136]:
            - generic [ref=e137]: Home
            - img [ref=e138]
            - generic [ref=e140]: Tracking
          - generic [ref=e141]:
            - img [ref=e142]
            - textbox "빠른 검색 (⌘+K)" [ref=e145]
        - generic [ref=e146]:
          - button "알림" [ref=e148]:
            - img [ref=e149]
          - button "Platform Admin ZENITH_LMS PL" [ref=e154]:
            - generic [ref=e155]:
              - generic [ref=e156]: Platform Admin
              - generic [ref=e157]:
                - img [ref=e158]
                - text: ZENITH_LMS
            - generic [ref=e161]: PL
      - main [ref=e162]:
        - generic [ref=e164]:
          - generic [ref=e165]:
            - img [ref=e167]
            - generic [ref=e169]:
              - heading "통합 트래킹" [level=1] [ref=e170]
              - paragraph [ref=e171]: Monitor and manage all active logistics tracks and API sync status
          - generic [ref=e172]:
            - generic [ref=e173]:
              - generic [ref=e174]:
                - paragraph [ref=e175]: Total Tracks
                - paragraph [ref=e176]: "0"
              - generic [ref=e177]:
                - paragraph [ref=e178]: In Transit
                - paragraph [ref=e179]: "0"
              - generic [ref=e180]:
                - paragraph [ref=e181]: Delivered
                - paragraph [ref=e182]: "0"
              - generic [ref=e183]:
                - paragraph [ref=e184]: Issues
                - paragraph [ref=e185]: "0"
            - generic [ref=e186]:
              - generic [ref=e187]:
                - img [ref=e188]
                - 'textbox "Search Order # or Tracking #" [active] [ref=e191]': Z-HOU-E2E03-01
              - generic [ref=e192]:
                - button "Refresh List" [ref=e193]:
                  - img [ref=e194]
                - button "Sync All API" [ref=e199]:
                  - img [ref=e200]
                  - text: Sync All API
            - table [ref=e207]:
              - rowgroup [ref=e208]:
                - row "Order Info Tracking Number Carrier / Mode Latest Status Last Updated" [ref=e209]:
                  - columnheader "Order Info" [ref=e210]
                  - columnheader "Tracking Number" [ref=e211]
                  - columnheader "Carrier / Mode" [ref=e212]
                  - columnheader "Latest Status" [ref=e213]
                  - columnheader "Last Updated" [ref=e214]
                  - columnheader [ref=e215]
              - rowgroup [ref=e216]:
                - row "No tracking records found." [ref=e217]:
                  - cell "No tracking records found." [ref=e218]:
                    - paragraph [ref=e219]: No tracking records found.
      - region "Notifications alt+T"
      - contentinfo [ref=e220]:
        - generic [ref=e221]: © 2026 SNTL LOGISTICS. All rights reserved.
        - generic [ref=e222]:
          - generic [ref=e223] [cursor=pointer]: Privacy Policy
          - generic [ref=e224] [cursor=pointer]: Terms of Service
  - button "Open Next.js Dev Tools" [ref=e230] [cursor=pointer]:
    - img [ref=e231]
  - alert [ref=e234]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('E2E-04: Tracking Sync & Notification Engine', () => {
  4  |   const adminEmail = 'admin@zenith.kr';
  5  |   const adminPassword = 'password1234';
  6  |   const targetOrderNo = 'Z-HOU-E2E03-01';
  7  |   const trackingNo = 'TRK-E2E04-API-01';
  8  | 
  9  |   test.beforeEach(async ({ page }) => {
  10 |     // 1. Login
  11 |     await page.goto('/ko/login');
  12 |     await page.fill('input#email', adminEmail);
  13 |     await page.fill('input#password', adminPassword);
  14 |     
  15 |     // Screenshot before login attempt
  16 |     await page.screenshot({ path: 'scratch/e2e_04_00_login_before.png' });
  17 |     
  18 |     await page.click('button[data-action="login"]');
  19 |     
  20 |     // Wait for either success navigation or error alert
  21 |     await Promise.race([
  22 |       page.waitForURL(/.*(dashboard|orders)/, { timeout: 30000 }),
  23 |       page.waitForSelector('.alert-error', { timeout: 30000 }).then(() => { throw new Error('Login failed with error alert'); })
  24 |     ]);
  25 |     
  26 |     await page.waitForLoadState('networkidle');
  27 |     await page.screenshot({ path: 'scratch/e2e_04_00_login_after.png' });
  28 |   });
  29 | 
  30 |   test('should synchronize external tracking data and update status', async ({ page }) => {
  31 |     // 2. Navigate to Tracking Dashboard
  32 |     await page.goto('/ko/tracking');
  33 |     await page.waitForLoadState('networkidle');
  34 |     await page.screenshot({ path: 'scratch/e2e_04_01_tracking_list_before.png' });
  35 |     
  36 |     // 3. Search for the target order
  37 |     const searchInput = page.locator('input[placeholder*="Search Order"]');
  38 |     await searchInput.fill(targetOrderNo);
  39 |     await page.keyboard.press('Enter');
  40 |     
  41 |     // Verify target order is in the list
> 42 |     await expect(page.locator(`text=${targetOrderNo}`)).toBeVisible();
     |                                                         ^ Error: expect(locator).toBeVisible() failed
  43 |     await page.screenshot({ path: 'scratch/e2e_04_02_search_result.png' });
  44 |     
  45 |     // 4. Click Sync All API
  46 |     const syncButton = page.locator('button:has-text("Sync All API")');
  47 |     await syncButton.click();
  48 |     
  49 |     // 5. Wait for sync completion (overlay should disappear)
  50 |     await expect(page.locator('text=Syncing external data...')).toBeVisible();
  51 |     await expect(page.locator('text=Syncing external data...')).not.toBeVisible({ timeout: 20000 });
  52 |     
  53 |     // 6. Verify status update in the table
  54 |     await page.screenshot({ path: 'scratch/e2e_04_03_after_sync.png' });
  55 |     await expect(page.locator(`tr:has-text("${targetOrderNo}")`)).toContainText('API');
  56 |     
  57 |     // 7. Navigate to Detail page to verify milestone
  58 |     await page.click(`tr:has-text("${targetOrderNo}") a:has-text("Detail")`);
  59 |     await page.waitForLoadState('networkidle');
  60 |     await expect(page).toHaveURL(new RegExp(`.*orders/.*`));
  61 |     
  62 |     // Scroll to timeline if needed
  63 |     await page.evaluate(() => window.scrollTo(0, 500));
  64 |     await page.screenshot({ path: 'scratch/e2e_04_04_tracking_timeline.png' });
  65 |   });
  66 | });
  67 | 
```