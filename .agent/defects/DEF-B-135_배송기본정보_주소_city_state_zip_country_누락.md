# DEF-B-135: UPS 상세 "배송 기본 정보" 카드 — 화주/수령인 주소에 city/state/zipcode/country 누락

**발견일**: 2026-08-16
**발견자**: JSJung (실사용 확인) → Jaison 원인 분석
**긴급도**: Medium

## 현상

UPS 오더 상세페이지(`ups-detail/page.tsx`) 우측 "배송 기본 정보 (Shipper / Consignee)" 카드에서 화주·수령인 주소가 street 주소 한 줄만 표출됨. 실제 DB에는 city/state_province/zipcode/country_code가 모두 채워져 있는데 화면에 반영되지 않음.

**예시**: ZEN-2026-000008 — DB상 `recipient_address='it venture tower', recipient_city='Weihai', recipient_state_province='SD', recipient_zipcode='02750', recipient_country_code='CN'`이지만 화면에는 "주소: it venture tower"만 표출됨.

## 원인

TASK-B-305(영문 주소 출력 규칙 통일, PR#1134) 설계 시 작업범위를 "CI/PL/UPS Invoice 주소 조합에 city/state/zipcode/country 포함"으로만 명시(`.agent/tasks/TASK-B-305_...md` 작업범위 5번) — 정작 페이지 화면의 "배송 기본 정보" 카드 자체는 범위에서 누락시킴(Jaison 설계 누락). Mike는 지시받은 범위(CI/PL/UPS Invoice) 내에서는 정확히 구현했음 — Mike의 구현 결함 아님.

`ups-detail/page.tsx` 해당 블록:
```tsx
{(order.shipper_address || (order.shipper as any)?.address) && (
  <span className="text-slate-500 block">
    주소: {resolveShipperStreet(order, (order as any).shipper)}
  </span>
)}
...
{order.recipient_address && <span className="text-slate-500 block">주소: {resolveConsigneeStreet(order)}</span>}
```
city/state/zipcode/country 필드는 조회는 되고 있으나(다른 곳의 ciData 등에서는 사용) 이 카드에는 아예 붙지 않음.

## 권장 조치

TASK-B-306으로 처리: 위 두 줄에 CI/PL PDF와 동일한 포맷(`{[city, state, zipcode].join(', ')} {country}`)으로 city/state/zipcode/country 라인 추가.
