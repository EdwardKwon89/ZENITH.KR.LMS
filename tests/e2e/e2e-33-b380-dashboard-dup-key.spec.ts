// TASK-B-380 (Issue #1455) — 대시보드 React 중복 key 경고 해소 (DEF-B-163)
//
// 원칙(이슈 지시):
//  · **실제 렌더**로 console.error의 중복 key 경고가 0건임을 단언 (소스 문자열 검사 금지)
//  · Admin·AGENCY·SHIPPER 3역할 대시보드를 모두 검증하고 수정 전/후 스크린샷을 남긴다
//  · PHASE(before/after)는 env로 구분 — before는 "중복 컬럼 상태"(되돌리기 실측 포함)의 증적
//  · R-10: /admin/error-logs 원천인 zen_error_logs 신규 0건까지 함께 단언
import { test, expect, type Page } from '@playwright/test';
import { evidenceDir } from './evidence-dir';
import fs from 'fs';
import { seedFixture, cleanupFixture, ACCOUNTS, PASSWORD, psql } from './b371-fixture';
import { loginAs } from './b371-login';

const DIR = evidenceDir('E2E_B380_Result');
const PHASE = process.env.B380_PHASE ?? 'after';

// 역할별 **실제 대시보드** (프록시 `ORG_ROUTE_MAP`: AGENCY→/agency, SHIPPER→/orders —
// /ko/dashboard는 PLATFORM(Admin)만 접근 가능, 그외 역할은 자기 대시보드로 리다이렉트된다)
const ROLES = [
  { email: ACCOUNTS.admin.email, label: 'Admin', heading: 'Logistics Dashboard' },
  { email: ACCOUNTS.agencyA.email, label: 'AGENCY', heading: '대리점 대시보드' },
  { email: ACCOUNTS.shipperA.email, label: 'SHIPPER', heading: '운송 요청 목록' },
] as const;

const DUP_KEY = 'Encountered two children with the same key';

test('B380: 대시보드 중복 key 경고 0건 (실제 렌더 · 3역할) + error-logs 無', async ({ browser }) => {
  test.setTimeout(360_000);
  fs.mkdirSync(DIR, { recursive: true });
  await seedFixture();

  const logsBefore = Number(psql(`SELECT count(*) FROM public.zen_error_logs`));
  const results: Array<{ role: string; finalUrl: string; rows: number; dupKey: number; consoleErrorTotal: number; pageErrors: number }> = [];

  for (const r of ROLES) {
    const ctx = await browser.newContext();
    const page: Page = await ctx.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, r.email, PASSWORD);
    // /ko/dashboard 진입 시도 — Admin은 그대로, 그외 역할은 프록시가 자기 대시보드로 리다이렉트한다
    await page.goto('/ko/dashboard');
    await expect(page.getByRole('heading', { name: r.heading })).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_500);
    const finalUrl = page.url();

    // Admin만 "Recent Shipments" 그리드가 있고, 행이 실제로 렌더되어야 검증 가능
    let rows = 0;
    if (r.label === 'Admin') {
      for (let attempt = 0; attempt < 2 && rows === 0; attempt++) {
        await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(1_500);
        rows = await page.locator('table tbody tr').count();
        if (rows === 0) await page.reload();
      }
      expect(rows, 'Admin 대시보드에 행이 없으면 렌더 검증이 불가능하다').toBeGreaterThan(0);
    }

    const dupCount = consoleErrors.filter((m) => m.includes(DUP_KEY)).length;
    results.push({
      role: r.label,
      finalUrl,
      rows,
      dupKey: dupCount,
      consoleErrorTotal: consoleErrors.length,
      pageErrors: pageErrors.length,
    });
    console.log(`[B380-${PHASE}] ${r.label}: rows=${rows} duplicate-key=${dupCount} console.error=${consoleErrors.length} pageerror=${pageErrors.length}`);

    await page.screenshot({ path: `${DIR}/${PHASE}_${r.label}_대시보드.png`, fullPage: true });
    await ctx.close();
  }

  const logsAfter = Number(psql(`SELECT count(*) FROM public.zen_error_logs`));
  const recent = psql(
    `SELECT coalesce(string_agg(severity || ': ' || left(message, 120), E'\n'), '(없음)')
       FROM public.zen_error_logs WHERE created_at > now() - interval '10 minutes'`,
  );
  const evidence = {
    phase: PHASE,
    results,
    errorLogs: { before: logsBefore, after: logsAfter, delta: logsAfter - logsBefore, recent10min: recent },
  };
  fs.writeFileSync(`${DIR}/${PHASE}_콘솔점검_3역할.json`, JSON.stringify(evidence, null, 2));
  console.log(`[B380-${PHASE}] 요약: duplicate-key 합계=${results.reduce((s, r) => s + r.dupKey, 0)}, error_logs delta=${logsAfter - logsBefore}`);

  // ── 단언:3역할 전부 중복 key 0건 · pageerror 0건 · 신규 ERROR 로그 0건
  for (const r of results) {
    expect(r.dupKey, `${r.role} 대시보드 중복 key 경고 ${r.dupKey}건`).toBe(0);
    expect(r.pageErrors, `${r.role} pageerror`).toBe(0);
  }
  expect(logsAfter - logsBefore, '신규 ERROR 로그').toBe(0);

  await cleanupFixture();
});
