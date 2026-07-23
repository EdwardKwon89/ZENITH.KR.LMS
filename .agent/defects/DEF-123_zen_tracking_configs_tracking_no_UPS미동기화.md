# DEF-123: zen_tracking_configs.tracking_no가 실제 UPS 운송장번호로 갱신되지 않음

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-23 |
| **보고자** | jungjs |
| **긴급도** | Medium |
| **우선순위** | P3 |

## 현상

UPS 오더가 실제로 등록되어 진짜 운송장번호(예: `1ZJ443D30439798553`)를 부여받아도, `zen_tracking_configs.tracking_no`는 오더 등록 시점의 placeholder(`ZN-ZEN-2026-000001`)에 계속 머물러 있음.

## 실측 확인

동일 오더 2건을 두 테이블에서 각각 조회:

| order_id | `zen_tracking_configs.tracking_no` | `zen_ups_labels.tracking_number`(실제) |
|---|---|---|
| `303f3ee1...` | `ZN-ZEN-2026-000001` | `1ZJ443D30439798553` |
| `aabf2f5a...` | `ZN-ZEN-2026-000002` | `1ZJ443D30432290685` |

두 오더 모두 유효한(`is_voided=false`) UPS 라벨이 존재하는데도 `zen_tracking_configs.tracking_no`는 갱신되지 않음.

## 근본 원인

`tracking_no`는 `create_order_atomic` RPC가 오더 등록 시 `'ZN-' || v_order_no`로 1회 INSERT할 뿐(`supabase/migrations/20260715000001_iss489_ups_order_schema_v5.sql:131-135`), 이후 실제 UPS 운송장번호가 발급되는 시점(`registerUpsOrder()`, `src/app/actions/operations/ups-labels.ts:294-344`)에 `zen_tracking_configs`를 갱신하는 코드가 어디에도 없음. 실제 UPS 운송장번호는 `saveInitialLabel()`([ups-labels.ts:197-216](src/app/actions/operations/ups-labels.ts#L197-L216))을 통해 `zen_ups_labels.tracking_number`에만 저장되고, `zen_tracking_configs`와는 완전히 분리되어 있음.

## 영향 범위

- `TrackingDashboard.tsx`(통합 트래킹) 검색창·목록의 "Tracking Number" 컬럼이 실제 운송장번호가 아닌 placeholder를 표시
- [`ups-actual-charges.ts:305`](src/app/actions/finance/ups-actual-charges.ts#L305) `.ilike('tracking_no', ...)` 검색 — 실제 UPS 운송장번호로 검색 불가

## 조치안 (사용자 확정 지시, 2026-07-23)

`registerUpsOrder()`가 `orderResult.trackingNo`(실제 UPS 운송장번호)를 획득해 `saveInitialLabel()`로 `zen_ups_labels`에 저장하는 시점([ups-labels.ts:326](src/app/actions/operations/ups-labels.ts#L326) 직후)에, 같은 값으로 `zen_tracking_configs.tracking_no`도 함께 갱신:

```ts
if (orderResult.trackingNo) {
  await supabase
    .from('zen_tracking_configs')
    .update({ tracking_no: orderResult.trackingNo, updated_at: new Date().toISOString() })
    .eq('order_id', order.id);
}
```

**주의**: `provider_type`/`provider_name` 갱신 여부는 별도 결정 사항(Issue #770, Edward 협의 대기 중)이므로 본 Task 범위에 포함하지 않음 — `tracking_no` 컬럼만 갱신한다.

## 관련 파일
- `src/app/actions/operations/ups-labels.ts` (`registerUpsOrder()`, `saveInitialLabel()`)
- 참고: Issue #770(provider_type/provider_name 관련 별도 논의)
