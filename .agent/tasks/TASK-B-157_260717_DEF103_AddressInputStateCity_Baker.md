# TASK-B-157: Issue #571 — DEF-103 AddressInput KR분기 시/도·시/군/구 미캡처

## 개요
- **Task 번호**: TASK-B-157
- **Issue**: #571 (DEF-103)
- **담당**: Baker
- **생성일**: 2026-07-17
- **우선순위**: P1
- **상태**: 🔔
- **커밋 (code)**: `aa42f43b`

## 배경
JSJung이 `SHXK_TEST_MOCK=false`로 실제 SHXK UPS API 연계 테스트 중 발견. `AddressInput.tsx`의 KR 분기(다음 우편번호 검색)가 시/도(`state_province`)·시/군/구(`city`)를 전혀 캡처하지 않아 항상 빈 문자열로 SHXK에 전송됨.

## 변경 사항

### 1. `DaumPostcodeEmbed` `onComplete` 핸들러 (270행)
- `sidoEnglish || sido` → `selectedState` setter 호출
- `sigunguEnglish || sigungu` → `selectedCity` setter 호출
- `setValue()` 호출 시 `state_province`/`city` prefix 필드 추가

### 2. KR 분기 hidden input (169-170행)
- `value=""` 하드코딩 → `value={selectedState}` / `value={selectedCity}`

## 테스트 결과
- `tests/unit/agency/address-input.test.tsx` — 기존 13개 + 신규 4개 검증 추가
  - state_province hidden input 값 검증
  - city hidden input 값 검증
  - setValue가 sido/sigungu 포함 호출 확인
- `npm run test:regression` → 95/95 ALL PASS (597 tests) ✅

## 변경 파일
- `src/components/common/AddressInput.tsx` (onComplete + hidden input)
- `tests/unit/agency/address-input.test.tsx` (mock 보강 + 신규 TC 4건)
