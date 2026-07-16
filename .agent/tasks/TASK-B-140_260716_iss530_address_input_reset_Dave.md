# TASK-B-140: Issue #530 — AddressInput 국가변경 리셋 useEffect → onChange 이동

**담당**: Dave
**생성일**: 2026-07-16
**우선순위**: P1 (Critical)
**상태**: 🔔

---

## [작업 결과]

### 변경 파일
1. `src/components/common/AddressInput.tsx`
   - 국가 `onChange`: `setSelectedState('')` + `setSelectedCity('')` + RHF 빈값 추가
   - 시/도 `onChange`: `setSelectedCity('')` + RHF city 빈값 추가
   - 두 useEffect에서 `setSelectedState('')`/`setSelectedCity('')` 리셋 로직 제거 (목록 갱신만 유지)

### 사용처 확인
`grep -rn "AddressInput" src` → recipient/shipper/preferredAddress 등에서 사용 — 모두 동일한 AddressInput 공유하므로 일괄 적용됨

### CI 결과
| 체크 | 결과 |
|:----|:----:|
| Regression Tests | ✅ PASS (5m4s) |
| Task File Check | ✅ PASS |
| Vercel | ✅ PASS |

### 커밋
- `ac752a1b` — `[Dave] fix: TASK-B-140 Issue #530 — AddressInput 국가변경 리셋을 onChange로 이동`

### PR
- https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/531

---

## [DoD Checklist]

- [x] 국가 onChange에 리셋 로직 추가 (setSelectedState/setSelectedCity + RHF)
- [x] 시/도 onChange에 city 리셋 로직 추가
- [x] useEffect 리셋 로직 제거 (목록 갱신만 유지)
- [x] CI 회귀 테스트 PASS 확인
- [x] task file + ACTIVE_TASK.md 반영
- [x] check-R17-DoD 전항목 통과

---

## [발견 이슈]

없음
