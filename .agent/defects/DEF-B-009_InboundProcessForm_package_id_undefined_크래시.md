# DEF-B-009: `getOrderByBarcodeOrNo()` package select에 `id` 필드 누락 — 입고처리 화면 크래시

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) — DEF-B-008(PR#866) 머지 후 실사용 중 발견 |
| **긴급도** | 즉시 (입고처리 화면 자체가 크래시 — 패키지 있는 오더는 전혀 사용 불가) |
| **우선순위** | P1 |

## 현상

`/ko/warehouse/inbound`에서 오더를 조회하면 다음 크래시 발생:
```
TypeError: Cannot read properties of undefined (reading 'substring')
  at InboundProcessForm.tsx:305:115
```

## 원인

`InboundProcessForm.tsx:305`:
```tsx
<span>{pkg.packing_unit || "패키지"} #{pkg.id.substring(0, 8)}</span>
```
`pkg.id`가 `undefined`. 원인은 `getOrderByBarcodeOrNo()`(`src/app/actions/operations/orders.ts:660`)의 select 절이 패키지 필드에 `id`를 포함하지 않음:
```ts
order_packages:zen_order_packages(order_id, packing_unit, packing_count, length, width, height, gross_weight, volume)
```
**이 필드 누락은 DEF-B-008(PR#866)에서 새로 생긴 게 아니라 원래부터 있던 결함**입니다 — 이전에는 테이블명 오타(DEF-B-008)로 쿼리 자체가 항상 PGRST200 에러를 던져 이 렌더링 코드까지 도달한 적이 없어 드러나지 않았을 뿐입니다. DEF-B-008 수정으로 쿼리가 정상 동작하게 되면서 이 잠재 결함이 노출됨.

## 부가 영향

`pkg.id`가 `undefined`인 채로 `packageEdits[pkg.id]`(300, 314행 등)에 쓰이면 JS가 키를 문자열 `"undefined"`로 강제 변환 — 패키지가 2개 이상인 오더는 중량/부피 수정 시 모든 패키지의 편집값이 같은 키로 충돌하고, `confirmInbound()` 호출 시 `packageId: "undefined"`가 서버로 전송되어 실제 패키지를 못 찾음. 크래시 때문에 화면 자체가 안 뜨니 지금은 체감되지 않지만, `id` 필드 추가 시 이 부분도 자동 해결됨(별도 코드 변경 불필요 — `pkg.id`가 실제 값을 갖게 되므로).

## 조치안 (Jaison 확정 설계)

`src/app/actions/operations/orders.ts:660` select 필드 목록에 `id` 추가:
```ts
order_packages:zen_order_packages(id, order_id, packing_unit, packing_count, length, width, height, gross_weight, volume)
```
한 단어(`id,`) 추가가 전부입니다. 프론트엔드(`InboundProcessForm.tsx`)는 이미 `pkg.id`를 참조하고 있어 변경 불필요.

## 관련 Task
- `TASK-B-215` — 수정 완료 (`d57c0140`, D_Kai 대리 구현)

## 관련 파일
- `src/app/actions/operations/orders.ts:660` (`getOrderByBarcodeOrNo`)
- `src/components/warehouse/InboundProcessForm.tsx:299-370` (패키지 렌더링 + 중량/부피 수정, 변경 불필요)
