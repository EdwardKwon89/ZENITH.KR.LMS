# TASK-B-159: Issue #577 — DEF-106 SHXK province 풀네임→코드값 되돌림

## 개요
- **Task 번호**: TASK-B-159
- **Issue**: #577 (DEF-106)
- **담당**: Baker
- **생성일**: 2026-07-17
- **우선순위**: P1
- **상태**: 🔔
- **커밋**: `c12481f2`

## 배경
JSJung이 SHXK_TEST_MOCK=false로 실제 createorder 재시도 중 Sold To state/province 코드 0~5자 영숫자 제약 위반 발견.
PR#556/PR#572에서 의도적으로 도입한 resolveProvinceEnglishName 변환이 오히려 장애 유발 — JSJung 승인으로 되돌림.

## 변경 사항

### 1. `src/lib/ups/label-mapping.ts`
- `import { State } from 'country-state-city'` 제거
- `resolveProvinceEnglishName()` 함수 정의 제거
- `buildCreateOrderPayload()` 내 `shipper_province` / `consignee_province` 변환 해제
  - `resolveProvinceEnglishName(...)` → 코드값 그대로 전송

### 2. `tests/unit/ups/ups-labels-mapping.test.ts`
- import `resolveProvinceEnglishName` 제거
- `describe('resolveProvinceEnglishName', ...)` 블록 전체 삭제 (9 tests)
- `buildCreateOrderPayload` 테스트:
  - input `shipper_state_province: 'Seoul'` → `'11'` (ISO 코드)
  - `consignee_province` 기대값 `'California'` → `'CA'` (코드값)
  - `shipper_province` 코드값(`'11'`) 검증 assertion 추가

## 테스트 결과
- `npm run test:regression` → 95/95 ALL PASS (602 tests) ✅
- `grep -rn "resolveProvinceEnglishName" src/ tests/` → no matches ✅

## 변경 파일
- `src/lib/ups/label-mapping.ts`
- `tests/unit/ups/ups-labels-mapping.test.ts`

## PR
- **PR**: #578 (예정)
