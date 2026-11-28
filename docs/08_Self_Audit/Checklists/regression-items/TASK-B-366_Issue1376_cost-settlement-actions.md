# [TASK-B-366] 오더정산 서버 액션 — 목록·정산완료·정산 후 수정 잠금 (Issue #1376 / TASK-B-366, 에픽 #1364)

> 구 단일 맵 §94에서 이관(2026-11-20 develop 동기화, R-09 v3.10 — 내용 변경 없음).

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-366 / [#1376](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1376) |
| **팀** | Team B |

**2026-11-18, Dave** — 청구서관리 ①-3(설계 TASK-B-358 PR-3). `getOrdersForCostSettlement`(DELIVERED+UPS 목록·정산상태/기간/검색 필터, 레거시 인보이스 행은 표시하되 `LEGACY_INVOICED`로 제외)와 `markOrderCostSettled`(Admin, DELIVERED·UPS·원가 입력·미정산·레거시 미청구 조건 + 조건부 UPDATE로 동시성 1건만 성공)를 추가했다. `recordUpsActualCost`·`recordActualCostAndFinalize`는 `cost_settlement_status='SETTLED'`이면 `cost_settled_locked`로 거부하고(미리보기는 허용), 저장 시 `calc_version=2`·`cost_surcharge_rate`·`cost_surcharge_amount_krw`·`applied_exchange_rates` 스냅샷을 기록한다. **DEF-B-159**(기타부가운임 빈 목록 저장 시 자식 행 잔존)도 이 PR에서 수정. **스키마 변경 없음**(B-365 컬럼 사용), `assertAdmin` 호출부 미변경(#1356).

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-366-01 | `markOrderCostSettled` 거부 사유 5종 | UPS 아님·DELIVERED 아님·이미 정산·원가 미입력·레거시 인보이스 → 각 오류 키 | PR-4a에서 제거(옛 경로) |
| TC-366-02 | 정상 정산 | `cost_settlement_status=SETTLED` + `cost_settled_at/by` 기록 | 동일 |
| TC-366-03 | 동시 요청 2건 (실DB) | **1건만 성공**, 패자는 `already_settled` — 조건부 UPDATE | PR-4a에서 제거(옛 경로) |
| TC-366-04 | 목록 기간 역전 | `generic{DATE_RANGE_INVALID}` | unit |
| TC-366-05 | 레거시 인보이스 오더 | 목록 표시 + `legacyInvoiced=true`·`excludedReason=LEGACY_INVOICED` | unit |
| TC-366-06 | 배송완료일 기간 밖 | 목록 제외(`total=0`) | unit |
| TC-366-07 | SETTLED 오더 B 경로 수정 | `cost_settled_locked` | unit |
| TC-366-08 | SETTLED 오더 A 경로 청구확정 | `cost_settled_locked` | unit |
| TC-366-09 | SETTLED 오더 미리보기 (실DB) | 잠금 오류 미반환(허용) | integration |
| TC-366-10 | 스냅샷 저장 (실DB) | `calc_version=2`·가산율 0.07·가산액>0·`applied_exchange_rates` HKD 존재, 가산액≈`round(기본운임×환율×0.07)` | integration |
| TC-366-11 | DEF-B-159 빈 목록 | delete 1회·insert 0회 | unit |
| TC-366-12~14 | 보조 조회 오류 fail-open 차단 | 배송완료일/원가/레거시 인보이스 조회 실패 시 `success=false` + `HISTORY_LOOKUP`/`COST_LOOKUP`/`LEGACY_INVOICE_LOOKUP` | unit |
| TC-366-15 | 레거시 인보이스 실DB 판정 | 미취소 인보이스 → `legacy_invoiced_order`·목록 `LEGACY_INVOICED`, CANCELED만 → 정산 성공 | integration |
| TC-366-RST-1 | 되돌리기: 잠금 2곳 제거 | **2 failed / 13 passed** → 복구 15/15 | unit |
| TC-366-RST-2 | 되돌리기: 조건부 UPDATE 술어 제거 | **1 failed / 8 skipped** (`length 1 but got 2`) → 복구 9/9 | integration |
| TC-366-RST-3 | 되돌리기: DEF-B-159 원복 | **1 failed / 14 skipped** (`+0 to be 1`) → 복구 15/15 | unit |
| TC-366-RST-4 | 되돌리기: 레거시 인보이스 검증 비활성화 | **1 failed / 2 passed / 6 skipped** → 복구 9/9 | integration |
| TC-366-RST-5 | 되돌리기: CANCELED 제외 조건 제거 | **1 failed / 2 passed / 6 skipped** → 복구 9/9 | integration |
| TC-366-RST-6 | 되돌리기: 인보이스 조회 오류 체크 제거 | **1 failed / 14 skipped** → 복구 15/15 | unit |

**회귀 검증 (2026-11-18, 리뷰 반영 후)**: `npm run test:regression` **268 test files / 1,990 tests 전부 PASS**(B-364·B-365 포함). `npm run build` **EXIT=0**.
**리뷰 반영(Jaison)**: 보조 조회 3곳 error 미확인(fail-open) → 실패 반환으로 수정 + 단위 3건, 레거시 인보이스 필터를 실DB fixture(미취소/CANCELED)로 검증 + 되돌리기 3건 추가. 비차단 2건은 IMP-197·198 등록.
**Ds-11**: `node scripts/check-ds11-sync.mjs` → 허용 목록 밖 신규 미반영 없음(함수 2종 추가 반영).
**발견 이슈**: `zen_orders.ups_product_id` 미존재 컬럼을 select하던 실DB 잠복 버그(`42703`)를 이 PR에서 제거 — 기존 단위 테스트가 Supabase mock이라 미검출. 상세는 task file §4.

---
