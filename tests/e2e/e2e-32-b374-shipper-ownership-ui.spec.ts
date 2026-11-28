// TASK-B-374 (Issue #1349) — R-10 증적: 대리점 화주 목록·등록·수정 화면 실구동
//
// 목적: 소유권 가드(DEF-149 §1.1) 추가 후에도 **정상 경로(자기 소속)** 의 UI가 깨지지 않음을 확인한다.
//  · 실제 브라우저 로그인(page.goto) + 실DB fixture(b371-fixture, seed-local 비의존)
//  · 로그 확인: `/admin/error-logs`의 원천인 `zen_error_logs`에 신규 ERROR가 없는지 실측 (R-10)
import { test, expect } from '@playwright/test';
import { evidenceDir } from './evidence-dir';
import fs from 'fs';
import {
  seedFixture, cleanupFixture, serviceClient, psql, ACCOUNTS, PASSWORD, IDS,
} from './b371-fixture';
import { loginAs } from './b371-login';

const DIR = evidenceDir('E2E_B374_Result');

test.describe('TASK-B-374: 대리점 화주 관리 UI 구동 (R-10 증적)', () => {
  test.beforeAll(async () => {
    fs.mkdirSync(DIR, { recursive: true });
    await seedFixture();
  });

  test.afterAll(async () => {
    await cleanupFixture();
  });

  test('화주 목록·등록·수정 화면 구동 + 신규 ERROR 로그 0건', async ({ page }) => {
    test.setTimeout(240_000);
    const before = Number(psql(`SELECT count(*) FROM public.zen_error_logs`));

    // fixture가 만든 연결 행의 id (수정 화면 라우트)
    const linkId = psql(
      `SELECT id FROM public.zen_agency_shippers WHERE agency_org_id = '${IDS.agencyAOrg}'`,
    );
    expect(linkId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/);

    await loginAs(page, ACCOUNTS.agencyA.email, PASSWORD);

    // ① 목록 — 자기 소속 화주가 표시되고(가드가 정상 경로를 막지 않음), 리다이렉트되지 않는다
    await page.goto('/ko/agency/shippers');
    await expect(page).toHaveURL(/\/ko\/agency\/shippers$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: '화주 관리' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('B371 Shipper A').first()).toBeVisible();
    await page.screenshot({ path: `${DIR}/01_화주목록.png`, fullPage: true });

    // ② 등록 폼
    await page.goto('/ko/agency/shippers/new');
    await expect(page.getByRole('heading', { name: '화주 등록' })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await page.screenshot({ path: `${DIR}/02_화주등록.png`, fullPage: true });

    // ③ 수정 폼 — 자기 화주 데이터가 값으로 채워진다 (getAgencyShipperById 정상 경로)
    await page.goto(`/ko/agency/shippers/${linkId}/edit`);
    await expect(page).toHaveURL(new RegExp(`/ko/agency/shippers/${linkId}/edit$`), { timeout: 30_000 });
    await expect(page.locator('input[name="name"]')).toHaveValue('B371 Shipper A', { timeout: 30_000 });
    await page.screenshot({ path: `${DIR}/03_화주수정.png`, fullPage: true });

    // R-10: 이 흐름에서 신규 ERROR 로그가 없어야 한다
    const after = Number(psql(`SELECT count(*) FROM public.zen_error_logs`));
    const fresh = psql(
      `SELECT coalesce(string_agg(severity || ': ' || left(message, 120), E'\n'), '(없음)')
         FROM public.zen_error_logs WHERE created_at > now() - interval '10 minutes'`,
    );
    fs.writeFileSync(
      `${DIR}/R10_에러로그_확인.json`,
      JSON.stringify({ before, after, delta: after - before, recent10min: fresh }, null, 2),
    );
    expect(after - before, `신규 ERROR 로그 ${after - before}건`).toBe(0);
  });
});
