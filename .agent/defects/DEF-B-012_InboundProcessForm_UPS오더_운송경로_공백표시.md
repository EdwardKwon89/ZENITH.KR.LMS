# DEF-B-012: 입고처리 화면 "운송 경로"가 UPS 오더에 항상 공백("- → -")으로 표시됨

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) — `/ko/warehouse/inbound` 실사용 중 지적 |
| **긴급도** | Low |
| **우선순위** | P3 |

## 현상

`/ko/warehouse/inbound`에서 UPS 오더(예: `ZEN-2026-000001`) 조회 시 "운송 경로" 필드가 항상 "- → -"로 표시됨.

## 원인

`InboundProcessForm.tsx`(약 275-280행):
```tsx
<span className="text-slate-500 block text-xs">{t("route")}</span>
<span className="font-semibold text-slate-900 flex items-center gap-1.5">
  {order.origin_port?.code || "-"}
  <ArrowRight size={12} className="text-slate-400" />
  {order.dest_port?.code || "-"}
</span>
```
`origin_port`/`dest_port`는 `zen_orders.origin_port_id`/`dest_port_id`(항구/공항 기반, AIR/SEA/LAND 전용) 조인 결과입니다. UPS 오더는 포트가 아니라 주소 기반 배송이라 이 두 컬럼이 항상 NULL — 대신 `shipper_country_code`/`recipient_country_code`가 채워져 있는데 화면에서 전혀 참조하지 않아 폴백 없이 공백만 노출됩니다.

`getOrderByBarcodeOrNo()`(`orders.ts`)의 select는 `zen_orders.*`라 `shipper_country_code`/`recipient_country_code`는 이미 응답에 포함되어 있음(별도 쿼리 변경 불필요) — 프론트엔드 표시 로직만 수정하면 됩니다.

## 조치안 (Jaison 확정 설계)

```tsx
<span className="font-semibold text-slate-900 flex items-center gap-1.5">
  {order.origin_port?.code || order.shipper_country_code || "-"}
  <ArrowRight size={12} className="text-slate-400" />
  {order.dest_port?.code || order.recipient_country_code || "-"}
</span>
```
포트 정보가 있으면 그대로(AIR/SEA/LAND), 없으면 국가 코드로 폴백(UPS).

## 관련 Task
- `TASK-B-219` (배정 예정)

## 관련 파일
- `src/components/warehouse/InboundProcessForm.tsx` (약 275-280행 — TASK-B-218 동시 작업으로 라인 번호 변동 가능, `order.origin_port?.code` 검색으로 위치 확인)
