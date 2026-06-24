# TASK-B-021 — E2E-23 보강: UAT-20 Agency 정산 CSV·Reconciliation 알림

> **TASK-ID**: TASK-B-021
> **생성일**: 2026-06-24
> **발령자**: Aiden (ZEN_CEO) — Edward 지시 (Issue #91, SPR-09)
> **담당 Agent**: Jaison (총괄) · Baker (구현)
> **우선순위**: P2
> **관련 Issue**: [#91](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/91)
> **전제조건**: TASK-B-019 ✅ (E2E-23 기존 스펙 완성)
> **브랜치**: `feature/teamb-task-b-021-e2e23-uat20`
> **상태**: 🔄

---

## [업무 개요]

UAT-20 Agency 정산 시나리오 7건 중 E2E-23에 미커버된 항목을 보강합니다.  
핵심 추가 대상: **TC-AG-09 (CSV 다운로드)** · **TC-AG-10 (Reconciliation 알림 상세)**

---

## [Gap 분석]

| UAT-20 시나리오 | E2E-23 현재 커버 | Gap |
|:--------------|:-----------:|:----|
| 20-01 정산 요약 확인 | ⚠️ 부분 (기본 접근만) | 요약 카드 수치 검증 생략 — 범위 외 |
| 20-02 화주별 필터링 | ❌ | 화주 필터 UI 미구현으로 범위 외 |
| **20-03 CSV 다운로드** | ❌ | **TC-AG-09 신규 추가 (필수)** |
| 20-04 오더번호 검색 일치 | ✅ | — |
| 20-05 오더번호 검색 없음 | ❌ | TC-AG-11 추가 (권장) |
| **20-06 Reconciliation 알림 (존재)** | ⚠️ 부분 (알림 유무만) | **TC-AG-10 보강 (필수) — collapsible + 링크 클릭** |
| 20-07 Reconciliation 알림 (없음) | ❌ | TC-AG-12 추가 (권장) |

---

## [구현 명세]

### 수정 대상 파일

`tests/e2e/e2e-23-agency-flow.spec.ts`

### TC-AG-09: CSV 다운로드 검증 (UAT-20-03) — **필수**

```typescript
test('TC-AG-09: Agency 정산 CSV 다운로드', async ({ page }) => {
  test.setTimeout(60000);
  await loginAsAgency(page);
  await page.goto('/ko/agency/settlements');
  await page.waitForLoadState('networkidle');

  // 날짜 범위 조회
  const dateInputs = page.locator('input[type="date"]');
  if (await dateInputs.first().isVisible()) {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    await dateInputs.nth(0).fill(thirtyDaysAgo);
    await dateInputs.nth(1).fill(today);
    await page.getByRole('button', { name: /조회|Search|검색/ }).first().click();
    await page.waitForLoadState('networkidle');
  }

  // CSV 다운로드 버튼 클릭 + 다운로드 이벤트 캡처
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /CSV|다운로드|Export|내보내기/ }).first().click(),
  ]);

  // 파일명 규격 검증: Agency_Settlements_*.csv
  const fileName = download.suggestedFilename();
  expect(fileName).toMatch(/Agency.*Settlements.*\.csv$/i);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_csv_download.png') });
});
```

### TC-AG-10: Reconciliation 알림 상세 검증 (UAT-20-06 보강) — **필수**

기존 `checkReconciliationAlert` 함수에 아래 검증 추가:

```typescript
// collapsible 펼치기
const alertToggle = page.locator('[data-testid="reconciliation-alert"], button:has-text("미가격"), button:has-text("unpriced")').first();
if (await alertToggle.isVisible().catch(() => false)) {
  await alertToggle.click();
  await page.waitForLoadState('networkidle');

  // 오더 링크 존재 확인
  const orderLink = page.locator('a[href*="/orders/"]').first();
  if (await orderLink.isVisible().catch(() => false)) {
    const href = await orderLink.getAttribute('href');
    expect(href).toMatch(/\/orders\//);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_reconciliation_expanded.png') });
  }
}
```

### TC-AG-11: 오더번호 검색 — 결과 없음 (UAT-20-05) — 권장

### TC-AG-12: Reconciliation 알림 미표시 (UAT-20-07) — 권장

> ZEN_A4: 각 test 블록 50줄 이하 준수. 공통 helper 함수(`runSettlementSearch`, `checkReconciliationAlert`) 활용하여 중복 최소화.

---

## [ZEN_A4 준수 사항]

- 각 `test()` 블록 50줄 이하 (기존 패턴 유지)
- 신규 helper 함수는 파일 내 50줄 이하로 추출
- 기존 TC-AG-01~08 코드 수정 금지 (append only)

---

## [DoD 체크리스트]

- [ ] E2E-23 Gap 분석 완료 (본 task file 기재로 갈음)
- [ ] TC-AG-09 CSV 다운로드 검증 추가 + PASS
- [ ] TC-AG-10 Reconciliation 알림 collapsible + 오더 링크 검증 추가 + PASS
- [ ] TC-AG-11 오더번호 검색 없음 케이스 추가 + PASS (권장)
- [ ] TC-AG-12 Reconciliation 알림 없음 케이스 추가 + PASS (권장)
- [ ] `npm run build` PASS
- [ ] `npm run test:regression` PASS (pre-existing 제외)
- [ ] R-17 완료 보고 절차 준수
- [ ] PR `Closes #91`

---

## [설계 의견]

_(없음 — 구현 방향 명확)_

---

## [작업 결과]

_(구현 완료 후 기재)_

| 항목 | 내용 |
|:-----|:-----|
| 코드 커밋 | TBD |
| 수정 파일 | `tests/e2e/e2e-23-agency-flow.spec.ts` |
| 추가 TC | TBD |

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-24 | Jaison (Claude, Team B) | 🔄 착수 (JSJung 지시) — Issue #91, Gap 분석 완료, Baker 배정. 브랜치 `feature/teamb-task-b-021-e2e23-uat20` 생성. |
