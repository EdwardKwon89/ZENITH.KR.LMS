# DEF-B-011: UPS 접수취소/라벨폐기 성공 시 `zen_tracking_configs.tracking_no` 리셋 누락

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) — 실사용 중(removeorder 성공 후) tracking number 미초기화 신고 → 원인 조사 |
| **긴급도** | Medium |
| **우선순위** | P2 |

## 현상 (실측 확인)

`ZEN-2026-000001`에서 UPS 접수취소(`cancelUpsRegistration`) 수행 → SHXK `removeorder` 성공(mock, `success=true`), `zen_ups_labels` 레코드 정상 삭제(0건 확인) — **그런데 `zen_tracking_configs.tracking_no`는 등록 당시 값(`MOCK-26000001`)이 그대로 남아있음.**

```
zen_shxk_api_logs: removeorder 13:03:48 success=true (mock)
zen_ups_labels: 0건 (정상 삭제됨)
zen_tracking_configs: tracking_no='MOCK-26000001' (그대로)
```

## 원인

`src/app/actions/operations/ups-labels.ts` 전체에서 `zen_tracking_configs`를 갱신하는 코드는 **`registerUpsOrder()`(등록 시점, DEF-123) 단 한 곳뿐**입니다. `cancelUpsRegistration()`(440-514행)과 `voidUpsLabel()`(593-623행)은 SHXK 회수(`removeorder`) 성공 후 `zen_ups_labels`/문서/패키지 잠금 등은 정리하지만, **`zen_tracking_configs.tracking_no`를 다시 비우는 로직이 없어** 이미 삭제된 라벨의 옛 운송장번호가 계속 남아 사용자에게 잘못된 정보를 보여줍니다.

이전에 고친 DEF-B(TASK-B-211, PR#860)는 "실패 시 삭제를 막는" 수정이었고, 이번 건은 **"성공 경로에서 리셋이 아예 없는"** 별개의 결함입니다.

## 조치안 (Jaison 확정 설계)

두 함수 모두 성공 경로 마지막(`revalidatePath` 직전)에 `tracking_no` 리셋 추가:

### 1. `cancelUpsRegistration()` — `ups-labels.ts:504-506` 사이
```ts
const { error: trackingResetErr } = await supabase
  .from('zen_tracking_configs')
  .update({ tracking_no: null })
  .eq('order_id', orderId);
if (trackingResetErr) {
  logger.warn(`zen_tracking_configs tracking_no reset warning for order ${orderId}: ${trackingResetErr.message}`);
}

revalidatePath("/(dashboard)/warehouse/outbound", "page");
```

### 2. `voidUpsLabel()` — `ups-labels.ts:614-615` 사이
```ts
const { error: trackingResetErr } = await supabase
  .from('zen_tracking_configs')
  .update({ tracking_no: null })
  .eq('order_id', orderId);
if (trackingResetErr) {
  logger.warn(`zen_tracking_configs tracking_no reset warning for order ${orderId}: ${trackingResetErr.message}`);
}

revalidatePath("/(dashboard)/warehouse/outbound", "page");
```

두 곳 다 `logger.warn`만 남기고 전체 함수 실패로 처리하지 않습니다(핵심 취소/폐기 작업은 이미 완료된 뒤의 부가 정리 단계이므로, 리셋 실패로 전체 롤백하지 않는 게 기존 코드의 storage 삭제 경고 패턴과 일관됨).

## 참고 — DEF-B-010(TASK-B-216)과의 연관

이 리셋 UPDATE도 AGENCY 세션에서 수행될 수 있어, DEF-B-010에서 추가한 `zen_tracking_configs` AGENCY UPDATE RLS 정책이 필요합니다. TASK-B-216(PR#870)이 먼저 병합되어 있어야 이 기능이 AGENCY 역할에서도 정상 동작합니다 — 순서 확인 필요.

## 관련 Task
- `TASK-B-217` (배정 예정)

## 관련 파일
- `src/app/actions/operations/ups-labels.ts:440-514` (`cancelUpsRegistration`)
- `src/app/actions/operations/ups-labels.ts:593-623` (`voidUpsLabel`)
