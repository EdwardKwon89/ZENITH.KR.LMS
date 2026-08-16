# TASK-B-306: UPS 상세 배송기본정보 카드 — 화주/수령인 주소에 city/state/zipcode/country 추가

## 기본 정보
- **이슈**: #1135
- **담당**: Mike
- **팀**: Team B
- **우선순위**: P2 (type:fix)
- **착수일**: 2026-08-16

## 목표
ups-detail/page.tsx "배송 기본 정보" 카드에서 화주·수령인 주소에 city/state/zipcode/country 추가

## DoD (Definition of Done)
- [ ] 화주 주소 아래 city/state/zipcode/country 라인 추가
- [ ] 수령인 주소 아래 city/state/zipcode/country 라인 추가
- [ ] 회귀 테스트 PASS
- [ ] R-10 스크린샷 첨부

## 작업 범위
- 파일: `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`
- "배송 기본 정보" 카드 화주/수령인 주소 라인 아래에 city/state/zipcode/country 라인 추가
- CommercialInvoicePDF.tsx/PackingListPDF.tsx의 렌더링 조건과 동일하게 처리

## 발견 이슈
없음

## 작업 결과

### 완료 항목
1. ✅ **화주 주소 아래 city/state/zipcode/country 라인 추가**
   - 파일: `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`
   - 조건: 해당 필드 중 하나라도 값이 있을 때만 표시

2. ✅ **수령인 주소 아래 city/state/zipcode/country 라인 추가**
   - 동일 파일, 동일 패턴 적용

### 테스트 결과
- **빌드**: TypeScript compilation **SUCCESS**
- **회귀 테스트**: 201 test files, 1392 tests **ALL PASS**

## 커밋 이력
(커밋 후 기재)
