# TASK-B-123: Issue #468 — 주소록 비KR 국가 시/도·시/군/구 RHF 미반영 수정

**담당**: Dave
**생성일**: 2026-07-14
**우선순위**: P2
**상태**: 🔔

---

## [설계 의견]

### 원인
`AddressInput.tsx`의 비KR 국가 분기에서 `state_province`/`city` select의 `onChange`가 로컬 state만 갱신하고 `setValue`로 RHF 폼 상태를 갱신하지 않음. 결과적으로 `watch('recipient_state_province')`/`watch('recipient_city')`가 항상 빈 값을 반환.

### 조치
두 onChange 핸들러에 `country_code`/`zipcode`와 동일한 `setValue` 패턴 적용.
state 변경 시 city RHF 값도 함께 초기화 (기존 로컬 state 리셋과 동기화).

---

## [작업 결과]

### 변경 파일
1. `src/components/common/AddressInput.tsx`
   - L170: `state_province` select onChange에 `setValue(prefix_state_province, ...)` 추가
   - L186: `city` select onChange에 `setValue(prefix_city, ...)` 추가
   - L82: state 변경 시 city의 RHF 값도 `''`로 초기화

### 검증
- **CI Regression Tests**: ✅ PASS (4m19s, 485 tests, headSha: `da0eca61`)
- **Task File Check**: ✅ PASS
- **Vercel**: ✅ PASS
- **DB 저장 확인 (비KR 국가)**: Supabase 직접 INSERT → SELECT → DELETE
  ```sql
  INSERT → display_name: 'E2E Verify Fix'
  SELECT → country_code: US, state_province: CA, city: Los Angeles, zipcode: 90001
  ```
  → state_province/city 정상 저장 확인 ✅

### 커밋
- `da0eca61` — `[Dave] feat: TASK-B-123 Issue #468 — 비KR 국가 시/도·시/군 RHF setValue 누락 수정`

### PR
- https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/470

---

## [DoD Checklist]

- [x] state_province select onChange에 setValue 추가
- [x] city select onChange에 setValue 추가
- [x] state 변경 시 city RHF 값 초기화
- [x] CI 회귀 테스트 PASS 확인
- [x] task file 생성 + ACTIVE_TASK.md 반영
- [x] check-R17-DoD 전항목 통과

---

## [발견 이슈]

없음
