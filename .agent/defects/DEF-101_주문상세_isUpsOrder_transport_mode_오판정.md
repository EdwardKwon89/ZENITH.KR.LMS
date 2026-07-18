# DEF-101: 주문 상세 페이지 `isUpsOrder` 판정이 실제 UPS(SHXK) 오더의 `transport_mode`와 불일치

## 발견 경위
사용자 요청("무역서류 관리 섹션에 운송장/Invoice/세관신고서/UPS등록취소 버튼 추가")을 분석·설계하기 위해 `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx`를 조사하던 중 발견.

```ts
// page.tsx:85
const isUpsOrder = order.transport_mode === 'EXP';
```

그런데 실제 SHXK 연동이 되는 UPS 오더의 `transport_mode` 값을 DB에서 직접 확인:
```sql
SELECT order_no, transport_mode, ups_product_code FROM zen_orders WHERE ups_product_code IS NOT NULL;
-- ZEN-2026-000001 | UPS | WW_SAVER_NONDOC
```
`ups_product_code`가 실제로 채워진(=SHXK createorder 대상) 오더의 `transport_mode`는 `'UPS'`이지 `'EXP'`가 아닙니다. `OrderRegistrationForm.tsx`에서도 UPS Direct 선택 시 `transport_mode: 'UPS'`로 저장됨을 확인했습니다(`{ code: 'UPS', ... label: 'UPS Direct' }`).

## 현상
`isUpsOrder`가 `'EXP'`만 검사하기 때문에, 실제 UPS(SHXK) 오더에서는 `isUpsOrder`가 항상 `false`로 평가됩니다. 그 결과:
- 무역서류 관리 섹션의 **UPS Invoice PDF 다운로드 버튼이 실제 UPS 오더에서 노출되지 않음**(548행 `{isUpsOrder && canPrintUpsInvoice && upsInvoiceData && (...)}`)
- `upsInvoiceData` 자체도 `isUpsOrder ? {...} : null`(199행)이라 애초에 데이터도 안 만들어짐

## 영향 범위
- 주문 상세 페이지의 UPS Invoice PDF 다운로드 기능 — 실질적으로 한 번도 정상 노출된 적 없을 가능성 높음(TASK-148/IMP-117로 만들어진 기능)
- 이번에 추가하는 신규 버튼(운송장/Invoice/세관신고서/UPS등록취소)도 이 판정 로직을 재사용하면 동일하게 매몰될 위험 — 설계 시 `order.transport_mode === 'UPS'` 기준으로 별도 처리 필요

## 긴급도
Medium — 기능이 아예 없는 게 아니라 노출 조건이 잘못되어 항상 숨겨지는 UI 버그. 데이터 무결성 문제는 아님.

## 권장 조치
`isUpsOrder = order.transport_mode === 'EXP'` → `order.transport_mode === 'UPS'`로 수정. `'EXP'` 자체가 별도의 유효한 transport_mode(일반 특송, UPS와 무관)인지 확인 후, `'EXP'`도 포함해야 하는 경우라면 `['EXP', 'UPS'].includes(order.transport_mode)`로 변경.

## 관련 파일
`src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx` (85행 `isUpsOrder`, 199행 `upsInvoiceData`, 548행 조건부 렌더링)

## 보고
Aiden에게 R-18 절차에 따라 보고 필요.
