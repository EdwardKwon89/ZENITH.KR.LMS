# TASK-B-186 | Issue #708 | .contains() → .like() 수정 (text 컬럼 호환)

> **Status**: 🔔
> **Branch**: `feature/teamb-186-contains-to-like-fix`
> **Commit**: (pending)

## 작업 내용

### Issue #708
`getTodayUpsHistory()` + `getTodayPickupHistory()`의 `.contains("reason", "...")`가 PostgREST의 `@>` 연산자를 생성 → text 컬럼에서 매번 SQL 에러 발생 (code 42883).

### 수정 상세

1. **warehouse.ts**
   - `getTodayPickupHistory()`: `.contains("reason", "[픽업완료]")` → `.like("reason", "%[픽업완료]%")`
   - `getTodayUpsHistory()`: `.contains("reason", "[UPS등록]")` → `.like("reason", "%[UPS등록]%")`

2. **테스트 mock 보강**
   - `warehouse-actions.test.ts`: `like` 체인 mock 추가 (2곳)
   - `ups-pickup-inbound.test.ts`: `like` 체인 mock 추가

### 로컬 DB 검증
- `.contains()` (수정 전): `ERROR: operator does not exist: text @> unknown`
- `.like()` (수정 후): UPS등록 3건 정상 반환, 픽업완료 0건 (데이터 없음 — 정상)

### 테스트 결과
- 회귀: 112 files, **750 tests ALL PASS**
- Build: PASS
