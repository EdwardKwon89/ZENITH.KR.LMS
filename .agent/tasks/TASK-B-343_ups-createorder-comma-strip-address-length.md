# TASK-B-343: UPS createorder 주소 쉼표 제거 + 주소 입력 쉼표 차단 + AddressLine 길이 사전검증

**상태:** 🔔 검토대기  
**담당:** Baker (Team B)  
**배정 이슈:** #1268  
**브랜치:** feature/teamb-343-ups-createorder-comma-strip-address-length  
**베이스:** origin/TeamB_Dev  
**생성일:** 2026-10-28  

## 목표
UPS createorder 호출 시 수하인/발송인 주소에 쉼표(,)가 있으면 UPS 운송장 및 인보이스에서 쉼표 앞부분만 출력되는 문제 수정. 또한 주소 입력 시 쉼표 차단 및 AddressLine 길이 사전검증 추가.

## DoD
- [x] A: 전송 payload street/city/province 쉼표 없음 (도로명 추출 → 치환 순서, 단위 테스트 증적)
- [x] B: AddressInput 전 사용처 쉼표 입력·자동채움·수정 복원 정제 (사용처 영향표 첨부)
- [ ] C: UPS 실측 결과 기재(removeorder 정리 확인) + Jaison 한도 확정 후 별도 PR로 반영
- [ ] 쉼표 제거 후 UPS 운송장·인보이스 정상 출력 확인 (실측 증적)
- [x] 회귀 테스트 추가 + LIVE_REGRESSION_TEST_MAP.md 갱신
- [ ] R-10 UI 증적(스크린샷) 첨부
- [x] 신규 코드 R-18 실패 관측성(logger) 원칙 준수

## 사용처 영향표 (AddressInput 6곳)
| 경로 | 용도 | 영향 |
|---|---|---|
| src/app/[locale]/(dashboard)/agency/shippers/new/shipper-form.tsx | 대리점 화주 신규 | AddressInput 사용 - 쉼표 입력 시 onChange 정제 적용 |
| src/app/[locale]/(dashboard)/agency/shippers/[id]/edit/edit-form.tsx | 대리점 화주 수정 | defaultValues 복원 시 정제 적용 |
| src/app/[locale]/(dashboard)/mypage/corporate/page.tsx | 마이페이지 법인 | defaultValues 복원 시 정제 적용 |
| src/components/orders/OrderRegistrationForm.tsx:1179 | 오더 화주 | AddressInput 사용 |
| src/components/orders/OrderRegistrationForm.tsx:1292 | 오더 수하인 | AddressInput 사용 |
| src/components/orders/OrderRegistrationForm.tsx:1379 | 오더 픽업 | AddressInput 사용 |

## 전제
- Issue #1268 확정 요구사항 준수
- 순서 주의: resolveRoadAddress는 '첫 쉼표 토막=도로명' 의존 → 반드시 '도로명 추출 → 쉼표 치환' 순서

## [설계 의견]
### 차단 2 - 다음우편번호 자동채움과 도로명 추출 순서
- 이슈 요구: "반드시 '도로명 추출 → 쉼표 치환' 순서로 적용할 것. 먼저 쉼표를 지우면 시·구·도가 street에 붙어 AddressLine 초과(DEF-B-146)가 재발한다"
- 다음우편번호(카카오)에서 `roadAddressEnglish`은 `도로명, 구, 시, 도` 형태. 현재 `resolveRoadAddress`는 `split(',')[0]`으로 첫 세그먼트만 사용.
- **결정**: 자동채움 시 `address_english`에 쉼표를 제거하지 않고 원본 유지. `city/state_province`는 별도 필드로 이미 설정됨. 전송 계층에서 `resolveRoadAddress`가 도로명만 추출한 뒤 `sanitizeComma`로 정제. `defaultValues.address_english`도 자동채움 경로 일관성을 위해 원본 유지.
- 주소록 불러오기/수정 복원: 컴포넌트 기본값 정제는 상세주소만 적용. 주소 필드는 기존 값 그대로 두되, 전송 계층에서 최종 정제.

## [재현 결과]
(실측 - UPS createorder 테스트 필요, removeorder 정리 필요)

## [작업 결과]
- 커밋 1 (코드): [Baker] fix: TASK-B-343 UPS createorder 주소 쉼표 제거 + 입력 차단
  - AddressInput: onChange에서 쉼표 즉시 제거(공백 치환), ENGLISH_ONLY_REGEX에서 쉼표 제거, onPaste 제거, 자동채움 시 address_english 원본 유지(도로명 추출 순서 보장)
  - label-mapping: resolveRoadAddress에서 도로명 추출 후 쉼표 치환, resolveShipperStreet/resolveConsigneeStreet/buildCreateOrderPayload에서 city/province/street/name 정제 (벌크 경로 포함). shipper_name/shipper_company/consignee_name은 요청 범위(주소)가 아니므로 원복
- 회귀맵 §75 추가
- 회귀테스트 tests/unit/ups/task-b343-address-comma-strip.test.ts 추가 (실제 함수 검증)
- 기존 테스트 조정: shipper-address-english.test.ts, ups-labels-mapping.test.ts

## [발견 이슈]
없음
