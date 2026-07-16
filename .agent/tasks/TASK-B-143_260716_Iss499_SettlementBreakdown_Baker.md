# TASK-B-143

## 기본 정보
- **번호**: TASK-B-143
- **제목**: Issue #499 — Agency 정산 화면 부과금 항목별 breakdown 노출
- **이슈**: #499
- **우선순위**: P3
- **생성일**: 2026-07-16
- **상태**: 🔔 완료 보고

## 작업 내용
Agency 정산 오더 상세 확장 영역에 항목별 breakdown(기본운임/유류할증/기타부가/급증수수료) 표시 추가

## 작업 결과
- 코드 커밋: `7ab4f1f6a30439a0a02102b5f955a3405aa86a97`
- Build PASS · Regression 86/86 PASS (534 tests)
- PR TBD

## 발견 이슈
없음

## 변경 파일
- `src/lib/actions/agency-settlement.ts` — SELECT 4곳에 snapshot.metadata 추가 · getAgencyOrderSettlements return에 breakdown 추출
- `src/app/[locale]/(dashboard)/agency/settlements/ShipperSettlementTable.tsx` — Fragment import · OrderSettlementRow에 breakdown 필드 추가 · 확장 영역에 항목별 breakdown 표시
