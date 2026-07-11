# TASK-B-090: Issue #312 Volumetric Divisor Agency별 적용

**담당:** Dave
**생성일:** 2026-07-10
**상태:** 🔔 검토 요청

## 개요
`zen_organizations.volumetric_divisor` 컬럼(5000/5500/6000)이 DB에는 존재하지만 Admin UI와 freight 계산 엔진에 연동되지 않아, Agency별 부피중량 환산 divisor를 설정할 수 없는 문제 해결.

## 변경 사항

### 코드
- **`freight.ts`**: `estimateUpsFreight` — `agencyOrgId` 전달 시 `zen_organizations.volumetric_divisor` 조회 → `effectiveDivisor`로 사용 (기존 5000 하드코딩 대체). `input.volumetricDivisor` 명시 전달 시 우선 적용 (override 시나리오)
- **`rates-mutation.ts`**: `updateAgencyVolumetricDivisor(agencyOrgId, divisor)` server action 신규
- **`page.tsx`**: orgs query에 `volumetric_divisor` 필드 추가
- **`ups-rates-client.tsx`**: AgencyPolicyForm에 volumetric_divisor 드롭다운(5000/5500/6000) 추가 + submit 시 `updateAgencyVolumetricDivisor` 호출 + openEdit/openNew 연동

### 설계 결정
- 화주는 소속 Agency의 divisor를 그대로 상속, 대리점 미소속 일반 화주는 항상 5000
- Admin만 수정 가능, Agency/화주 읽기 전용
- `input.volumetricDivisor` 명시 전달 시 우선 → 덮어쓰기(override) 시나리오 대비

## 검증
- **Build: ✅**
- **회귀: 81 files / 489 tests ALL PASS ✅**

## 결과
- **PR:** https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/316 (TASK-B-089 #310과 동일 브랜치, delta만 #312)
- **상태:** 🔔 Aiden 검토 대기
