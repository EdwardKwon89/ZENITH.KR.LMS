# DEF-B-170: B 경로(`recordUpsActualCost`) 입력 부가운임 청구 미반영·항목명 소실

| 항목 | 내용 |
|:--|:--|
| **긴급도** | High (금전·표시) |
| **발견일/발견자** | 2026-11-23 / Dave (TASK-B-381 설계 실측) |
| **관련** | Issue #1459, TASK-B-381, DEF-B-167, TASK-B-377 |

## 현상

- `recordUpsActualCost`는 `otherChargesHkd`를 원가(`zen_ups_actual_cost.other_charges_hkd`)에만 저장하고, **청구 행을 만들지 않는다**.
- `recomputeRevenue`가 `estimateUpsFreight`를 호출할 때 부가운임을 전달하지 않으며, 입력 타입에도 자유 금액이 없고 마스터 ID(`otherChargeIds`)만 있다(`src/app/actions/ups/freight.ts:39`).
- B 경로에는 `zen_ups_actual_other_charges` 쓰기가 아예 없어 **항목명이 소실**된다.
- 실측(로컬 실DB, ADMIN, `estimateUpsFreight` stub):
  - 입력: 기본 100 HKD + 유류 10 + 급증 5 + **기타 50 HKD**, `actualWeightKg=10`.
  - 결과: `zen_order_costs`에 `UPS_ACTUAL_COST_ADJ:140`만 추가, 입력 기타 50은 어떤 청구 행에도 없음, `zen_ups_actual_other_charges` **0행**.

## 영향

- 확정 규칙 3·4(부가운임을 agent·shipper 청구에 그대로 반영)를 B 경로에서 만족하지 못한다.
- 규칙 5·6(항목명·금액 표시)도 항목명이 없어 불가하다.
- B와 C(`recordUpsActualCharges`)를 함께 쓰면 서로 다른 `cost_type`으로 중복 반영될 수 있다(DEF-B-167 참조).

## 권장 조치

- **컷오버 전 오더는 현행 유지**(JSJung 결정, 2026-11-23)이므로 이번 Task에서 수정하지 않는다.
- 컷오버 후 신규 경로는 정산 run 저장소에 항목별 부가운임을 기록해 규칙 3·4·6을 만족한다.

## 참고

- TASK-B-381 task file §1-2·§3(레거시 제외) 참조.
