# TASK-B-372 — Issue #1356: DEF-150 PR-1 — finance 대리점 범위 필터(§1.1) + 미인증 helper 이동(§1.2)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1356](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1356) (DEF-150, Aiden 발령) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | Aiden / JSJung |
| **생성일** | 2026-11-23 |
| **우선순위** | P1 (`priority:p1`, `type:fix`, `defect:high`) |
| **상태** | 🔔 리뷰 대기 (`status:review`) |
| **브랜치** | `feature/teamb-task-b372-iss1356-def150-pr1` (base `origin/TeamB_Dev` 4d01f7327) |
| **채번 확인** | Jaison 배정 번호 **TASK-B-372** (스크립트 값 사용 금지 지시). `.agent/tasks` 기존 파일 0건 |
| **PR 정책** | 이슈가 Aiden 발령 건 → PR 본문 **`Refs #1356`** (Close는 Jaison 수동) |

## 범위 (PR-1만)

| § | 대상 | 내용 |
|:--|:--|:--|
| 1.1 High | `src/app/actions/finance/ups-actual-charges.ts` | AGENCY 범위 필터를 `settlement.ts` `resolveAgencyShipperIds()` 패턴으로 통일(소속 화주 + **자가화주 `profile.org_id`**). `searchDeliveredUpsOrders` **2단계(tracking_no) `moreOrders`에도 동일 필터 적용**, `recordUpsActualCharges`도 동일 헬퍼 사용 |
| 1.2 Medium | `src/app/actions/finance/ups-actual-cost.ts` | `'use server'` 파일의 무인증 helper `getOrderReleasedDate` export 제거 → `src/lib/orders/order-released-date.ts`로 이동. 내부 3곳·오더정산 상세 페이지 import 갱신 |

**PR-2(범위 밖)**: §1.3 조회 5종 역할·소유권 가드(설계 의견 후 확정), §1.4 MANAGER `isAdmin`·`{error}` 로깅.

## R-20 영향도 (GitNexus 미연결·인덱스 stale → grep 전수)

| 심볼 | 호출처 (grep) | 건수 |
|:--|:--|:--:|
| `searchDeliveredUpsOrders` | `admin/ups-actual-charges/ups-actual-charges-client.tsx`, `finance/index.ts` 재export | 2 |
| `recordUpsActualCharges` | `components/orders/UpsActualAdjustmentForm.tsx`, `finance/index.ts`, 테스트 2파일 | 4+ |
| `getOrderReleasedDate` | `ups-actual-cost.ts` 내부 3곳, `finance/order-settlement/[orderId]/page.tsx`, `tests/unit/finance/ups-actual-cost.test.ts` | 5 |
| `resolveAgencyShipperIds` | `settlement.ts` private(패턴 참조) | — |

> 한계: GitNexus 도구·인덱스 미제공으로 자동 호출 그래프 분석 불가. `grep -rn` 전수 + 직접 파일 확인으로 대체.

## 구현 방침

- `ups-actual-charges.ts`에 `resolveAgencyScopeShipperIds(supabase, agencyOrgId)` 추가: `zen_agency_shippers`(active) + `agencyOrgId` 자신.
- `recordUpsActualCharges`: 위 헬퍼 결과에 `order.shipper_id` 포함 여부 검사(기존 `shipper_scope_denied` 유지).
- `searchDeliveredUpsOrders`: AGENCY일 때 헬퍼를 1회 계산해 `Set`으로 보관, 1단계 결과와 **2단계 `moreOrders` 모두** 필터. 필터로 제외된 오더는 `orderIds`에 추가하지 않는다.
- `getOrderReleasedDate`: `src/lib/orders/order-released-date.ts`로 이동(동작 동일), `ups-actual-cost.ts`는 import 사용, 페이지·단위 테스트 import 갱신. Ds-11 해당 절을 "lib 내부 헬퍼(서버 액션 아님)"로 정정.
- **마이그레이션·DB 변경 없음**, `scratch` 수정·IMP 번호 부여 금지(R-15).

## 1. 구현 내용

