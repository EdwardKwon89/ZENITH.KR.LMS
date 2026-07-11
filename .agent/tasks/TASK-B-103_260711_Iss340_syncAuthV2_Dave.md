# TASK-B-103: Issue #340 — syncAuthMetadata 확장 + changeMemberGrade 적용 + 전수 점검

| 메타 | 값 |
|:----|:----|
| **Issue** | [#340](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/340) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-11 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 변경 내용

#### 1. `src/lib/auth/sync.ts`
- `AuthMetadata` 타입에 `grade_code` 추가

#### 2. `src/app/actions/admin/member.ts` — `changeMemberGrade`
- 등급 변경 후 `syncAuthMetadata(userId, { grade_code })` 호출 추가

#### 3. `supabase/scripts/audit_auth_metadata_mismatch.sql` (신규)
- role/org_id/org_type/status 불일치 전수 점검 쿼리
- org_id 누락 체크
- 고아 계정(profile 없는 auth user) 체크

### 이전 완료 (PR#344)
- `syncAuthMetadata()` 유틸 신설
- `createAgencyShipper` 적용 (metadata 완전 부재 해소)
- `changeMemberStatus` 적용

### 검증
- **build PASS** ✅

Closes #340
