# TASK-B-124: Issue #469 — AddressBook upsert-by-name 처리

| 메타 | 값 |
|:----|:----|
| **Issue** | [#469](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/469) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-14 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 수정: `src/app/actions/operations/address-book.ts`
- `createAddressBookEntry` 함수 upsert-by-name 로직 추가
- insert 전에 동일 owner scope(org_id/user_id) + display_name으로 기존 행 조회
- 기존 행 있으면 update 경로로 위임
- 기존 행 없으면 insert 경로 유지
- 매칭 기준: owner scope + display_name 완전일치

### 검증
- **Build PASS** ✅
- **Regression**: 81/81 ALL PASS (485 tests)

### 커밋
- (커밋 예정) — `[Mike] fix: TASK-B-124 Issue #469 AddressBook upsert-by-name 처리`