| # | 파일 | 변경 |
|:--|:--|:--|
| 1 | `src/app/actions/finance/ups-actual-charges.ts` | `assertAdminOrAgency` → **`assertAdminOnly`**(`ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만). `recordUpsActualCharges`·`searchDeliveredUpsOrders`·`getUpsActualCharges`·`getUpsChargeReconciliation` **4개 모두** 적용. 비관리자는 `logger.warn` + `permission_denied`(조회는 throw) |
| 2 | 〃 | AGENCY 분기·스코프 필터·`writeDb`/admin client 분기 제거(리뷰 지시). 관리자 가드 통과 후 4개 함수 DB 접근은 `createAdminClient()` 사용(관리자 RLS 정책 범위 정렬은 별도 Task) |
| 3 | 〃 | `recordUpsActualCharges`: 금액 `Number.isFinite` 검증 유지. 마감 인보이스 판정은 기존 관리자 흐름 유지 |
| 4 | `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx` | `UpsActualAdjustmentForm`을 **관리자(`isAdmin` 또는 MANAGER)일 때만 렌더**. 폼은 `getUpsActualCharges`·`getUpsChargeReconciliation`·`recordUpsActualCharges` 3개를 호출하므로 비관리자 렌더 제거로 호출 자체 차단(PR 본문 기재) |
| 5 | `src/lib/orders/order-released-date.ts` (신규) | `getOrderReleasedDate` 이동(§1.2 유지) |
| 6 | `src/app/actions/finance/ups-actual-cost.ts`, 오더정산 상세 page, 단위 테스트 | helper import 경로 갱신 |
| 7 | `tests/integration/task-b372-admin-only.test.ts` (신규) | 실제 로그인 세션·실DB — 관리자 3역할 허용 4함수, 비관리자 3역할 거부 4함수 |
| 8 | `tests/unit/finance/ups-actual-charges.test.ts` | AGENCY 허용 테스트를 거부로 반전, 관리자 기준 금액 검증·guard 테스트 |
| 9 | `docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md` | 4개 함수 권한을 admin 전용으로 정정 |
| 10 | `docs/08_Self_Audit/Checklists/regression-items/TASK-B-372_Issue1356_def150-pr1.md` | R-09 회귀 항목 |

**마이그레이션·DB 정책 변경 없음.**

## 2. 테스트 (DoD)

| TC | 내용 | 결과 |
|:--|:--|:--|
| TC-372-01 | SUPER_ADMIN·ADMIN·MANAGER: 검색·조회·대사·등록 | 4함수 모두 성공(등록 시 `zen_ups_actual_charges` 1행) PASS |
| TC-372-02 | AGENCY·SHIPPER·OPERATOR: 4함수 모두 거부 | `permission_denied`, 실비 행 불변 PASS |
| TC-372-03 | AGENCY 단위(등록 거부) | `권한이 없습니다.` PASS |
| TC-372-04 | 비유한 금액(ADMIN) | `cost_amount_invalid`, admin client 미호출 PASS |
| TC-372-05 | §1.2 helper 이동 | 단위 14/14 PASS |
| TC-372-RST-1 | `assertAdminOnly`를 항상 null(가드 제거) | **3 failed / 3 passed** (비관리자 3역할) → 복구 6/6 |

## 3. 검증 (DoD)

- [x] 실제 로그인 세션(`signInWithPassword`)·실DB — 관리자/비관리자 4함수 교차 검증
- [x] 폼 렌더 게이트(비관리자 호출 차단) — page.tsx 조건 확인
- [x] 되돌리기 실측(가드 제거 3F/3P)
- [x] `npm run test:regression` **294 files / 2,255 tests PASS**, `npm run build` **EXIT=0**
- [x] R-12 Ds-11 4개 함수 admin 전용 정정, `check:ds11` OK
- [x] `zen_error_logs` 최근 1일 신규 ERROR **0건**
- [x] `git diff --stat origin/TeamB_Dev...HEAD -- scratch` 출력 없음(R-15)
- [x] `git diff --numstat origin/TeamB_Dev...HEAD` (최종):
```text
115	0	.agent/tasks/TASK-B-372_261123_Issue1356_Def150Finance.md
11	11	docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md
23	0	docs/08_Self_Audit/Checklists/regression-items/TASK-B-372_Issue1356_def150-pr1.md
2	1	src/app/[locale]/(dashboard)/finance/order-settlement/[orderId]/page.tsx
2	1	src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx
48	55	src/app/actions/finance/ups-actual-charges.ts
1	16	src/app/actions/finance/ups-actual-cost.ts
24	0	src/lib/orders/order-released-date.ts
169	0	tests/integration/task-b372-admin-only.test.ts
1	0	tests/unit/finance/task-b352-error-locale.test.ts
4	0	tests/unit/finance/ups-actual-charges-dual-invoice.test.ts
32	4	tests/unit/finance/ups-actual-charges.test.ts
1	1	tests/unit/finance/ups-actual-cost.test.ts
```

## 4. [발견 이슈]

1. **[후속 Task] 화주·대리점 직접 SELECT 정책 제거** — JSJung 확정 규칙(실비는 관리자 전용)에 따라 화주·대리점의 직접 조회 정책도 제거해야 한다. Jaison 지시대로 **별도 설계 의견 PR**(마이그레이션)로 분리하며, 새 task 번호는 TASK-B-375로 채번 예정(로컬 task file 기준 B-372 다음, #1349=B-374·#1362=B-373 제외). 설계 의견에 (a) 정책 제거 후 관리자 세션의 `zen_order_costs` 읽기 유지 (b) 화주·대리점 세션 SELECT 0건 실DB 검증 (c) 이 테이블을 읽는 뷰·함수 전수 조회 결과를 포함한다.
2. **[구조] 관리자 RLS 정책 범위 정렬** — 관리자 3역할이 동일하게 조회·쓰기 가능하도록 정책을 정렬한다. 정책 교체 전까지는 관리자 가드 통과 후 `createAdminClient()`로 기능을 보장한다.
3. **[참고] §1.3/§1.4는 PR-2** — `getUpsActualCost`·`getInvoicePdfHistory`·`getTaxInvoiceHistory`와 MANAGER `isAdmin`/`{error}` 로깅은 별도 PR-2 설계 의견 대상.

## 5. [작업 결과]

- 코드 커밋: `6b8044811` (초판) / `90f87bd70` (1차 리뷰) / **`62f532037`** (JSJung 확정 방향 전환)
- 문서 커밋: 본 task file (docs-only)
- PR: `feature/teamb-task-b372-iss1356-def150-pr1` → `TeamB_Dev` (**`Refs #1356`**)
