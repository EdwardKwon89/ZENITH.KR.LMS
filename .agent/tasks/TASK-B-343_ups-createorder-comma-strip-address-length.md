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
- [x] B: AddressInput 입력 시 쉼표 차단(상세주소 정제) — 표시용 resolve*Street 출력은 기존 유지, 주소록/수정 복원 기본값은 컴포넌트에서 상세주소만 정제
- [ ] C: UPS 실측 결과 기재(removeorder 정리 확인) + Jaison 한도 확정 후 별도 PR로 반영
- [ ] 쉼표 제거 후 UPS 운송장·인보이스 정상 출력 확인 (실측 증적)
- [x] 회귀 테스트 추가 + LIVE_REGRESSION_TEST_MAP.md 갱신
- [ ] R-10 UI 증적(스크린샷) 첨부 (추가 예정 또는 이슈 코멘트 참고)
- [x] 신규 코드 R-18 실패 관측성(logger) 원칙 준수

## 사용처 영향표 (AddressInput 6곳)
| 경로 | 용도 | 영향 |
|---|---|---|
| src/app/[locale]/(dashboard)/agency/shippers/new/shipper-form.tsx | 대리점 화주 신규 | AddressInput 사용 - onChange에서 쉼표 공백 치환 |
| src/app/[locale]/(dashboard)/agency/shippers/[id]/edit/edit-form.tsx | 대리점 화주 수정 | defaultValues 전달 - 상세주소 정제, address_english 원본 유지 |
| src/app/[locale]/(dashboard)/mypage/corporate/page.tsx | 마이페이지 법인 | defaultValues 전달 - 상세주소 정제 |
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
- **결정**: 자동채움 시 `address_english`에 쉼표를 제거하지 않고 원본 유지. `city/state_province`는 별도 필드로 이미 설정됨. 전송 계층(`buildShipperPayload`/`buildCreateOrderPayload`)에서 `resolveRoadAddress`가 도로명만 추출한 뒤 `sanitizeComma`로 정제. `defaultValues.address_english`도 원본 유지. 표시용 `resolveShipperStreet`/`resolveConsigneeStreet`은 기존 출력(쉼표 구분자) 유지.
- 주소록 불러오기/수정 복원: 컴포넌트 기본값 정제는 상세주소만 적용.

## [재현 결과]
(실측 대기 - UPS createorder/removeorder 필요)

## [작업 결과]
- 커밋: `195a9201`, `51f5f418`, `bbbea3e0`, `1908d1d3`
- AddressInput: onChange에서 쉼표 즉시 제거(공백 치환/연속공백정리), ENGLISH_ONLY_REGEX에서 쉼표 제거, onPaste 제거, 자동채움 `address_english` 원본 유지
- label-mapping: 쉼표 치환을 전송 지점으로 한정 - `buildShipperPayload`에서 `sanitizeComma(resolveShipperStreet(order, shipperOrg))`, `buildCreateOrderPayload`에서 city/province/street 정제. `resolveShipperStreet`/`resolveConsigneeStreet`는 표시용으로 기존 출력 유지
- 회귀맵 §75 추가, TC-343-UI 추가
- 회귀테스트: `tests/unit/ups/task-b343-address-comma-strip.test.ts`, `tests/unit/components/address-input-comma-strip.test.tsx` 추가
- 기존 테스트 조정: `tests/unit/ups/shipper-address-english.test.ts`, `tests/unit/ups/ups-labels-mapping.test.ts`, `tests/unit/ups/defb145-street-country-dedup.test.ts`, `tests/unit/ups/defb146-street-city-province-overflow.test.ts`
- CI: Regression Tests pass (run 40656627325)

## [발견 이슈]
없음

## R-17 체크리스트
- [x] 코드 커밋 분리(4개: 195a9201, 51f5f418, bbbea3e0, 1908d1d3) + 문서 커밋 분리(6044df78)
- [x] check-R17-DoD 확인 (R-17 절차 준수)
- [x] PR 생성 (Closes #1268)
- [x] CI 확인 완료 (Regression Tests pass - run 40661204985)
- [x] 문서/테스트 반영 완료
- [x] UI 테스트 되돌리기 검증: sanitizeAddressComma 제거 시 UI-01/02 FAIL 확인(실제 단언 동작)
