# TASK-B-306: UPS 상세 배송기본정보 카드 — 주소에 city/state/zipcode/country 추가

- **GitHub Issue**: [#1135](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1135)
- **관련 결함**: [DEF-B-135](.agent/defects/DEF-B-135_배송기본정보_주소_city_state_zip_country_누락.md)
- **등록일**: 2026-08-16
- **등록자**: Jaison (JSJung 실사용 피드백)
- **담당**: Mike
- **우선순위**: P2
- **상태**: 🔄 착수 가능 (설계 자명, 착수 직행)

## [배경]

TASK-B-305(PR#1134) 머지 후 JSJung이 실제 UPS 오더 상세페이지를 확인한 결과, "배송 기본 정보 (Shipper / Consignee)" 카드에서 수령인 주소가 "주소: it venture tower"처럼 street 한 줄만 나오고 도시/주/우편번호/국가가 빠져 있는 것을 발견. 원인 확인 결과 TASK-B-305 설계 시 이 카드를 작업범위에서 누락시킨 Jaison의 설계 누락으로 확인됨(Mike는 지시받은 범위 내에서는 정확히 구현).

## [조사 결과]

`src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`의 "배송 기본 정보" 카드:
```tsx
{(order.shipper_address || (order.shipper as any)?.address) && (
  <span className="text-slate-500 block">
    주소: {resolveShipperStreet(order, (order as any).shipper)}
  </span>
)}
...
{order.recipient_address && <span className="text-slate-500 block">주소: {resolveConsigneeStreet(order)}</span>}
```
city/state_province/zipcode/country_code는 DB에 값이 있어도(예: ZEN-2026-000008 — city='Weihai', state='SD', zipcode='02750', country='CN') 이 카드에 전혀 반영되지 않음. 같은 페이지의 `ciData`/`plData`/`upsInvoiceData`(CI/PL/UPS Invoice PDF 데이터)는 이미 TASK-B-305에서 city/state/zipcode/country를 포함하도록 수정됨 — 그 포맷을 그대로 재사용하면 됨.

## [작업 범위]

1. 화주 주소 라인 아래에 city/state/zipcode/country 라인 추가:
   ```tsx
   {[order.shipper_city, order.shipper_state_province, order.shipper_zipcode].filter(Boolean).join(', ')}
   {order.shipper_country_code ? ` ${order.shipper_country_code}` : ''}
   ```
2. 수령인 주소 라인 아래에 동일 패턴 추가(`recipient_*` 필드 사용)
3. `CommercialInvoicePDF.tsx`/`PackingListPDF.tsx`의 렌더링 조건과 동일하게 값이 하나라도 있을 때만 표시(빈 줄 방지)

## [회귀 테스트 방향]

- city/state/zipcode/country 모두 있는 케이스: 한 줄로 조합되어 표출
- 일부 필드만 있는 케이스: 있는 값만 조합(공백/쉼표 중복 없이)
- 전부 없는 케이스: 라인 자체 미표출

## [R-10]

ZEN-2026-000008(또는 city/state/zip 값이 있는 실제 오더)로 UPS 상세페이지 스크린샷 첨부 — 화주/수령인 양쪽 모두 확인.

## [작업 결과]

_(Mike 작성 예정)_

## [Jaison 최종 검토]

_(PR 제출 후 작성)_

## [발견 이슈]

없음
