# DEF-102: PDF 다운로드 기능 전체 — CSP `connect-src`가 `data:` URI를 차단해 yoga-layout WASM 로드 실패

## 발견 경위
JSJung이 실제 브라우저에서 작업 결과를 확인하던 중 아래 CSP 위반 콘솔 에러를 보고:
```
data:application/octet-stream;base64,AGFzbQEAAAAB... violates the following Content Security Policy directive:
"connect-src 'self' https://*.supabase.co https://*.sentry.io https://cdn.jsdelivr.net https://t1.kakaocdn.net
https://t1.daumcdn.net http://127.0.0.1:54321 http://localhost:54321 ws://localhost:3000 ws://127.0.0.1:3000"
```
Jaison이 base64 페이로드를 디코드해 WebAssembly 매직넘버(`\0asm`)임을 확인했고, `node_modules` 전체 검색으로 소스를 특정:
```bash
grep -rl "data:application/octet-stream;base64" node_modules --include="*.js"
# → node_modules/yoga-layout/dist/binaries/yoga-wasm-base64-esm.js
```

## 현상
`@react-pdf/renderer`는 내부 flexbox 레이아웃 계산에 `yoga-layout`을 쓰는데, 이 라이브러리가 WASM 바이너리를 `data:application/octet-stream;base64,...` URI로 임베드해서 런타임에 로드한다. 브라우저는 `data:` URI를 통한 fetch/WASM 인스턴스화도 `connect-src` 정책 대상으로 취급하는데, `next.config.ts`의 CSP `connect-src`에 `data:`가 없어서 **모든 PDF 렌더링이 브라우저에서 차단**된다.

## 영향 범위
`@react-pdf/renderer`를 사용하는 모든 문서 다운로드 기능 — 오더 상세의 "무역서류 관리" 섹션 전체:
- `CommercialInvoicePDF` (CI)
- `PackingListPDF` (PL)
- `UpsInvoicePDF`
- `ShippingLabelPDF`(출고 라벨, `OutboundProcessForm.tsx`)

오늘 세션에서 새로 만든 기능이 아니라 **기존부터 있던 프로덕션 CSP 설정 버그**. `tests/e2e/uat-19-invoice-pdf.spec.ts`·`tests/e2e/e2e-26-invoice-pdf.spec.ts`에 Playwright `page.route()`로 CSP를 완화하는 임시조치가 이미 있었던 것으로 보아, e2e 테스트 작성 시점에 이미 이 문제를 인지했으나 **실제 `next.config.ts` CSP 자체는 고치지 않고 테스트 쪽에서만 우회**한 것으로 추정됨.

## 긴급도
**High** — PDF 다운로드는 여러 화면에 걸친 핵심 기능이고 실사용자가 실제로 막힌 상태로 확인됨(JSJung 직접 재현).

## 권장 조치
`next.config.ts`의 `connect-src` 지시어에 `data:` 추가:
```diff
- "connect-src 'self' https://*.supabase.co https://*.sentry.io https://cdn.jsdelivr.net https://t1.kakaocdn.net https://t1.daumcdn.net http://127.0.0.1:54321 http://localhost:54321 ws://localhost:3000 ws://127.0.0.1:3000",
+ "connect-src 'self' data: https://*.supabase.co https://*.sentry.io https://cdn.jsdelivr.net https://t1.kakaocdn.net https://t1.daumcdn.net http://127.0.0.1:54321 http://localhost:54321 ws://localhost:3000 ws://127.0.0.1:3000",
```
수정 후 실제 PDF 다운로드 버튼(CI/PL/UPS Invoice/Shipping Label 중 최소 1개)을 브라우저에서 클릭해 콘솔에 CSP 에러가 재발하지 않는지 확인 필요.

## 관련 파일
`next.config.ts` (16~26행 CSP 헤더 설정)

## 보고
JSJung 직접 지시로 즉시 수정 진행(R-18 Aiden escalation 절차 대신 JSJung 승인으로 진행).
