# DEF-B-163 | 대시보드(`/ko/dashboard`) 렌더링에서 React 중복 key 경고 100건 — 목록 중복·누락 가능성

| 항목 | 내용 |
|:-----|:-----|
| **발견 경위** | TASK-B-371(#1439) E2E의 R-04 **Runtime Console Audit**(LIVE_PHASE_3_VERIFY 항목 `[SAR-2026-04-19-001]`) — 5역할 × 8화면 40셀에서 브라우저 콘솔을 수집한 결과 |
| **발견자 / 날짜** | Mike (Team B) / 2026-11-23 |
| **대상 파일** | 최종 경로 `/ko/dashboard` = `src/app/[locale]/(dashboard)/dashboard/page.tsx` (+ 공용 `src/components/ui/ZenDataGrid.tsx`) — **본 Task 범위 밖** |
| **긴급도** | **Low~Medium** — 미처리 JS 예외(`pageerror`)는 **0건**이나, React가 명시하는 대로 "자식이 중복·누락될 수 있는" 렌더 상태 |
| **상태** | OPEN — 본 Task에서 수정하지 않음(R-18). 근본 원인 조사·수정은 별도 배정 |

## 현상 (실측)

- 콘솔 `error` **100건 전부 동일 메시지**:
  `Encountered two children with the same key, ... Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted ...`
- **`pageerror`(미처리 예외)0건** — ReferenceError/undefined 참조는 없음.
- 발생 위치(역할 × 최종 경로):

| 역할 | 화면(최종 경로) | 건수 |
|:--|:--|:-:|
| Admin | `/ko/dashboard` (S3b·S3c·S5 리다이렉트 도착지) | 33 + 33 + 33 |
| Admin | `/ko/dashboard` (S4 리다이렉트 도착지) | 1 |
| 그 외 역할·화면 (청구서 목록/상세/생성, 오더정산 S1·S2, Excel API) | — | **0** |

→ 청구서관리·오더정산 화면은 **0건**이고, 문제는 **Admin이 리다이렉트되는 대시보드**에서만 발생한다.

## 재현

```bash
npx playwright test tests/e2e/e2e-31-billing-flow-verification.spec.ts -g "B6"
# → [B371-r04] pageerror=0 console.error=100
```
- 증적: 비공개 보관

## 원인 후보 (미확정 — 근본 조사 필요)

1. `ZenDataGrid`의 `key={row.id}`(156행) / `key={header.id}`(113행) — TanStack Table의 row/column id가 **중복 값**일 때 경고 발생. 대시보드 `DashboardOrder` 그리드의 `getRowId`·컬럼 `id` 지정 여부 확인 필요.
2. `dashboard/page.tsx`의 `statCards.map((stat, i) => key={i})`는 인덱스 key라 중복 불가 → 후보 아님(116·124행).

## 권장 조치

- 대시보드 그리드의 row id 소스(orders.id 대신 인덱스/없는 값 사용 여부)와 컬럼 id 중복을 확인 후 수정.
- 수정 시 React 개발 콘솔의 동일 경고가 **0건**이 되는지 E2E B6으로 재확인(本 스캐의 콘솔 수집기를 재사용).

## 범위 밖 선언

본 Task(#1439)는 통합 **검증**이 목적으로 `src/` 수정을 금지한다. 발견 즉시 R-18로 등록했으며, 수정은 별도 배정 후 진행한다.

## 참조

- TASK-B-371 task file `[발견 이슈]` (`.agent/tasks/TASK-B-371_261122_Issue1439BillingE2EVerification.md`)
- R-04 체크리스트: `docs/08_Self_Audit/Checklists/LIVE_PHASE_3_VERIFY.md`
