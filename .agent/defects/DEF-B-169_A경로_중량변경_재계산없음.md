# DEF-B-169: A 경로(`recordActualCostAndFinalize`) 중량 변경 시 화주 운임 재계산 없음

| 항목 | 내용 |
|:--|:--|
| **긴급도** | High (금전) |
| **발견일/발견자** | 2026-11-23 / Dave (TASK-B-381 설계 실측) |
| **관련** | Issue #1459, TASK-B-381, DEF-B-166(b), #1369(컷오버), TASK-B-377 |

## 현상

- `recordActualCostAndFinalize`는 `actualWeightKg`·치수를 입력받아 `zen_ups_actual_cost`에 저장하지만, **화주·대리점 매출을 재계산하지 않는다**.
- `recomputeRevenue` 호출은 `recordUpsActualCost`(L315)·`previewUpsActualCost`(L528) 두 곳뿐이다(`ups-actual-cost.ts`).
- 실측(로컬 실DB, ADMIN, `estimateUpsFreight` stub):
  - 입력: 기본 100,000 KRW + 기타 40,000 KRW + `actualWeightKg=10`, 인보이스 1건.
  - 결과: `actual_weight_kg=10` 저장, **`recalc` 반환 없음**, `zen_order_costs`는 기존 `BASE_FREIGHT:80`만, 인보이스 **총액 80으로 `is_finalized=true`**.

## 영향

- 확정 규칙 2("정산마감 시 수정된 청구중량으로 재계산")를 A 경로에서 만족하지 못한다. 실제 중량이 반영되지 않은 금액으로 마감된다.
- 마감 후에는 불변 트리거(`trg_prevent_cost_change_after_invoice`)로 연결 행을 고칠 수 없어 정정이 어렵다.

## 권장 조치

- **컷오버 전 오더는 현행 유지**(JSJung 결정, 2026-11-23)이므로 이번 Task에서 수정하지 않는다.
- 컷오버 후 신규 경로는 `finalizeUpsSettlement`가 A·B 구분 없이 재계산을 수행하도록 설계되어 이 결함을 회피한다.
- 후속 정정이 필요하면 별도 Task로 분리한다(마감 취소/조정 인보이스 포함).

## 참고

- TASK-B-381 task file §1-2·§3(레거시 제외) 참조.
