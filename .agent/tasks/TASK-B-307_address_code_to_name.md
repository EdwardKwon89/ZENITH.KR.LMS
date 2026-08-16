# TASK-B-307: 영문 주소 표출 — state/country 원시코드→이름 변환 + 화주 주소 중복 제거

## 기본 정보
- **이슈**: #1137
- **담당**: Mike
- **팀**: Team B
- **우선순위**: P2 (type:fix)
- **착수일**: 2026-08-16

## 목표
1. 화주(항상 국내) — "배송 기본 정보" 카드의 city/state/zip/country 줄 제거 (Daum 주소가 이미 완전)
2. 수령인(항상 해외) — state/country를 코드가 아닌 이름으로 변환

## DoD (Definition of Done)
- [ ] label-mapping.ts에 resolveRegionName()/resolveCountryName() 유틸 추가
- [ ] ups-detail/page.tsx 화주 city/state/zip/country 줄 제거
- [ ] ups-detail/page.tsx 수령인 state/country 코드→이름 변환
- [ ] orders/[orderId]/page.tsx, TradeDocumentClient.tsx에도 동일 적용
- [ ] 회귀 테스트 PASS

## 작업 범위
1. `label-mapping.ts`: `resolveRegionName()`/`resolveCountryName()` 유틸 추가
2. `ups-detail/page.tsx`: 화주 city/state/zip/country 줄 제거, 수령인 코드→이름 변환
3. `orders/[orderId]/page.tsx`: 동일 적용
4. `TradeDocumentClient.tsx`: 동일 적용

## 발견 이슈
없음

## 작업 결과

### 완료 항목
1. ✅ **label-mapping.ts에 resolveRegionName()/resolveCountryName() 유틸 추가**
   - `resolveRegionName(stateCode, countryCode)`: state 코드→이름 변환
   - `resolveCountryName(countryCode)`: country 코드→이름 변환
   - country-state-city 라이브러리 사용

2. ✅ **ups-detail/page.tsx 화주 city/state/zip/country 줄 제거**
   - Daum 주소가 이미 완전하므로 줄 제거

3. ✅ **ups-detail/page.tsx 수령인 코드→이름 변환**
   - CI/PL/UPS Invoice 데이터에 resolveRegionName/resolveCountryName 적용

4. ✅ **orders/[orderId]/page.tsx, TradeDocumentClient.tsx에도 동일 적용**
   - ciData, plData, upsInvoiceData에 코드→이름 변환 적용

### 테스트 결과
- **빌드**: TypeScript compilation **SUCCESS**
- **회귀 테스트**: 201 test files, 1392 tests **ALL PASS**

## 커밋 이력
- 커밋 해시: `f1285595`
- 브랜치: `feature/teamb-307-address-code-to-name-mike`
- 메시지: `[Mike] test: TASK-B-307 resolveRegionName/resolveCountryName 단위 테스트 추가`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1138
