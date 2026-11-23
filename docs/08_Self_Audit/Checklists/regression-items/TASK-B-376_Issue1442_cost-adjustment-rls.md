# [TASK-B-376] zen_order_costs UPS_ACTUAL_ADJUSTMENT 화주·대리점 노출 차단 (Issue #1442)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-376 / [#1442](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1442) (DEF-150 후속) |
| **팀 / 작성일** | Team B / 2026-11-23 |
| **대상 모듈 (231 연동)** | `supabase/migrations/20261123110000_task_b376_cost_type_rls.sql`, `tests/integration/task-b376-cost-adjustment-rls.test.ts` |
| **검증 차원 (231 D1~D9)** | D1, D3, D5 |

**2026-11-23, Dave** — JSJung 확정: UPS 실비는 원가이며 화주·대리점은 확인 불가. `zen_order_costs`의 두 SELECT 정책을 재작성해 **화주·대리점 분기에만** `cost_type <> 'UPS_ACTUAL_ADJUSTMENT'`를 추가했습니다. `BASE_FREIGHT` 등 기존 비용 행은 그대로 보입니다(양성 대조). 관리자 정책·ADMIN/SUPER_ADMIN 분기는 유지, MANAGER는 기존과 동일하게 `zen_order_costs` 정책이 없어 0행입니다.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-376-01 | 화주 SELECT | `BASE_FREIGHT` 1행, `UPS_ACTUAL_ADJUSTMENT` 0행 | `tests/integration/task-b376-cost-adjustment-rls.test.ts` |
| TC-376-02 | 대리점 SELECT | 동일 | 동일 |
| TC-376-03 | ADMIN·SUPER_ADMIN SELECT | 두 행 모두 1행씩 | 동일 |
| TC-376-04 | MANAGER SELECT | 0행(현행 유지) | 동일 |
| TC-376-05 | 정책 되돌리기 | 기존 정책 재생성 시 화주·대리점 adjustment 1행 복구 → 제한 정책 재적용 0행 | 동일 |
| TC-376-06 | `getShipperDailyBillingSummary` | `totalActualAdjustment=0`, base>0 | 동일 |
| TC-376-07 | `getShipperDailyOrdersDetails` | `actualAdjustment=0`, base>0 | 동일 |
| TC-376-08 | AGENCY `finalizeInvoice` 전후 | `total_amount` 115 불변 | 동일 |
| TC-376-09 | UI 실로그인 | 화주/대리점 주문 상세에서 adjustment 라인·115 미표시 | `docs/02_Analysis/evidence/task-b376/order-detail-{shipper,agency}-after.png` |

**회귀 검증**: `npm run test:regression` → **296파일 / 2,269케이스 전부 PASS (exit 0)**. `npm run build` → **성공 (exit 0)**. `zen_error_logs` 최근 1일 신규 ERROR 0건.
**화면 영향**: 화주 화면 비용 합계 100 vs 인보이스 총액 115 유지 — JSJung 결정 대기(PR 본문 명시).
