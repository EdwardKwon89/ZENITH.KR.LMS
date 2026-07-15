# TASK-B-126: Issue #480 — AddressBook RLS 조건 패턴 수정

| 메타 | 값 |
|:----|:----|
| **Issue** | [#480](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/480) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-15 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 수정: `src/app/actions/operations/address-book.ts`
- `existingRows` 조회: `.match(owner)` → `.eq()+.is()` 패턴으로 교체
- `insertPath` 조회: `.match(owner)` → `.eq()+.is()` 패턴으로 교체
- `error` 구조분해 확인 추가 (lookup 실패 시 에러 throw)

### 검증
- **Build PASS** ✅
- **Regression**: 81/81 ALL PASS (490 tests)

### 커밋
- (커밋 예정) — `[Mike] fix: TASK-B-126 Issue #480 AddressBook RLS 조건 패턴 수정`
