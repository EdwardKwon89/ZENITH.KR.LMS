# TASK-B-184 | Issue #700 | confirmOutbound PACKED 가드 허용 + 출고처리 텍스트

> **Status**: 🔔
> **Branch**: `feature/teamb-184-confirm-outbound-packed`
> **PR**: https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/701
> **Commit**: `9eaa87a1`

## 작업 내용

### Issue #700
confirmOutbound()의 WAREHOUSED 가드에 PACKED 상태를 추가하여, WAREHOUSED 또는 PACKED 오더 모두 출고 확정 가능하도록 수정.

### 수정 상세

1. **src/app/actions/operations/warehouse.ts**
   - 가드 조건: `!== WAREHOUSED` → `!== WAREHOUSED && !== PACKED` (둘 다 허용)
   - 에러 메시지: "WAREHOUSED 상태의 오더만" → "WAREHOUSED 또는 PACKED 상태의 오더만"

2. **messages/ko.json**
   - `confirm_btn`: "출고 확정" → "출고처리"
   - `error_not_warehoused` 메시지 갱신

3. **tests/unit/warehouse/warehouse-actions.test.ts**
   - PACKED → RELEASED 전이 성공 케이스 1건 추가
   - mock에 `user: { id: 'user-1' }` 및 `insert` 체인 추가

### 테스트 결과
- 회귀: 112 files, **747 tests ALL PASS** (746→747)
