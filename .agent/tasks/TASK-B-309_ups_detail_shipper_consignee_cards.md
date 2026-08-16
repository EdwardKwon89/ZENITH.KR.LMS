# TASK-B-309: UPS 상세 배송기본정보 — 화주/수령인 카드 분리 + 좌우 배치

## 기본 정보
- **이슈**: #1141
- **담당**: Mike
- **팀**: Team B
- **우선순위**: P3 (type:feat)
- **착수일**: 2026-08-16

## 목표
"배송 기본 정보 (Shipper / Consignee)" 섹션을 화주 카드/수령인 카드로 분리하고 좌우 배치

## DoD (Definition of Done)
- [ ] ZenCard 1개 → 화주/수령인 각각 별도 ZenCard 2개
- [ ] grid grid-cols-1 md:grid-cols-2 gap-6으로 좌우 배치
- [ ] 두 카드 대응 요소에 동일 className 적용해 폰트 크기/굵기 통일
- [ ] 회귀 테스트 PASS

## 작업 범위
- 파일: `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`
- 순수 레이아웃/스타일만 변경 (데이터 로직 변경 없음)

## 발견 이슈
없음

## 작업 결과

### 완료 항목
1. ✅ **ZenCard 1개 → 화주/수령인 각각 별도 ZenCard 2개**
   - 화주 카드: "화주 (Shipper)" 헤더
   - 수령인 카드: "수령인 (Consignee)" 헤더

2. ✅ **grid grid-cols-1 md:grid-cols-2 gap-6으로 좌우 배치**
   - 모바일은 세로 스택
   - 데스크톱은 좌우 배치

3. ✅ **두 카드 대응 요소에 동일 className 적용**
   - 폰트 크기/굵기 통일

### 테스트 결과
- **빌드**: TypeScript compilation **SUCCESS**
- **회귀 테스트**: 201 test files, 1406 tests **ALL PASS**

## 커밋 이력
(커밋 후 기재)
