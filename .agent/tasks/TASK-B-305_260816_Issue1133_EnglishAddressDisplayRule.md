# TASK-B-305: 영문 주소 출력 규칙 통일 + DEF-B-134 수하인 상세주소 저장 누락

- **GitHub Issue**: [#1133](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1133)
- **관련 결함**: [DEF-B-134](.agent/defects/DEF-B-134_수하인_상세주소_저장누락.md)
- **등록일**: 2026-08-16
- **등록자**: Jaison (JSJung 요청 분석)
- **담당**: Mike
- **우선순위**: P2
- **상태**: 🔄 착수 가능 (설계 확정 완료, 구현 착수 직행)

## [배경]

JSJung 요청: "주소를 저장하는 구조는 알겠고, 표현하는 방식을 결정하고자 해, 영문으로 주소 출력하는 규칙을 적용해서 표출했으면 해" — 화면/서류에 표출되는 주소를 영문 우선으로 통일해달라는 분석·설계 요청.

## [조사 결과]

### 1. 저장 구조

| 대상 | 한글 필드 | 영문 필드 | 비고 |
|---|---|---|---|
| 화주(shipper) — 오더 레벨 | `shipper_address`/`shipper_address_detail` | `shipper_address_english`/`shipper_address_detail_english` | DEF-B-059(2026-08-12)로 추가, Daum 우편번호 `roadAddressEnglish` 자동입력 |
| 화주 — 조직(zen_organizations) | `address`/`address_detail` | `address_english`/`address_detail_english` | 오더 레벨 값 공란 시 폴백 소스 |
| 수하인(recipient) | `recipient_address`(자유입력) + `recipient_address_local`(현지어 병기) | 없음(원래 로마자 직접입력이라 불필요) | `recipient_address_detail`은 폼/검증만 존재, **DB 컬럼 없음 → DEF-B-134** |
| 집화지(pickup) | `pickup_address` 등 | 없음 | 국내 택배기사 전달용, 이번 범위 제외 |

### 2. 이미 존재하는 "영문 우선" 선례

`src/lib/ups/label-mapping.ts` `resolveShipperStreet()` — SHXK 특송사 API 전송 시:
```
order.shipper_address_english → shipperOrg.address_english → shipperOrg.address(한글) → order.shipper_address(한글)
```
이 폴백 체인이 프로젝트 내 유일하게 정립된 "영문 규칙". 이번 작업은 이 원칙을 화면/서류 표출까지 확장 적용.

### 3. 원칙이 누락된 곳 (수정 대상)

1. `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx:345-348` — 화주 주소 `order.shipper_address`(한글) 고정 표출.
2. `src/app/[locale]/(dashboard)/orders/[orderId]/page.tsx:131-234` — CI/PL/UPS Invoice 3종 데이터 빌더 전부 `(order.shipper as any)?.address`(한글) 사용 + city/state/zipcode/country 조합 자체가 없음(street 한 줄만 출력).
3. `src/app/[locale]/(dashboard)/finance/documents/TradeDocumentClient.tsx:50-125` — 2번과 동일 결함이 별도 파일에 중복 구현.
4. `src/components/common/AddressInput.tsx` — `addressDetailEnglish` state는 있으나 입력 `<input>`이 렌더링되지 않음(Daum API도 상세주소 영문 자동입력 불가) → 신규 등록 건은 `address_detail_english`가 구조적으로 항상 공란.

### 4. DEF-B-134 (수하인 상세주소 저장 누락)

`recipient_address_detail`이 Zod 검증(`src/lib/validation/order.ts:65`)·폼(`OrderRegistrationForm.tsx:1235`)·엑셀 대량등록(`bulk-orders.ts:116`) 전 구간에서 값이 전달되지만, `zen_orders`에 해당 컬럼이 없어 `createOrder()`/`updateOrder()`가 조용히 버림. 실사용 배송 데이터(동/호수 등) 유실 결함 — 상세 보고서 참조.

## [설계 확정] (JSJung 승인, 2026-08-16)

1. **적용 범위**: 전체 통일 — UPS 상세페이지 + CI/PL/UPS Invoice(2곳 중복 구현 모두) + 일반 오더 상세.
2. **상세주소 입력 갭 처리**: 별도 입력 필드를 추가하는 대신, 기존 `address_detail` 입력 자체를 **영문 전용**으로 제한(검증)하고 동일 값을 영문 필드에도 반영. 적용 대상은 **화주 + 수하인만** — 집화지(pickup)는 국내 택배기사 전달용이라 한글 유지, 제외.
   - 화주: `address_detail` 입력값 → `shipper_address_detail` + `shipper_address_detail_english` 동일 반영.
   - 수하인: DEF-B-134 선행 해결(컬럼 추가) 후 `recipient_address_detail`에 영문 전용 검증 적용(수하인은 별도 `_english` 컬럼이 없으므로 이 필드 자체가 영문 전용 단일 필드가 됨).
3. **폴백 규칙**: 영문 필드가 공란이면 한글 원본을 자동 대체 표출(label-mapping.ts와 동일 원칙 — 공백보다 낫다는 판단, 별도 "미등록" 배지 불필요).

## [작업 범위]

1. **DEF-B-134 선행 수정**:
   - `zen_orders.recipient_address_detail` 컬럼 추가 마이그레이션
   - `createOrder()`/`updateOrder()`(`src/app/actions/operations/orders.ts`)에 저장 로직 추가
2. **AddressInput.tsx**: 화주/수하인 프리픽스에서 `address_detail` 입력에 영문(Latin 알파벳/숫자/기본 문장부호) 전용 검증 적용(정규식 또는 입력 필터). 화주는 값 입력 시 `address_detail_english`에도 동일 반영(별도 입력 UI 불필요).
3. **영문 우선 표출 유틸**: `resolveShipperStreet()` 패턴을 공용 유틸로 정리(예: `src/lib/orders/address-display.ts` 신규 또는 기존 파일 확장) — city/state_province/zipcode/country 조합까지 포함한 완전한 영문 주소 조립 함수로 확장.
4. **적용처 반영**:
   - `ups-detail/page.tsx` 화주 주소 표출부
   - `orders/[orderId]/page.tsx`의 `ciData`/`plData`/`upsInvoiceData` 3종 — 화주+수하인 주소를 영문 우선 + city/state/zip/country 포함 조합으로 교체
   - `TradeDocumentClient.tsx`의 `getCIData`/`getPLData` — 동일 적용
5. **회귀 테스트 신규 추가**: 아래 항목 참조, `LIVE_REGRESSION_TEST_MAP.md` 갱신.

## [회귀 테스트 방향]

- 영문 필드 존재 케이스: 영문 값이 표출되는지
- 영문 필드 공란(폴백) 케이스: 한글 원본이 자동 대체 표출되는지
- `recipient_address_detail` 저장 → 재조회 round-trip
- `address_detail` 영문 전용 검증 함수: 한글/CJK 입력 거부, 영문/숫자/기본 기호 허용
- CI/PL/UPS Invoice 주소 조합 결과에 city/state/zipcode/country 모두 포함되는지

## [R-10]

UPS 오더 상세페이지 화주 주소 영문 표출 스크린샷, CI/PL/UPS Invoice PDF 다운로드 실행 결과(영문 주소 + 전체 구성요소 포함) 첨부 필수.

## [작업 결과]

_(Mike 작성 예정)_

## [Jaison 최종 검토]

_(PR 제출 후 작성)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| 없음 | | | |
