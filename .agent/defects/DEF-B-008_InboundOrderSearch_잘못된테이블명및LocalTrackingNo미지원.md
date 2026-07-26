# DEF-B-008: `getOrderByBarcodeOrNo()` 잘못된 테이블명으로 항상 조회 실패 + Local Tracking No 조회 미지원

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) — `/ko/warehouse/inbound` 오더번호 조회 불가 신고 → 원인 조사 |
| **긴급도** | High (입고 처리 화면 핵심 기능 전면 마비) |
| **우선순위** | P1 |

## 현상 1 — 오더번호/바코드 조회가 항상 실패

`/ko/warehouse/inbound`에서 오더 번호(또는 바코드)로 조회 시 항상 실패.

## 원인 (실측 확인)

`getOrderByBarcodeOrNo()`(`src/app/actions/operations/orders.ts:614-660`)의 select 절이 존재하지 않는 테이블명을 참조:
```ts
.select(`
  *,
  shipper:zen_organizations!shipper_id(name),
  origin_port:zen_ports!origin_port_id(name, code),
  dest_port:zen_ports!dest_port_id(name, code),
  order_packages(order_id, packing_unit, packing_count, length, width, height, gross_weight, volume)
`)
```
실제 테이블은 `zen_order_packages`(전체 스키마에서 일관되게 `zen_` 접두사 사용)인데 `order_packages`로 참조 — PostgREST가 관계를 찾지 못해 **역할·오더 존재 여부와 무관하게 매번** 아래 에러를 던집니다:
```json
{"code":"PGRST200","message":"Could not find a relationship between 'zen_orders' and 'order_packages' in the schema 'public'","hint":"Perhaps you meant 'zen_order_packages' instead of 'order_packages'"}
```

**RLS 권한 문제 아님 확인 완료** — ADMIN/MANAGER/AGENCY 세션으로 동일 select 절을 REST로 직접 호출해 재현, 순수 코드 오타로 인한 쿼리 실패임을 확인. 바코드(UUID) 경로도 동일 select 절을 공유해 똑같이 깨져 있음.

## 현상 2 — Local Tracking No(domestic_ref_no)로 조회 불가

`zen_order_packages.domestic_ref_no`("Local Tracking No", 오더 등록 시 패키지별 입력 필드)로 오더를 찾는 로직이 전혀 없음. 현재 `getOrderByBarcodeOrNo()`는 UUID 또는 `zen_orders.order_no` 정확 일치만 검사.

## 조치안 (Jaison 확정 설계) — 상세는 TASK-B-214 참조

1. `order_packages(...)` → `order_packages:zen_order_packages(...)`로 정정(별칭 사용해 기존 반환 키 `order.packages` 유지)
2. `order_no`로 못 찾을 경우 `zen_order_packages.domestic_ref_no`로 2차 조회 → 매칭되는 패키지의 `order_id`로 오더 반환

## 관련 Task
- `TASK-B-214` (배정 예정)

## 관련 파일
- `src/app/actions/operations/orders.ts:614-660` (`getOrderByBarcodeOrNo`)
- `src/components/warehouse/InboundProcessForm.tsx` (호출부, 변경 불필요)
