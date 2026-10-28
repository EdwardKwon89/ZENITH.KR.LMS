# TASK-B-343: UPS createorder 주소 쉼표 제거 + 주소 입력 쉼표 차단 + AddressLine 길이 사전검증

**상태:** 🔄 진행중  
**담당:** Baker (Team B)  
**배정 이슈:** #1268  
**브랜치:** feature/teamb-343-ups-createorder-comma-strip-address-length  
**베이스:** origin/TeamB_Dev  
**생성일:** 2026-10-28  

## 목표
UPS createorder 호출 시 수하인/발송인 주소에 쉼표(,)가 있으면 UPS 운송장 및 인보이스에서 쉼표 앞부분만 출력되는 문제 수정. 또한 주소 입력 시 쉼표 차단 및 AddressLine 길이 사전검증 추가.

## DoD
- [ ] A: 전송 payload street/city/province 쉼표 없음 (도로명 추출 → 치환 순서, 단위 테스트 증적)
- [ ] B: AddressInput 전 사용처 쉼표 입력·붙여넣기·자동채움·주소록·수정 복원 모두 정제 (사용처 영향표 첨부)
- [ ] C: UPS 실측 결과 기재(removeorder 정리 확인) + Jaison 한도 확정 + 상수/zod/validate-payload 반영
- [ ] 쉼표 제거 후 UPS 운송장·인보이스 정상 출력 확인 (실측 증적)
- [ ] 회귀 테스트 추가 + LIVE_REGRESSION_TEST_MAP.md 갱신 + 전체 PASS
- [ ] R-10 UI 증적(스크린샷) 첨부
- [ ] 신규 코드 R-18 실패 관측성(logger) 원칙 준수

## 작업 계획
1. 워크트리 초기화 및 브랜치 생성 (완료)
2. 입력 계층(AddressInput) 쉼표 차단 - 전체 사용처 검토
3. 전송 계층(label-mapping.ts) 쉼표 정제 - 도로명 추출 순서 유지
4. 길이 사전검증 - UPS 실측 후 한도 확정, 상수/스키마/검증 반영
5. 테스트 작성 및 회귀맵 갱신
6. R-17 완료 보고

## 전제
- Issue #1268 확정 요구사항 준수
- 순서 주의: resolveRoadAddress는 '첫 쉼표 토막=도로명' 의존 → 반드시 '도로명 추출 → 쉼표 치환' 순서

## [설계 의견]
(작업 중 기재)

## [재현 결과]
(실측 시 기재)

## [작업 결과]
(완료 시 기재)

## [발견 이슈]
(없으면 "없음" 명시)
