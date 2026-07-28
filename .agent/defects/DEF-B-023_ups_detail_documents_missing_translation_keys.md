# DEF-B-023: UPS 오더 상세 페이지 — 무역서류(CI/PL/UPS Invoice) PDF 라벨 번역키 대량 누락

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 요청으로 `orders/[orderId]/ups-detail` 페이지 실측 점검 중 Jaison이 직접 재현·근본원인 확인 (DEF-B-021과 동일 세션에서 발견, 별개 원인이라 별도 등록) |
| **긴급도** | Medium |
| **영향 범위** | `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`가 생성하는 3개 PDF 문서(Commercial Invoice, Packing List, UPS Invoice)의 라벨 텍스트 전체 |
| **관련 파일** | `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx` (lines 104-136, `docLabels` 객체) · `messages/ko.json`(및 `en.json`) `Documents` 네임스페이스 |

## 현상

`ups-detail` 페이지를 로드하면 서버 콘솔에 `MISSING_MESSAGE: Could not resolve 'Documents.commercial_invoice' in messages for locale 'ko'` 형태의 next-intl 에러가 페이지 1회 로드당 25회 이상 발생(Playwright로 직접 재현·캡처 확인). 이 페이지가 생성하는 Commercial Invoice PDF·Packing List PDF·UPS Invoice PDF의 라벨(수출자/수하인/HS코드/수량/단가/소계/합계/통화/신고문구/포장수/순중량/총중량 등)이 전부 이 방식으로 조회되므로, 실제 다운로드되는 PDF 문서의 라벨 텍스트가 비어있거나 깨질 것으로 판단됨(다운로드 자체는 미실행 확인 — 코드 경로상 확인).

## 근본 원인

`page.tsx:107-136`의 `docLabels` 객체가 `tDoc(...)` (namespace `Documents`)로 다음 키들을 요청:
`commercial_invoice, packing_list, exporter, consignee, date, order_no, hs_code, item_desc, quantity, unit_price, sub_total, total, currency, declaration, declaration_text, generated_on, transport_mode, express_air, qty, pkgs, net_weight, gross_weight, total_pkgs, trade_terms, invoice_no, pl_no, remarks, remarks_text`

그런데 `messages/ko.json`의 실제 `Documents` 네임스페이스(414행~)에는 `title/description/search_order_no/ci/pl/preview/download/select_order/...` 등 **완전히 다른 키 집합**만 존재 — 이 네임스페이스는 `/documents`(무역서류 관리 목록·검색) 페이지용으로 만들어진 것으로 보이며, PDF 컴포넌트(`CommercialInvoicePDF`/`PackingListPDF`/`UpsInvoicePDF`)가 실제로 필요로 하는 라벨 키 집합과 전혀 매칭되지 않음.

## 권장 조치

1. `messages/ko.json`·`messages/en.json`의 `Documents` 네임스페이스에 위 28개 키를 실제 한글/영문 라벨로 추가(기존 키는 그대로 유지 — 다른 페이지가 사용 중일 수 있음)
2. 추가 후 `ups-detail` 페이지 로드 시 MISSING_MESSAGE 에러가 0건인지 재확인
3. 실제로 PDF 3종(CI/PL/UPS Invoice)을 다운로드해 라벨이 정상 출력되는지 R-10 스크린샷/PDF 캡처로 확인
4. 회귀 테스트: `docLabels`의 각 키가 실제로 `Documents` 네임스페이스에 존재하는지(또는 페이지 렌더 시 MISSING_MESSAGE 콘솔 에러가 발생하지 않는지) 검증하는 behavioral 테스트 추가
