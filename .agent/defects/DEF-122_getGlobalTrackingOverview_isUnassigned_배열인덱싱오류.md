# DEF-122: getGlobalTrackingOverview() is_unassigned 계산 시 배열 인덱싱 오류 — 정상 오더도 "Unassigned"로 오분류

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-23 |
| **보고자** | jungjs |
| **긴급도** | Medium |
| **우선순위** | P3 |

## 현상

`/ko/tracking`(통합 트래킹) 목록에서 shipper_id·recipient_name이 실제로 존재하는 정상 오더도 "Unassigned" 배지가 표시됨.

## 근본 원인

`src/app/actions/operations/tracking.ts:230`
```js
const isUnassigned = !config.order?.[0]?.shipper_id && !config.order?.[0]?.recipient_name;
```

`zen_tracking_configs`↔`zen_orders`는 N:1 관계라 PostgREST 임베딩(`order:zen_orders(...)`)이 `order`를 **객체**로 반환한다(배열 아님). 실측 REST 쿼리 결과:
```json
"order": {
  "id": "303f3ee1-...",
  "order_no": "ZEN-2026-000001",
  "shipper_id": "7e4068a7-a3f2-4b82-a2a6-af11153a5ae0",
  "recipient_name": "james bonds"
}
```
객체를 `?.[0]`으로 배열처럼 인덱싱하면 JS에서 항상 `undefined`를 반환하므로, `isUnassigned`는 **실제 데이터 존재 여부와 무관하게 항상 `true`**로 계산됨.

같은 파일 프론트엔드(`src/components/tracking/TrackingDashboard.tsx:195,203`)는 `track.order?.order_no`, `track.order?.recipient_name`처럼 `[0]` 없이 정확히 접근하고 있어 주문번호/수하인명 자체는 정상 표시됨 — `is_unassigned` 계산 함수 한 곳만의 오류.

## 실측 확인

로컬 DB에 동일 nested select 직접 실행 — 3건 중 2건(ZEN-2026-000001, ZEN-2026-000002)이 shipper_id·recipient_name 모두 존재하는 정상 오더인데도 현재 로직상 `is_unassigned=true`로 계산됨.

## 조치안

```js
const isUnassigned = !config.order?.shipper_id && !config.order?.recipient_name;
```

## 관련 파일
- `src/app/actions/operations/tracking.ts` (`getGlobalTrackingOverview()`, 230행)
- 참고(정상 접근 패턴): `src/components/tracking/TrackingDashboard.tsx` 195·203행
