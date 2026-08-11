# DEF-B-047 — UPS 오더 상세(`/orders/[id]/ups-detail`) 도착국 표시가 항상 'US'로 표시됨

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung — `ups-detail` 페이지 도착국/Zone 정보 확인 요청 (`ZEN-2026-000008`, 실제 목적지 중국) |
| **긴급도** | Medium — 표시 전용 결함(실제 청구/계산에는 영향 없음), 하지만 운영자가 오더 목적지를 오인할 수 있음 |
| **현재 상태** | 미수정 |

## 근본 원인 (확정)

`src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx:266`:
```tsx
destCountryCode={(order as any).dest_country_code || (order.dest_port as any)?.country_code || 'US'}
```
- `dest_country_code`는 `zen_orders` 테이블에 **존재하지 않는 컬럼**(`\d zen_orders` 확인 — 실제 컬럼명은 `recipient_country_code`). `as any` 캐스팅이 컴파일 타임 오류를 숨겨 항상 `undefined`.
- `dest_port_id`는 UPS 오더(포트 기반이 아닌 직배송)에서 항상 비어있음 → `order.dest_port`도 `null`.
- 결과: 두 값 모두 실패해 하드코딩된 폴백 `'US'`가 항상 사용됨. 실제 목적지(`ZEN-2026-000008`은 중국)와 무관하게 화면에 "도착국: US"만 표시됨.

## 수정 방향

```tsx
destCountryCode={order.recipient_country_code || (order.dest_port as any)?.country_code || 'US'}
```
`getOrderDetails()`가 `recipient_country_code`를 이미 select하고 있는지 확인 필요(구현자 확인) — 안 하고 있다면 select 목록에 추가.

## 회귀 테스트 (필수)

- UPS 오더(포트 없음) + `recipient_country_code='CN'` → `UpsOrderBreakdownCard`에 전달되는 `destCountryCode`가 'CN'인지 확인
- 레거시/예외 케이스(둘 다 없음) → 'US' 폴백 유지되는지 확인(회귀 방지)
- **되돌리기 검증 필수**
