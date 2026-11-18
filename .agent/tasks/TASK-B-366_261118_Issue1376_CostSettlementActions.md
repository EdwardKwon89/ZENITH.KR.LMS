# TASK-B-366 — Issue #1376: 청구서관리 ①-3 오더정산 서버 액션 — 목록·정산완료·정산 후 수정 잠금 (설계 PR-3)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1376](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1376) (에픽 #1364 / 설계 기준 `TASK-B-358`) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-18 |
| **우선순위** | P2 (`priority:p2`, `type:feat`) |
| **상태** | 🔔 리뷰 대기 (`status:review`) |
| **브랜치** | `feature/teamb-task-b366-iss1376-cost-settlement-actions` (base `origin/TeamB_Dev`) |
| **채번 확인** | `find .agent/tasks -name "TASK-B-366*"` → 0건, `git ls-tree origin/TeamB_Dev` → 없음, 이슈 검색 → 본 이슈 1건 |
| **범위** | 서버 액션 2종 + 정산 후 수정 잠금 + 계산 스냅샷 저장 + DEF-B-159 수정. **스키마 변경 없음**(B-365 컬럼 사용). `assertAdmin` 호출부·권한 로직 미변경(#1356 선행 조건 준수). `unmarkOrderCostSettled`·`updateOrder` 잠금은 B-367(범위 밖) |

## 1. 구현 내용

| # | 파일 | 변경 |
|:--|:--|:--|
| 1 | `src/app/actions/finance/ups-actual-cost.ts` | `getOrdersForCostSettlement(filter)` 신규 — `DELIVERED`+`UPS` 오더, 정산상태/기간/검색어(`q`) 필터, 배송완료일(`order_status_history.next_status='DELIVERED'`) 기준 기간 필터, 레거시 오더별 인보이스 행은 표시하되 `excludedReason='LEGACY_INVOICED'`로 제외. 기간 역전은 `generic{DATE_RANGE_INVALID}`. **보조 조회(배송완료일·원가·레거시 인보이스) 실패는 무시하지 않고** `HISTORY_LOOKUP`/`COST_LOOKUP`/`LEGACY_INVOICE_LOOKUP`으로 실패 반환(fail-open 방지) |
| 2 | 〃 | `markOrderCostSettled(orderId)` 신규 — Admin 전용. `order_not_found` → `not_ups_order` → `ups_actual_cost_status_invalid`(DELIVERED 아님) → `already_settled` → 컷오버 stub(#1369, 항상 false) → `cost_not_entered` → `legacy_invoiced_order`(기존 `zen_invoices.metadata.source_order_id` 존재) 순으로 검증. 조건부 UPDATE(`.eq('cost_settlement_status','NOT_SETTLED')`)로 동시 요청 중 1건만 성공 |
| 3 | 〃 | 정산 후 수정 잠금 — `recordUpsActualCost`·`recordActualCostAndFinalize`가 주문 조회 직후 `cost_settlement_status='SETTLED'`이면 `cost_settled_locked` 반환 + `logger.warn`. `previewUpsActualCost`는 저장이 없으므로 잠금 미적용 |
| 4 | 〃 | 계산 스냅샷 저장 — 두 record 함수의 저장 payload에 `cost_surcharge_rate`·`cost_surcharge_amount_krw`·`applied_exchange_rates`(jsonb)·`calc_version=2` 추가 (B-364 통합 규칙으로 계산한 값만 2) |
| 5 | 〃 | **DEF-B-159 수정** — 기타부가운임 목록이 비어도 `zen_ups_actual_other_charges` 기존 자식 행을 **항상 삭제**하고, 목록이 있을 때만 재삽입 |
| 6 | 〃 | `recordUpsActualCost`·`previewUpsActualCost`의 `zen_orders` select에서 **존재하지 않는 `ups_product_id` 컬럼 제거**(실DB 42703 오류 — §4 발견 이슈 1) |
| 7 | `src/app/actions/finance/index.ts` | `getOrdersForCostSettlement`·`markOrderCostSettled` re-export |
| 8 | `messages/{ko,en,zh,ja}.json` | `Errors` 4키 추가 — `cost_not_entered`·`already_settled`·`cost_settled_locked`·`legacy_invoiced_order` (4개 로케일 동일, 90→94키) |
| 9 | `tests/unit/finance/task-b366-cost-settlement.test.ts` (신규) | 거부 사유·목록 필터·보조 조회 오류·잠금(A/B)·DEF-B-159 — 15 tests |
| 10 | `tests/integration/task-b366-cost-settlement.test.ts` (신규) | 실제 로컬 DB(docker `supabase_db_ZENITH_LMS_001`) — 동시성·목록 필터·레거시 인보이스(미취소/CANCELED)·잠금·preview 허용·스냅샷 컬럼 — 9 tests |
| 11 | `tests/unit/i18n/errors-key-sync.test.ts` | 신규 4키 반영(90→94 baseline) |
| 12 | `docs/02_Analysis/ds11/Ds_11_11B_UPS_Agency_Actuals.md` | 신규 액션 2종 + 잠금·스냅샷·DEF-B-159·보조 조회 오류 코드 갱신(R-12) |
| 13 | `scratch/post_launch_improvements.md` | 리뷰 비차단 2건 IMP 등록 — IMP-197(목록 확장성/URL 길이), IMP-198(TOCTOU·RLS 검증). `scratch/`는 gitignore 대상이라 PR diff에는 포함되지 않음(로컬 IMP 백로그) |

## 2. 테스트 (DoD)

| TC | 내용 | 결과 | 테스트 위치 |
|:--|:--|:--|:--|
| TC-366-01 | `markOrderCostSettled` 거부 사유 — UPS 아님·DELIVERED 아님·이미 정산·원가 미입력·레거시 인보이스 | 각각 `not_ups_order`/`ups_actual_cost_status_invalid`/`already_settled`/`cost_not_entered`/`legacy_invoiced_order` | `tests/unit/finance/task-b366-cost-settlement.test.ts` |
| TC-366-02 | 정상 정산 | `SETTLED`·`cost_settled_at`·`cost_settled_by` 기록 | 동일 |
| TC-366-03 | 동시 요청 2건 | **1건만 성공**, 패자는 `already_settled` (실DB) | `tests/integration/task-b366-cost-settlement.test.ts` |
| TC-366-04 | 목록 기간 역전 | `generic{DATE_RANGE_INVALID}` | unit |
| TC-366-05 | 레거시 인보이스 오더 | 목록에 표시 + `legacyInvoiced=true`·`excludedReason='LEGACY_INVOICED'` | unit |
| TC-366-06 | 배송완료일 기간 밖 | 목록 제외(`total=0`) | unit |
| TC-366-07 | SETTLED 오더 B 경로 수정 | `cost_settled_locked` | unit |
| TC-366-08 | SETTLED 오더 A 경로 청구확정 | `cost_settled_locked` | unit |
| TC-366-09 | SETTLED 오더 미리보기 | 잠금 오류 **미반환**(허용) (실DB) | integration |
| TC-366-10 | 스냅샷 저장 | `calc_version=2`·`cost_surcharge_rate=0.07`·가산액>0·`applied_exchange_rates`에 HKD 존재 (실DB) | integration |
| TC-366-11 | DEF-B-159 | 빈 목록 저장 시 delete 1회·insert 0회 | unit |
| TC-366-12 | 보조 조회 오류 — 배송완료일 | `success=false`·`HISTORY_LOOKUP` | unit |
| TC-366-13 | 보조 조회 오류 — 원가 | `success=false`·`COST_LOOKUP` | unit |
| TC-366-14 | 보조 조회 오류 — 레거시 인보이스 | `success=false`·`LEGACY_INVOICE_LOOKUP` | unit |
| TC-366-15 | 레거시 인보이스 실DB 판정 | 미취소 인보이스 → `legacy_invoiced_order` 거부·목록 `LEGACY_INVOICED`, CANCELED만 → 정산 성공 | integration |
| TC-366-RST-1 | 되돌리기: 잠금 2곳 제거 | **2 failed / 13 passed** → 복구 15/15 PASS | unit |
| TC-366-RST-2 | 되돌리기: 조건부 UPDATE 술어 제거 | **1 failed / 8 skipped** (`length 1 but got 2`) → 복구 9/9 PASS | integration |
| TC-366-RST-3 | 되돌리기: DEF-B-159(항상 삭제) 원복 | **1 failed / 14 skipped** (`+0 to be 1`) → 복구 15/15 PASS | unit |
| TC-366-RST-4 | 되돌리기: 레거시 인보이스 검증 비활성화 | **1 failed / 2 passed / 6 skipped** → 복구 9/9 PASS | integration |
| TC-366-RST-5 | 되돌리기: CANCELED 제외 조건 제거 | **1 failed / 2 passed / 6 skipped** → 복구 9/9 PASS | integration |
| TC-366-RST-6 | 되돌리기: 인보이스 조회 오류 체크 제거 | **1 failed / 14 skipped** → 복구 15/15 PASS | unit |

## 3. 검증 (DoD)

- [x] 신규 단위 테스트 **15/15 PASS**, 실DB 통합 테스트 **9/9 PASS**
- [x] 되돌리기 검증 6종 — TC-366-RST-1~6 (숨긴 skip/TODO 없음, `grep -rn "test.skip"` 대상 파일 0건)
- [x] `git diff origin/TeamB_Dev...HEAD --name-only | grep -E "^supabase/"` → **출력 없음**(스키마 변경 없음)
- [x] `git diff origin/TeamB_Dev...HEAD -- src/app/actions/finance/ups-actual-cost.ts | grep assertAdmin` → **출력 없음**(권한 로직 미변경)
- [x] 4개 로케일 `Errors` 키 세트 동일(94키) — `errors-key-sync.test.ts` 7/7 PASS
- [x] `node scripts/check-ds11-sync.mjs` → **OK — 허용 목록 밖의 신규 미반영 없음**
- [x] 전체 회귀 PASS + build 성공 — **`268 files / 1,990 tests`** (리뷰 반영 후), `BUILD_EXIT=0`
- [x] `/admin/error-logs` 신규 ERROR **0건**(로컬 `zen_error_logs` 조회)
- [x] 컷오버일 판정은 #1369 확정 전까지 **항상 false stub**(테스트 skip 아님 — 조건 미확정 사실을 주석·Ds-11에 명시)

## 4. [발견 이슈]

1. **[실DB 잠복 버그 — 수정] `zen_orders.ups_product_id` 컬럼 미존재** — `recordUpsActualCost`·`previewUpsActualCost`의 `zen_orders` select가 존재하지 않는 `ups_product_id`를 조회해 실제 DB에서 `42703 column zen_orders.ups_product_id does not exist`로 **항상 실패**했다. 기존 단위 테스트가 Supabase를 mock해 컬럼 존재를 검증하지 못해 발견되지 않았다. `ups_product_code`로 `zen_ups_products`를 조회하는 기존 폴백(`recomputeRevenue`)이 있어 두 select에서 해당 컬럼만 제거(동작 동등). 마이그레이션·타입 정의에도 해당 컬럼은 없다.
2. **[환경] 로컬 `zen_exchange_rates`에 HKD→KRW 행 없음** — `getExchangeRate` 폴백(시스템 파라미터/기본 1350)으로 동작한다. 통합 테스트는 고정 환율 대신 저장된 `applied_exchange_rate`와 가산액의 관계(`round(기본운임×환율×0.07)±1`)를 검증한다.
3. **[설계 한계] 목록 기간 필터가 메모리 후처리** — `getOrdersForCostSettlement`는 `DELIVERED`+`UPS` 최대 500건을 조회한 뒤 배송완료일로 기간을 거른다. 오더 수가 500건을 넘으면 기간 내 오더가 누락될 수 있고, 500건 근접 시 `.in()` uuid 500개(≈19KB)로 URL 길이 한계에 걸릴 수 있다. **IMP-197로 등록**(서버측 기간 필터·페이지네이션·청크 분할).
4. **[설계 예정] `unmarkOrderCostSettled`·`updateOrder` 정산 후 차단** — 이슈 본문대로 B-367 범위(청구서 DB #1365 병합 후). 본 Task에서 구현하지 않았다.
5. **[리뷰 비차단] TOCTOU·RLS 검증 공백** — `record*`의 SETTLED 읽기와 저장 사이에 정산이 끼어들 수 있고, 통합 테스트는 service role을 사용해 Admin 세션 RLS 경로를 검증하지 않는다. **IMP-198로 등록**(B-367/#1365 이후 DB 트리거·조건부 UPDATE 및 RLS 테스트).
6. **[정리] `previewUpsActualCost` select의 `cost_settlement_status` 미사용 컬럼 제거** — 리뷰 지적에 따라 이번 수정에서 정리(잠금 미적용 함수).
7. **[참고] 레거시 이중청구 방지 조건** — 기존 `zen_invoices.metadata.source_order_id` 기준으로 `legacy_invoiced_order` 거부. 컷오버일 판정은 #1369 확정 후 `isBeforeCutover()`만 교체하면 된다.

## 5. [작업 결과]

- 코드 커밋(초판): `1b0491a54`
- **리뷰 반영 커밋**: `cb629d165` (보조 조회 오류 fail-open 차단 + 레거시 인보이스 실DB 검증, 6 files)
- 문서 커밋: 본 task file (docs-only)
- PR: `feature/teamb-task-b366-iss1376-cost-settlement-actions` → `TeamB_Dev` (`Closes #1376`)
