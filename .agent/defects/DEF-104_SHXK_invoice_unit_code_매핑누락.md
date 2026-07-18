# DEF-104: SHXK createorder `invoice[].unit_code` 필드가 payload에 아예 없음

## 발견 경위
JSJung이 `SHXK_TEST_MOCK=false`로 오더 ZEN-2026-000001 실제 createorder 테스트 중 발견(DEF-103, 품명 한글 오류에 이은 세 번째 오류):
```
API创建并预报订单失败：创建预报失败!Invalid or missing Product/Unit/UnitOfMeasurement/Code for product number 1. Valid length is 1 to 3 alphanumeric
```
IMP-142로 우선 기록만 해뒀다가(`scratch/post_launch_improvements.md`), JSJung 지시로 Issue #573(Mike 담당) 발령해 정식 착수.

## 근본 원인
SHXK API 스펙(`docs/80_RawData/Phase8_UPS_API_리서치_결과.md:153`) — `invoice[].unit_code`: `단위: MTR(미터)/PCE(개)/SET(세트), 기본 PCE`. 문서상 "기본 PCE"라 생략 가능해 보이지만 실제 SHXK 서버는 누락 시 위 오류로 거부함.

`src/lib/ups/label-mapping.ts:23~38`의 `buildInvoiceFromItems()`는 `invoice_enname`/`invoice_quantity`/`invoice_unitcharge`/`sku`/`hs_code`만 매핑하고 `unit_code`는 payload 객체에 키 자체가 없음.

## 영향 범위
품목이 있는 모든 오더의 실제 SHXK createorder — mock 모드에서는 이 검증이 없어 지금까지 발견 안 됨(DEF-103과 동일 패턴).

## 긴급도
High — 오더 등록 자체는 정상이나, SHXK 실연동(createorder)이 이 오류로 전부 막힘.

## 권장 조치
`zen_order_items.item_packing_unit`(EA/SET/PCS, 폼 드롭다운 고정 3종 — `OrderRegistrationForm.tsx:164~166`) → SHXK `unit_code`(MTR/PCE/SET) 매핑 테이블 신규 추가 + Packing Unit 드롭다운에 MTR 옵션 추가. 상세 설계는 Issue #573 참조.

## 관련 파일
`src/lib/ups/label-mapping.ts`, `src/components/orders/OrderRegistrationForm.tsx`

## 보고
JSJung 직접 지시로 착수(Issue #573, Mike 담당).
