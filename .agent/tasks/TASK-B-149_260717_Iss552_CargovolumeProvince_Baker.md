# TASK-B-149: Issue #552 — cargovolume child_number + consignee_province 영문명

## 개요
- **Task 번호**: TASK-B-149
- **Issue**: #552 (Issue #551 하위 작업 A)
- **담당**: Baker
- **생성일**: 2026-07-17
- **우선순위**: P2
- **상태**: 🔔

## 변경 사항

### 1. cargovolume[].child_number (label-mapping.ts)
- `buildCargovolume()`: `child_number: String(idx + 1)` → `child_number: String(pkg.id ?? '')`
- `pkg.id`는 `zen_order_packages.id`(UUID, 36자) — SHXK 스펙 string(60) 제한 내

### 2. consignee_province 영문명 (label-mapping.ts + ups-labels.ts)
- `resolveProvinceEnglishName(stateCode, countryCode)` 순수 함수 신규 추가
- `country-state-city`의 `State.getStateByCodeAndCountry()` 사용
- 조회 실패 시 원래 코드값 폴백
- `placeShxkOrder()`의 `consignee_province`에 적용

## 테스트 결과
- `tests/unit/ups/ups-labels-mapping.test.ts` — 16/16 ALL PASS
  - buildCargovolume: child_number가 pkg.id를 사용하는지 검증
  - resolveProvinceEnglishName: 일본/미국 유효 코드 + 빈 코드 + 잘못된 코드 폴백 6건
