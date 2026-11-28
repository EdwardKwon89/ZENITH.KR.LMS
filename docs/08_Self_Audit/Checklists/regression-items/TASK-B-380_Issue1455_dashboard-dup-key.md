# TASK-B-380 회귀 항목 — 대시보드 React 중복 key 경고 해소 (Issue #1455, DEF-B-163)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | #1455 (Jaison 배정 Mike · p3) · DEF-B-163 |
| 담당 | Mike (Worker) / Auditor: Jaison |
| 변경 | `src/app/[locale]/(dashboard)/dashboard/page.tsx` — "Carrier" 컬럼에 `id: "carrier"` 지정(표시 중립, `accessorKey: "shipper_name"` 유지) + `tests/e2e/e2e-33-b380-dashboard-dup-key.spec.ts` 신규 (CI 미실행/수동 — Playwright) |
| 검증 차원 (231 D1~D9) | `D1(정합성)`, `D7(관측성/콘솔)` |

## 회귀 항목

| TC# | 시나리오 | 기대 | 테스트 파일 | 실행 |
|:----|:---------|:-----|:------------|:----:|
| TC-380-01 | **동일 명령 비교**(DEF-B-163 재현) `npx playwright test tests/e2e/e2e-31-billing-flow-verification.spec.ts -g "B6"` | 수정 전 `console.error=256`(전부 중복 key) → **수정 후 `console.error=0`**, pageerror 0 | e2e-31 B6 (재현 명령) | **CI 미실행/수동** |
| TC-380-02 | **3역할 대시보드 실제 렌더** (Admin `/ko/dashboard`·AGENCY `/ko/agency`·SHIPPER `/ko/orders`) — `console.error`의 `Encountered two children with the same key` 카운트 | **3역할 전부 0건** + `pageerror` 0건 + Admin 행 20행 렌더 실측 | `tests/e2e/e2e-33-b380-dashboard-dup-key.spec.ts` | **CI 미실행/수동** (Playwright) |
| TC-380-03 | **R-10 error-logs** — 3역할 대시보드 구동 전후 `zen_error_logs` | **delta 0** (신규 ERROR 無) | 동일 스펙 (**JSON 증적: 비공개 보관**) | CI 미실행/수동 |
| TC-380-04 | **표시 동일 대조** — before/after 동일 조건(Admin 20행, 동일 URL) + 3역할 스크린샷 | 행 수·URL 동일, 헤더 6개·열 표시값 그대로 (표시 중립 `id` 지정) | `docs/99_Manual/E2E_B380_Result/` (before/after ×3역할 스크린샷 · **JSON 증적: 비공개 보관**) | 수동 (증적) |
| TC-380-05 | **원인 실측** — 컬럼 id 중복 열거 | `accessorKey: "shipper_name"` 2회(L45·L77) → `id: "carrier"` 분리 후 header/cell key 중복 0 | 스펙 런타임 측정(=TC-380-02) | CI 미실행/수동 |

## 회귀 검증 (2026-11-23, 실측)

- **동일 명령 비교**: B6 재현 명령 — 수정 전 **console.error=256** (pageerror=0, 전부 동일 중복 key 메시지) → 수정 후 **console.error=0**
- 신규 스펙 `e2e-33`: **after PASS**(3역할 dupKey 합계 0 · error-logs delta 0) · **before(되돌리기) FAIL** · **기준선 복원 PASS**
- `npm run test:regression` → **296 files / 2,267 tests 전부 PASS** · `npm run build` → **exit 0** (`✓ Compiled successfully in 7.0s`)
- `check:lrtm` OK · `check:doc-links` OK · `check:audit` OK · `tsc` 관련 **0건**

## 되돌리기 검증 (조건별 — 로컬만, 커밋 금지 → 원복)

| 조건 | 되돌리기 내용 | 결과 |
|:--|:--|:--|
| R1 | `id: "carrier"` **1줄 제거**(= 수정 전 중복 컬럼 상태) | **FAIL (exit 1)** — Admin `duplicate-key=85` (AGENCY/SHIPPER은 해당 페이지 접근 불가·0건) → 테스트가 변경에 민감함을 실측 |
| (기준선) | `id: "carrier"` 복원 후 재실행 | **PASS** — Admin `duplicate-key=0`, 3역할 합계 0, error-logs delta 0 |

> 되돌리기 런은 **PHASE=before** 증적(스크린샷·JSON)도 동시에 수집했다 — 표시 변화가 없는 수정이라 before/after 화면은 동일하다.

**주의 (R-09 v3.10)**: 회귀 맵 단일 파일에 `## N.` 추가 금지 — 본 파일이 등재 단위.
