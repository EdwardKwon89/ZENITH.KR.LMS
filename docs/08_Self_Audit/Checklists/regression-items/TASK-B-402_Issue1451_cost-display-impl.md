# [TASK-B-402] B-377 구현 PR-A — 원가 열람 가드·부가운임 표시·라벨 중립화 (Issue #1451)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-402 / [#1451](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1451) |
| **팀 / 작성일** | Team B / 2026-11-27 |
| **대상 모듈 (231 연동)** | `src/app/actions/finance/ups-actual-cost.ts`, `src/app/actions/finance/additional-charges.ts`, `src/app/actions/finance/billing-statements.ts`, `src/components/finance/{OrderFinanceSummary,statements/StatementDetail}.tsx`, `src/lib/finance/{settlement/cost-type-labels,billing/statement-excel*,billing/billing-statements}.ts`, `messages/*.json` |
| **검증 차원 (231 D1~D9)** | D1, D3, D8 |

**2026-11-27, Mike** — `[설계 확정]` 확정 범위 ①~⑤의 PR-A(앱)를 구현했습니다: `getUpsActualCost` 가드(§8-2 허용 집합), 신규 가드 조회 `getOrderAdditionalCharges`(소유·admin 검증·최신 version·DTO는 항목 컬럼만·원가 미반환), `getCostTypeLabel` audience + 4로케일 키, 화주·대리점 경로의 부가운임·조정 행(안 2·0원 비표시·음수 부호·행 합 = `line_total`), ups-detail 원가 조인 좁힘. **새 테스트는 수정 전 코드에서 실패함을 확인**(src·messages만 stash → 신규 3파일 실패 확인 후 복원).

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-402-01 | 청구서 상세 조정 행·부가운임 렌더(음수 부호) | `운임 조정분`·`-1,500`·`부가운임 · 항목명` 렌더, 구성요소(90,000)와 소계(99,500) 동시 표시 | `tests/unit/components/statements/statement-detail.test.tsx` | CI (vitest) |
| TC-402-02 | 조정 0원 비표시(Edward 결정) | 조정 행 **미렌더**, 부가운임 항목은 유지 | 동일 | CI (vitest) |
| TC-402-03 | `getCostTypeLabel` audience | admin=원문, neutral=**"부가운임"**(원문 미노출) | `tests/unit/ups/task-b402-cost-display.test.ts` | CI (vitest) |
| TC-402-04 | getter — admin 전체 tier + DTO 키 제한 | version 최신(2)·금액 v2 기준·키 = `amount/currency/lineNo/name/tier`만(원가 미반환) | 동일 | CI (vitest) |
| TC-402-05 | getter — 자기 화주 SHIPPER tier | 자기 tier 1행·tier 필터 단언 | 동일 | CI (vitest) |
| TC-402-06 | getter — 소유 불일치 | `permission_denied` + `logger.warn`(ownership denied) | 동일 | CI (vitest) |
| TC-402-07 | getter — 정산 전(run 없음) | `success` + 빈 items, 로거 미기록 | 동일 | CI (vitest) |
| TC-402-08 | getter — charges 조회 실패 | `logger.error`에 **오류 객체 인자** + 실패 반환 | 동일 | CI (vitest) |
| TC-402-09 | `getUpsActualCost` 가드 — 비허용 역할 | `logger.warn`(레벨) + `permission_denied` throw | 동일 | CI (vitest) |
| TC-402-10 | `getUpsActualCost` 가드 — `SUB_ADMIN`(Pilot 예외) | 통과, warn 없음 | 동일 | CI (vitest) |
| TC-402-11 | `getUpsActualCost` 가드 — `ADMIN` | 통과(현행 호출 경로 유지) | 동일 | CI (vitest) |
| TC-402-12 | Excel 조정·부가운임 필드 매핑과 행합 정합 | 구성요소 합 = `line_total` · `totals.additionalCharges`/`freightAdjustment` 반영 · §1-1(항목 합 = 헤더) 유지 | `tests/unit/finance/task-b360-excel-data.test.ts` | CI (vitest) |
| TC-402-13 | 실DB RLS 매트릭스 — admin | 두 run·두 tier 전체 4행 | `tests/integration/task-b402-additional-charges-rls.test.ts` | CI (vitest + 실DB) |
| TC-402-14 | 실DB RLS 매트릭스 — 대리점/화주 자기 tier | 각 2행·자기 tier만(타 tier 0행) | 동일 | CI (vitest + 실DB) |
| TC-402-15 | 실DB RLS 매트릭스 — 타인 화주 | **0행** | 동일 | CI (vitest + 실DB) |
| TC-402-16 | 실DB getter — 자기 tier 양성 대조 | 자기 tier 표시(1행·최신 version·금액 222) | 동일 | CI (vitest + 실DB) |
| TC-402-17 | 실DB getter — 타인 화주(오더 RLS 숨김) | `order_not_found`(존재 비노출) + `logger.error` 없음 | 동일 | CI (vitest + 실DB) |
| TC-402-18 | 실DB getter — admin 최신 version·DTO | version 2·키 제한(원가 미반환) | 동일 | CI (vitest + 실DB) |
| TC-402-19 | `SUB_ADMIN` 비파괴 — 원가 관리(`getUpsActualCost`) | 실DB 행 반환 통과·warn 없음 | 동일 | CI (vitest + 실DB) |
| TC-402-20 | `SUB_ADMIN` 비파괴 — 수익금 집계(`getSubAgencyProfitSummary`) | 통과 / `SHIPPER`는 거부(기존 가드 유지) | 동일 | CI (vitest + 실DB) |
| TC-402-21 | `getUpsActualCost` 실세션 거부 — 비허용 역할(SHIPPER, Aiden R-01 권고 2) | `permission_denied` throw(ko 문구) + `logger.warn`(Denied for role), `logger.error` 없음 | 동일 | CI (vitest + 실DB) |

**수정 전 코드에서의 실패 확인(2026-11-27)**: `src/`·`messages/`만 stash + 신규 소스 격리 상태에서 실행 → `task-b402-cost-display.test.ts` **import 실패(실행 불가)** · `statement-detail` TC-402-01/02 **2 failed** · 통합 테스트 **import 실패** — 전부 기대대로 실패 후 복원.

**회귀**: 신규 23건(단위 9 + 렌더 2 + Excel 1 + 실DB 11) 전부 PASS · `npm run build` / `npm run test:regression` 결과는 PR CI `gh pr checks` 인용.
