# [TASK-B-372] DEF-150 PR-1 — AGENCY 스코프 필터·무인증 helper 이동 (Issue #1356)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-372 / [#1356](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1356) (DEF-150) |
| **팀 / 작성일** | Team B / 2026-11-23 |
| **대상 모듈 (231 연동)** | `src/app/actions/finance/ups-actual-charges.ts`, `src/app/actions/finance/ups-actual-cost.ts`, `src/lib/orders/order-released-date.ts` |
| **검증 차원 (231 D1~D9)** | D1, D3, D5 |

**2026-11-23, Dave** — DEF-150 PR-1. AGENCY 스코프를 `settlement.ts` `resolveAgencyShipperIds()` 패턴(활성 연결 화주 + 자가화주)으로 통일하고 `searchDeliveredUpsOrders` **2단계(tracking_no) 결과에도** 적용했습니다. `recordUpsActualCharges`는 소유 검증 후 AGENCY에 한해 admin client로 쓰기(DEF-153 패턴) — 기존 AGENCY INSERT RLS 부재로 실비등록이 실패하던 문제 해소. `'use server'` 파일의 무인증 helper `getOrderReleasedDate`를 `src/lib/orders/`로 이동했습니다. **마이그레이션·DB 정책 변경 없음.**

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-372-01 | AGENCY 검색 1단계(order_no) | 소속 화주·자가화주 1건 / 타 화주·비소속 0건 | `tests/integration/task-b372-agency-scope.test.ts` |
| TC-372-02 | AGENCY 검색 2단계(tracking_no) | 동일 스코프 적용(타 화주 0건) | 동일 |
| TC-372-03 | 비소속(읽기 가능) 오더 실비등록 | `shipper_scope_denied` | 동일 |
| TC-372-04 | 소속·자가화주 오더 실비등록 | 성공 + `zen_ups_actual_charges` 1행 | 동일 |
| TC-372-05 | §1.2 helper 이동 | 기존 단위 14/14 + 오더정산 페이지 import 정상 | `tests/unit/finance/ups-actual-cost.test.ts` |
| TC-372-06 | SUSPENDED AGENCY | `permission_denied` + 실비 0행 | 동일 |
| TC-372-07 | 마감 인보이스 + AGENCY | 사전 거부 + 기존 실비 보존 | 동일 |
| TC-372-08 | 미마감 인보이스 | `ADMIN_TO_AGENCY` 불변 / `AGENCY_TO_SHIPPER` 갱신 | 동일 |
| TC-372-09 | 비유한 금액·비소유 | `cost_amount_invalid`, admin client 미호출 | `tests/unit/finance/ups-actual-charges.test.ts` |
| TC-372-RST-1 | 2단계 스코프 필터 제거 | **1 failed / 3 passed** → 복구 4/4 | 동일 | 동일 |
| TC-372-RST-2 | 자가화주 제외 | **3 failed / 1 passed** → 복구 4/4 | 동일 |
| TC-372-RST-3 | AGENCY admin client 쓰기 제거 | **1 failed / 3 passed** (`CHARGES_INSERT`) → 복구 4/4 | 동일 |
| TC-372-RST-4 | ACTIVE 가드 제거 | **1 failed / 6 passed** → 복구 7/7 | 동일 |
| TC-372-RST-5 | 마감 사전 거부 제거 | **1 failed / 6 passed** → 복구 7/7 | 동일 |
| TC-372-RST-6 | AGENCY `ADMIN_TO_AGENCY` 제외 제거 | **1 failed / 6 passed** → 복구 7/7 | 동일 |

**회귀 검증**: `npm run test:regression` → **294파일 / 2,256케이스 전부 PASS (exit 0)**. `npm run build` → **성공 (exit 0)**. `zen_error_logs` 최근 1일 신규 ERROR 0건.
**R-12 Ds-11**: `Ds_11_11B_UPS_Agency_Actuals.md`의 `recordUpsActualCharges`/`searchDeliveredUpsOrders`/`getOrderReleasedDate` 갱신, `check:ds11` OK.
**발견 이슈**: AGENCY 쓰기 RLS 부재 → DB 변경 없이 소유 검증 후 admin client로 해소(이슈 #1356 질문 코멘트). §1.3/§1.4는 PR-2.
