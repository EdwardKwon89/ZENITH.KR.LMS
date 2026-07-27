# TASK-B-157: Issue #571 — DEF-103 AddressInput KR분기 시/도·시/군/구 미캡처

## 개요
- **Task 번호**: TASK-B-157
- **Issue**: #571 (DEF-103)
- **담당**: Baker
- **생성일**: 2026-07-17
- **우선순위**: P1
- **상태**: 🔔
- **최초 커밋**: `aa42f43b` (원안 — 반려)
- **재작업 커밋**: `02125e9a`

## 재작업 배경
PR#572 반려. Issue #571 코멘트(07:06)의 재설계 지시 미반영. 원인: 최신 이슈 코멘트를 확인하지 않고 원안대로 구현.

## 재설계 변경 사항 (Jaison 재설계 코멘트 기반)

### 1. `useEffect` KR 제외 조건 제거 (2곳)
- 국가 변경 시 state 목록 로딩: `countryCode && countryCode !== 'KR'` → `countryCode`
- 시/도 변경 시 city 목록 로딩: `selectedState && countryCode !== 'KR'` → `selectedState && countryCode`
- KR도 `country-state-city` 라이브러리에서 state/city 로드하도록 변경

### 2. `onComplete` 핸들러 — ISO코드 매핑 + City 매칭
- `KR_SIDO_TO_ISOCODE` 하드코딩 매핑 테이블(17개 시/도) 신규 추가
- Daum `sido`(접미사 startsWith 매칭) → ISO코드 변환 (예: "서울특별시" → "11")
- `City.getCitiesOfState('KR', matchedIso)`로 시/군/구 영문명 매칭
- 매칭 실패 시 `sigunguEnglish` 폴백

### 3. KR 분기 UI — 시/도·시/군/구 드롭다운 추가
- 비KR 분기와 동일한 `<select>` 드롭다운 UI를 KR 분기에도 추가
- hidden input `value=""` → `value={matchedIso}` / `value={matchedCity}` (기존 유지)

### 4. `src/lib/ups/label-mapping.ts` — shipper_province 변환
```ts
// 변경 전
shipper_province: (order.shipper_state_province as string) || '',
// 변경 후
shipper_province: resolveProvinceEnglishName((order.shipper_state_province as string) || '', (order.shipper_country_code as string) || shipperDefaults.country),
```

## 테스트 결과
- `tests/unit/agency/address-input.test.tsx` — 기존 14개 + 신규 4개 검증 추가
  - ISO코드(11) 검증, sido 접미사 매칭(startsWith) 검증
  - KR 분기 3개 select 표시 확인
- `tests/unit/ups/ups-labels-mapping.test.ts` — resolveProvinceEnglishName KR 케이스 2건 추가
- `npm run test:regression` → 95/95 ALL PASS (601 tests) ✅

## 변경 파일
- `src/components/common/AddressInput.tsx` (useEffect + onComplete + 드롭다운 UI)
- `src/lib/ups/label-mapping.ts` (shipper_province 변환)
- `tests/unit/agency/address-input.test.tsx` (mock 보강 + TC 갱신)
- `tests/unit/ups/ups-labels-mapping.test.ts` (KR resolve 2건 추가)

## PR
- **PR**: #572
- **CI (Regression Tests)**: pending (로컬 601/601 PASS)
