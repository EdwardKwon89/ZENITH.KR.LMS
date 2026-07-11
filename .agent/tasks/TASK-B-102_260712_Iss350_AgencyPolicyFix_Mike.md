# TASK-B-102: Issue #350 Agency 할인율 정책 조회 화면 결함 3종 수정

**담당:** Mike
**생성일:** 2026-07-12
**상태:** 🔔 검토 요청

## 개요
Admin Agency 할인율 정책 조회 화면(AgencyPolicyTable)에서 3가지 결함 수정.

## 변경 사항

### 1. Zone 표시 불량 수정
- `page.tsx`: `agencyPolicies` 조회 시 `zone:zone_id(zone_code)` 조인 추가
- 기존: `*, agency:agency_org_id(name)` → 변경: `*, agency:agency_org_id(name), zone:zone_id(zone_code)`

### 2. 대리점 검색 기능 추가
- `AgencyPolicyTable`에 대리점명 검색 input 추가
- 대리점명으로 필터링

### 3. 부피중량 기준값 표출
- `divisorMap`으로 대리점별 `volumetric_divisor` 매핑
- 테이블에 '부피중량' 컬럼 추가 (기본값 5000)
- 할인율 표시 `toFixed(1)`로 소수점 1자리 통일

## 검증
- **Build: ✅**
- **회귀: 81 files / 485 tests ALL PASS ✅**

## 결과
- **PR:** https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/367
- **상태:** 🔔 Aiden 검토 대기
