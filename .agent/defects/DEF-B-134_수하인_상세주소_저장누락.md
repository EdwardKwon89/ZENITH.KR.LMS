# DEF-B-134: 수하인 상세주소(recipient_address_detail) 저장 누락

**발견일**: 2026-08-16
**발견자**: Jaison (TASK-B-305 영문 주소 출력 규칙 분석 중 발견)
**긴급도**: High

## 현상

주문 등록/수정 시 수하인 상세주소(동/호수, 건물명 등)를 입력해도 DB에 저장되지 않고 유실됨.

## 원인

- `zen_orders` 테이블에 `recipient_address_detail` 컬럼 자체가 존재하지 않음 (화주는 `shipper_address_detail` 컬럼이 있으나 수하인은 없음).
- 폼(`OrderRegistrationForm.tsx`), Zod 검증(`src/lib/validation/order.ts:65`), 엑셀 대량등록(`bulk-orders.ts:116`)까지는 값이 정상적으로 전달되지만, `src/app/actions/operations/orders.ts`의 `createOrder()`/`updateOrder()`가 `recipient_address`만 DB에 insert하고 `recipient_address_detail`은 어디에도 쓰지 않아 조용히 버려짐.

## 영향 범위

- 수하인 상세주소가 필요한 모든 배송(아파트/오피스텔 동호수, 건물 내 부서명 등)에서 실제 배송지 정보 누락 가능성.
- UPS 라벨/통관서류(label-mapping.ts)에도 수하인 상세주소가 반영될 수 없는 구조.

## 권장 조치

TASK-B-305(영문 주소 출력 규칙)에 포함하여 처리:
1. `zen_orders.recipient_address_detail` 컬럼 추가 마이그레이션
2. `createOrder()`/`updateOrder()`에 저장 로직 추가
3. label-mapping.ts 등 소비처에 반영 검토
