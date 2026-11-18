# DEF-B-159: 기타부가운임을 모두 비워도 `zen_ups_actual_other_charges` 기존 행이 삭제되지 않음

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-B-364(Issue #1374 / PR #1393) Jaison 리뷰 중 발견. 원가 계산 통합 이후에도 기타부가운임 정리 동작이 조건부(`length > 0`)라 잔존 행이 남는다. |
| **긴급도** | Low~Medium (금액 자체는 메인 `other_charges_hkd` KRW 합계로 계산되지만, 자식 행 기반 대사·청구서 항목 전개 시 잔존 행이 중복·과다 표시될 수 있음) |
| **발견일** | 2026-11-18 |
| **조치 상태** | 미조치 (본 Task 범위 밖 — 후속 정산 Task #1376에서 함께 처리 권장) |
| **소스 소유** | Team B (`src/app/actions/finance/ups-actual-cost.ts`) |

## 현상

`recordActualCostAndFinalize`의 기타부가운임 저장 블록은 **목록이 비어있지 않을 때만** 기존 행 삭제 + 재삽입을 수행한다.

```ts
// src/app/actions/finance/ups-actual-cost.ts:644
if (computed.otherCharges.length > 0) {
  await supabase.from('zen_ups_actual_other_charges').delete().eq('order_id', orderId);
  ...
}
```

- 사용자가 기타부가운임을 모두 삭제(빈 목록)한 뒤 저장하면 **이전 자식 행이 그대로 남는다.**
- 메인 `zen_ups_actual_cost.other_charges_hkd`는 새 계산값(0 또는 KRW 합계)으로 갱신되므로 **메인 ↔ 자식 정합성이 깨진다.**

## 영향 범위

- `zen_ups_actual_other_charges`를 읽는 대사·청구서 항목 전개(후속 #1376 정산/청구서)에서 삭제된 부가운임이 계속 표시될 수 있다.
- 원가 총액(`total_cost_krw`)은 메인 합계 기준이라 금액 자체는 왜곡되지 않으나, 항목별 내역이 실제와 달라진다.
- TASK-B-364 이전부터 존재하던 동작이며(기존 `input.otherCharges && length > 0` 조건), 이번 Task가 새로 만든 결함은 아니다.

## 권장 조치

1. **항상 삭제 후 조건부 삽입**으로 변경:
   ```ts
   await supabase.from('zen_ups_actual_other_charges').delete().eq('order_id', orderId);
   if (computed.otherCharges.length > 0) { /* insert */ }
   ```
2. 회귀 테스트: 기타부가운임 2행 저장 → 빈 목록으로 재저장 → 자식 행 0건 + 메인 `other_charges_hkd=0` 단언(실제 Supabase mock/DB).
3. 청구서 Task(#1375·#1376)에서 자식 행을 항목으로 전개하기 전에 처리 필요.

## 관련 파일

- `src/app/actions/finance/ups-actual-cost.ts` (기타부가운임 저장 블록)
- `zen_ups_actual_other_charges` (자식 테이블)
- 관련 Task: #1374(TASK-B-364), 후속 #1376(오더정산 구현)
