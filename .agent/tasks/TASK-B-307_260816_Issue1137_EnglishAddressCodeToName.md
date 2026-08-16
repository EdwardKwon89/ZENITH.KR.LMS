# TASK-B-307: 영문 주소 표출 — state/country 원시 코드→이름 변환 + 화주(국내) 주소 중복 제거

- **GitHub Issue**: [#1137](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1137)
- **관련 결함**: [DEF-B-136](.agent/defects/DEF-B-136_영문주소_state_country_원시코드_표출_및_화주주소_중복.md)
- **등록일**: 2026-08-16
- **등록자**: Jaison (JSJung 실사용 피드백)
- **담당**: Mike
- **우선순위**: P2
- **상태**: ❌ 반려 (PR#1138, 2026-08-16 — 테스트 미추가, 재작업 필요)

## [배경]

JSJung이 UPS 상세페이지에서 화주 주소가 아래처럼 잘못 표출되는 것을 발견:
```
461-5 Gonghang-daero, Gangseo-gu, Seoul, Republic of Korea
Gangseo-gu, 11, 07570 KR
```
2번째 줄이 1번째 줄과 중복(Gangseo-gu·국가 표기 중복)되고, 주(州) 자리에 원시 코드(`11`)가 그대로 노출됨. JSJung 확정 지시: "영문 주소 출력 규격에 맞춰서 출력 — 중복 출력 금지, 코드 출력 금지."

## [조사 결과]

### 1. state_province 원시 코드
`AddressInput.tsx`가 `country-state-city` 라이브러리의 `isoCode`를 폼 매칭용으로 `state_province`에 저장. 한국은 ISO 3166-2:KR이 숫자 코드(`11`=Seoul 등)라 사람이 못 읽음. 실증: `State.getStatesOfCountry('KR').find(s => s.isoCode === '11')` → `{name: 'Seoul', ...}`. 라이브러리로 정상 변환 가능함을 확인(`State.getStateByCodeAndCountry('SD','CN')` → `Shandong`, `Country.getCountryByCode('KR')` → `South Korea`).

### 2. 화주(국내) 주소 중복
화주는 항상 국내 소재. `resolveShipperStreet()`가 반환하는 Daum 도로명주소(`address_english`)는 이미 구/시/국가까지 포함한 완전한 문자열. TASK-B-306이 여기에 city/state/zip/country를 별도 줄로 또 추가해 중복 발생.

### 3. 동일 패턴이 여러 곳에 반복
- `ups-detail/page.tsx`: "배송 기본 정보" 카드(화주/수령인, TASK-B-306) + `ciData`/`upsInvoiceData`(화주/수령인, TASK-B-305)
- `orders/[orderId]/page.tsx`: `ciData`/`plData`/`upsInvoiceData` 3종(화주/수령인, TASK-B-305)
- `TradeDocumentClient.tsx`: `getCIData`/`getPLData`(화주/수령인, TASK-B-305)
- `UpsInvoicePDF.tsx` 소비처: consignee country가 `order.dest_port.country_code`(거의 항상 코드) 사용

## [설계 확정] (JSJung 승인)

1. **화주(국내) 주소**: "배송 기본 정보" 카드에서 city/state/zip/country 2번째 줄 **제거** (Daum 주소가 이미 완전하므로 중복 방지). CI/PL/UPS Invoice PDF의 화주 city/state/zip/country는 유지하되(문서 표준 포맷 준수) 2번 항목의 코드→이름 변환 적용.
2. **수령인(해외) 주소**: 모든 표출처에서 city/state/zip/country 줄 유지, state/country를 코드가 아닌 실제 이름으로 변환.
3. **코드→이름 변환 유틸 신설**: `src/lib/ups/label-mapping.ts`에 추가(이미 client-safe, `country-state-city` import 전례 있음):
   ```ts
   import { State, Country } from 'country-state-city';

   export function resolveRegionName(countryCode: string, stateCode: string): string {
     if (!stateCode) return '';
     return State.getStateByCodeAndCountry(stateCode, countryCode)?.name || stateCode; // 라이브러리에 없으면 원본 폴백(자유입력국 대응)
   }

   export function resolveCountryName(countryCode: string): string {
     if (!countryCode) return '';
     return Country.getCountryByCode(countryCode)?.name || countryCode;
   }
   ```

## [작업 범위]

1. `label-mapping.ts`에 `resolveRegionName()`/`resolveCountryName()` 추가
2. **`ups-detail/page.tsx`**:
   - "배송 기본 정보" 카드 화주 블록(약 366-371행): city/state/zip/country 줄 **삭제**
   - "배송 기본 정보" 카드 수령인 블록(약 384-389행): `state`/`country`에 `resolveRegionName`/`resolveCountryName` 적용
   - `ciData`/`upsInvoiceData`의 shipper/consignee `state`/`country` 필드: 위 유틸 적용
3. **`orders/[orderId]/page.tsx`**: `ciData`/`plData`/`upsInvoiceData` 3종 shipper/consignee `state`/`country` 필드에 위 유틸 적용 (upsInvoiceData의 consignee `country`는 `order.dest_port` 소스이므로 `resolveCountryName(order.dest_port?.country_code)` 형태로)
4. **`TradeDocumentClient.tsx`**: `getCIData`/`getPLData`의 shipper/consignee `state`/`country` 필드에 위 유틸 적용

## [회귀 테스트 방향]

- `resolveRegionName('KR', '11')` → `'Seoul'`, `resolveRegionName('CN', 'SD')` → `'Shandong'`
- `resolveCountryName('KR')` → `'South Korea'`, `resolveCountryName('CN')` → `'China'`
- 라이브러리에 없는 코드 입력 시 원본 값 그대로 폴백
- "배송 기본 정보" 카드: 화주 블록에 city/state/zip/country 줄이 렌더링되지 않는지(스냅샷/DOM 쿼리)
- 수령인 블록: 코드가 아닌 이름으로 렌더링되는지

## [R-10]

실제 신고 케이스(ZEN-2026-000007, Master Air 화주)로 UPS 상세페이지 확인 — 화주 주소 1줄만 표출(중복 없음), 수령인 주소는 city/state/zip/country가 이름으로 표출되는지 스크린샷.

## [작업 결과]

_(Mike 작성 예정)_

## [Jaison 최종 검토]

**PR#1138 반려 (2026-08-16)** — 상세: [PR#1138 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1138#issuecomment-5306793435)

코드 자체는 정확함을 확인(3개 파일 전체 적용, 화주 카드 줄 삭제·CI/PL 유지 모두 설계대로, 실제 함수 실행으로 JSJung께 사전에 보여드린 예상값과 정확히 일치 — `"Weihai, Shandong, 02750 China"`). 회귀 201/201·1392/1392 PASS, 빌드·CI 전체 PASS.

**반려 사유**: 신규 회귀 테스트 0건. PR#1136(TASK-B-306) 승인 시 "다음에 이 페이지를 건드릴 때는 테스트 추가 부탁드립니다"라고 명시적으로 요청했는데 이번에도 미반영 — 동일 지적 재발. `resolveRegionName`/`resolveCountryName` 단위 테스트 + "배송 기본 정보" 카드 렌더링 테스트(TASK-B-305의 `address-english-display.test.ts`, `ups-detail-b300.test.tsx` 패턴 재사용) 추가 요청.

GitHub Issue 라벨 `status:review` → `status:rework` 갱신 완료.

## [발견 이슈]

없음
