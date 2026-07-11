# TASK-B-098: Issue #340 — Supabase Auth app_metadata와 zen_profiles DB 불일치 (RLS 정책 오작동)

| 메타 | 값 |
|:----|:----|
| **Issue** | [#340](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/340) |
| **담당** | Dave (D_Kai) |
| **생성일** | 2026-07-11 |
| **상태** | 🔔 보고 완료 |

## 작업 결과

### 근본 원인
`zen_profiles` DB의 `role`/`org_id` 변경 시 Supabase Auth의 JWT `app_metadata`가 갱신되지 않아 RLS 정책(`auth.jwt() -> 'app_metadata'`)이 오작동. 특히 `createUser()`(admin API)로 생성된 계정은 `handle_new_user` DB 트리거가 발동하지 않아 `app_metadata`가 완전히 비어 있음.

### 변경 사항

#### 1. 신규: `src/lib/auth/sync.ts` — `syncAuthMetadata` 유틸
- `userId` + partial metadata 객체를 받아 Supabase Auth `app_metadata`를 병합 갱신
- `createAdminClient()`(service_role) 사용
- 기존 `member.ts`의 인라인 패턴 추출 → 공용화

#### 2. 수정: `src/app/actions/agency/shippers.ts` — `createAgencyShipper`
- 화주 Auth 계정 생성 후 `syncAuthMetadata(authUid, { role, org_id, org_type, status })` 호출
- admin API(`createUser`)로 생성된 계정에 최초로 `app_metadata` 부여

#### 3. 수정: `src/app/actions/admin/member.ts` — `changeMemberStatus`
- 기존 인라인 동기화 코드 → `syncAuthMetadata(userId, { status })` 호출로 대체 (중복 제거)

### 미적용 (이유)
- **조직 승인**(`/admin/organizations`): RPC(`approve_organization` 등)가 Postgres 레벨에서 `raw_app_meta_data` 직접 갱신 — 이미 `status` 동기화 완료
- **`changeMemberGrade`**: `grade_code`는 RLS/미들웨어에 미사용 — 불필요

### 검증
- **build PASS** ✅
- `createAgencyShipper` 플로우 신규 화주: Auth user 생성 → profile 생성 → `syncAuthMetadata`로 `app_metadata` 설정 — 추후 동일 계정 로그인 시 JWT에 정확한 role/org_id/org_type/status 포함됨

### 커밋
- `cc6aa81f` — `[Dave] feat: TASK-B-098 Issue #340 — syncAuthMetadata 유틸 신설 + 적용`
