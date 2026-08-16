# TASK-B-311: 등록/수정 이력 — 화물정보 그룹 추가 (패키지/품목 변경 이력 신설)

## 기본 정보
- **이슈**: #1145
- **담당**: Mike
- **팀**: Team B
- **우선순위**: P2 (type:feat)
- **착수일**: 2026-08-16

## 목표
패키지/품목 변경 이력을 화물정보 그룹으로 추가

## DoD (Definition of Done)
- [ ] edit-log-fields.ts에 CargoSummarySnapshot 타입 추가
- [ ] edit-log-fields.ts에 화물정보 그룹 추가
- [ ] orders.ts updateOrder에 패키지/품목 스냅샷 기록 로직 추가
- [ ] UpsOrderEditHistoryPanel.tsx에 화물정보 그룹 표출
- [ ] 회귀 테스트 PASS

## 작업 범위
1. `src/lib/orders/edit-log-fields.ts`: CargoSummarySnapshot 타입 + 화물정보 그룹
2. `src/app/actions/operations/orders.ts`: updateOrder에 스냅샷 기록
3. `src/components/ups/UpsOrderEditHistoryPanel.tsx`: 화물정보 그룹 표출

## 발견 이슈
없음

## 작업 결과

### 완료 항목
1. ✅ **edit-log-fields.ts에 CargoSummarySnapshot 타입 추가**
   - package_count, total_weight, total_volume, item_count, item_names
   - extractCargoSummarySnapshot(): 패키지 배열에서 스냅샷 추출
   - cargoSummaryEquals(): 스냅샷 비교
   - formatCargoSummary(): 한글 요약 포맷

2. ✅ **edit-log-fields.ts에 화물정보 그룹 추가**
   - 5번째 그룹 "화물정보" (cargo_summary 키 사용)

3. ✅ **orders.ts updateOrder에 패키지/품목 스냅샷 기록 로직 추가**
   - 패키지 변경 시 화물 스냅샷을 old/new_data에 추가
   - 헤더 변경 또는 화물 변경이 있으면 이력 기록

4. ✅ **UpsOrderEditHistoryPanel.tsx에 화물정보 그룹 표출**
   - cargo_summary 필드는 별도 포맷으로 표시

5. ✅ **기존 테스트 업데이트**
   - 패키지 변경 시 로그 1건 추가되도록 기대값 변경

### 테스트 결과
- **빌드**: TypeScript compilation **SUCCESS**
- **회귀 테스트**: 201 test files, 1407 tests **ALL PASS**

## 커밋 이력
- 커밋 해시: `054042cf`
- 브랜치: `feature/teamb-311-edit-history-cargo-group-mike`
- 메시지: `[Mike] fix: TASK-B-311 반려 사유 2건 수정`
- PR: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1146
