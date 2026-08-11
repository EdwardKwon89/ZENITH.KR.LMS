# TASK-B-265: Issue #1026 / DEF-B-039 (Critical) — 신규 조직 자가가입 시 ADMIN 권한 자동 부여 취약점

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1026](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1026) |
| **DEF** | [DEF-B-039](../defects/DEF-B-039_신규조직가입시_ADMIN권한_자동부여_취약점.md) |
| **배경** | JSJung이 로컬 테스트 중 신규 대리점("master air") 자가가입 계정이 다른 화주/대리점 오더까지 조회 가능함을 발견 — 실제로는 회원가입 시 ADMIN(플랫폼 전역 관리자) 권한이 자동 부여되는 결함 |
| **담당** | Baker (Team B) |
| **생성일** | 2026-08-10 |
| **우선순위** | **P1 / Critical** — 보안 취약점, 프로덕션에 동일 코드가 있다면 즉시 악용 가능 |
| **상태** | 🔔 |

## 결함 체인 (Issue #1026 본문 전체 참조)

**결함 A**: `src/app/[locale]/(auth)/login/actions.ts:151`
```js
role: isNewOrg ? (orgType === 'CARRIER' ? USER_ROLES.CARRIER : USER_ROLES.ADMIN) : ...
```
"신규 조직 생성"으로 가입 시 CARRIER 제외 전 조직 유형(AGENCY/SHIPPER/CORPORATE/CUSTOMS/DELIVERY)이 무조건 `ADMIN`(플랫폼 전역 관리자) 역할을 받음.

DB 트리거 `handle_new_user()`(`supabase/migrations/20260609230000_fix_handle_new_user_role_from_metadata.sql:25`)도 `COALESCE(..., 'ADMIN')` 폴백으로 동일 결함.

**결함 B**: `approve_organization()` RPC(`supabase/migrations/20260515235000_fix_security_definer_org_rpcs.sql`)가 조직 승인 시 `zen_profiles.status`만 ACTIVE로 바꾸고 `role`은 전혀 재검토 안 함 — 결함 A로 이미 ADMIN인 계정이 그대로 활성화됨.

## 수정 방향 (설계 확정 — 착수 승인)

### 1. `login/actions.ts` — org_type→role 명시적 매핑 (핵심)
```ts
const ORG_TYPE_TO_ROLE: Record<string, string> = {
  CARRIER: USER_ROLES.CARRIER,
  AGENCY: USER_ROLES.AGENCY,
  SHIPPER: USER_ROLES.SHIPPER,
  CORPORATE: USER_ROLES.CORPORATE,
  CUSTOMS: USER_ROLES.CUSTOMS_BROKER,
  DELIVERY: USER_ROLES.DELIVERY_AGENT,
};
// ...
role: isNewOrg
  ? (ORG_TYPE_TO_ROLE[orgType ?? ''] ?? USER_ROLES.CORPORATE) // ADMIN 폴백 절대 금지
  : (orgId === null ? USER_ROLES.INDIVIDUAL : USER_ROLES.USER),
```
`PLATFORM` 조직 유형이 `/register` UI 선택지에 노출돼 있는지도 함께 확인(있으면 안 됨 — 발견 시 [발견 이슈]에 별도 기재, 이번 Task 범위 밖).

### 2. `handle_new_user()` DB 트리거 — ADMIN 폴백 제거 (신규 마이그레이션)
```sql
final_role := COALESCE(new.raw_user_meta_data->>'role', 'CORPORATE'); -- 'ADMIN' 폴백 금지
```
`CREATE OR REPLACE FUNCTION public.handle_new_user()`로 재정의하는 신규 마이그레이션 작성(기존 함수 본문 그대로 두고 이 한 줄만 정정).

### 3. (권장, 방어 심화) `approve_organization()` RPC 하드닝
승인 대상 org의 프로필 중 `role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')`이 있으면 승인을 막거나 최소한 경고 로그를 남기는 방어 로직 추가 검토. 결함 A가 향후 재발해도 결함 B가 최후 방어선이 되도록. 시간 허용 시 진행, 필수는 아님.

### 4. 범위 밖 — 손대지 말 것
프로덕션 기존 계정 감사(org_type≠PLATFORM인데 role=ADMIN인 기존 계정 확인)는 **JSJung이 프로덕션 접근 권한으로 직접 확인**할 사항. 이 Task는 코드 수정만.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-265-signup-admin-privilege-fix` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/baker` 안에서 — 공유 메인 체크아웃 금지, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-265 확인
- [ ] `login/actions.ts`의 `role` 할당 로직을 `ORG_TYPE_TO_ROLE` 매핑 테이블로 교체
- [ ] `/register` 페이지에서 선택 가능한 org_type 옵션 목록 확인(PLATFORM 노출 여부 등 이상 있으면 [발견 이슈]에 기재, 수정은 이번 범위 아님)
- [ ] `handle_new_user()` 트리거 재정의하는 신규 마이그레이션 작성(`COALESCE(..., 'ADMIN')` → `COALESCE(..., 'CORPORATE')`)
- [ ] (권장, 선택) `approve_organization()` 방어 로직 추가
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - `signup()` 호출 시 `is_new_org=true` + org_type별(AGENCY/SHIPPER/CORPORATE/CUSTOMS/DELIVERY/CARRIER) 정확한 역할이 `supabase.auth.signUp()` 호출 인자에 담기는지(behavioral, mock 호출 인자 캡처)
  - `is_new_org=true` + 알 수 없는/누락 org_type일 때 ADMIN이 아닌 CORPORATE로 폴백하는지
  - `handle_new_user()` 트리거: role 메타데이터 누락 시 ADMIN 아닌 안전 기본값 폴백(로컬 DB에 실제 트리거 실행해 검증 — 기존 RLS 세션 시뮬레이션 `psql` 패턴 재사용)
  - **되돌리기 검증 필수** — 수정 전 상태로 되돌려서 "AGENCY 신규가입 시 role=ADMIN" 증상이 실제 재현되는지 확인 후 결과를 task file에 기재. 이번 Task의 핵심 안전장치이므로 반드시 실제 재현할 것.
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 브라우저로 `/register`에서 신규 AGENCY 조직 생성 가입 → 로컬 DB에서 생성된 profile의 role이 `AGENCY`인지 직접 확인, 스크린샷/쿼리 결과 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-265 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1026 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1026`)

## 담당자 위반 이력 사전 경고

- **Baker**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 최근 반복 유형 — ①타인 작업 기록 덮어쓰기 ②마이그레이션 fresh DB 미검증 ③toContain 유형 vacuous 테스트 ④R-10 스크린샷 미확인 제출. **이번 Task는 보안 취약점 수정이라 특히 중요** — 되돌리기 검증을 반드시 실제로 수행하고, 마이그레이션은 `supabase db reset --yes` 기준(fresh DB)으로 검증할 것(TASK-B-234/PR#921 재발 방지 — `information_schema` 등 존재하지 않는 오브젝트 참조 금지, 실제 psql 실행으로 확인).

## [작업 결과]

**담당**: Baker | **완료일**: 2026-08-10 | **코드 커밋**: `90ea3eaa` | **문서 커밋**: 아래 문서 커밋과 분리

### 1. 결함 체인 수정 (3중 결함 전부 처리)

| 결함 | 수정 | 파일 |
|:-----|:-----|:-----|
| **A (핵심)** | 신규 조직 생성 가입자 role → `ORG_TYPE_TO_ROLE` 명시적 매핑(CARRIER→CARRIER, AGENCY→AGENCY, SHIPPER→SHIPPER, CORPORATE→CORPORATE, CUSTOMS→CUSTOMS_BROKER, DELIVERY→DELIVERY_AGENT). ADMIN 폴백 완전 제거, 미매핑/누락 org_type은 `CORPORATE` 안전 폴백 | `login/actions.ts:23-34,162-166` |
| **A (트리거)** | `handle_new_user()` `COALESCE(..., 'ADMIN')` → `COALESCE(..., 'CORPORATE')` — 기존 함수 본문 유지하고 한 줄만 정정 | 마이그레이션 `20260810120000_fix_handle_new_user_secure_role_fallback.sql` |
| **B (방어)** | `approve_organization()` RPC 하드닝 — 승인 대상 조직 내 `role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')` 프로필 존재 시 `RAISE EXCEPTION` 차단(권한 검사 → ALREADY_ACTIVE → 방어 → 승인 순서) | 마이그레이션 `20260810130000_harden_approve_organization_rbac.sql` |

### 2. 테스트 (R-09)

**단위 테스트 신규**: `tests/unit/auth/signup-role-mapping.test.ts` (6건, behavioral — `signup()` 호출 후 `auth.signUp` mock 인자 role 검증)

- TC-265-01: AGENCY 신규 조직 → role=AGENCY (ADMIN 아님) ✅
- TC-265-02: org_type별 정확한 매핑 (CARRIER/SHIPPER/CORPORATE/CUSTOMS/DELIVERY) ✅
- TC-265-03: 알 수 없는 org_type('HACKER') → CORPORATE 폴백 (ADMIN 아님) ✅
- TC-265-04: org_type 누락 → CORPORATE 폴백 ✅
- TC-265-05: 기존 조직 가입 → role=USER 유지 (회귀 보호) ✅
- TC-265-06: 개인 가입 → role=INDIVIDUAL 유지 ✅

**DB 트리거/RPC 검증**: `tests/unit/db/defb039-handle-new-user-role-fallback.test.ts` (3건, **fresh DB `supabase db reset --yes` 기준 psql 직접 실행** — 정보스키마 등 미존재 오브젝트 참조 없음)

- TC-265-07: role 메타데이터 누락 시 `handle_new_user()` 트리거 → **CORPORATE** 폴백 (ADMIN 아님) ✅
- TC-265-08: role 메타데이터 명시(AGENCY) 시 그대로 부여 ✅
- TC-265-09: `approve_organization()` — 조직 내 ADMIN 프로필 있으면 승인 RAISE EXCEPTION 차단 ✅

### 3. 되돌리기 검증 (핵심 안전장치 — 실제 재현 확인)

수정 전 상태(`login/actions.ts` role 라인 HEAD 버전으로 임시 스태시)로 되돌린 뒤 회귀 테스트 실행:

```
× TC-265-01: AGENCY 신규 조직 생성 → role=AGENCY (ADMIN 아님) — FAIL (AGENCY가 ADMIN 부여됨, 취약점 재현)
× TC-265-02~04: org_type별 매핑/폴백 — 4건 FAIL (모두 ADMIN으로 부여되어 기대 불일치)
Test Files  1 failed | Tests 4 failed
```

→ **수정 전 코드로 "신규 AGENCY 가입 → role=ADMIN" 증상이 실제로 재현됨을 확인** 후 픽스 복원, 복원 후 6건 전체 PASS 재확인.

### 4. R-10 실제 브라우저 검증 (role·org_type 한정 화면이므로 실제 로그인/네비게이션 원칙 적용)

baker 워크트리 dev 서버(:3010)에서 `/ko/register` 접속 → 신규 AGENCY 조직 생성 가입(대리점 선택) → wizard 5단계(법인회원→신규법인등록→ORG_CREATE→INFO→DOCS) 완료. 이후 로컬 DB 쿼리:

```sql
SELECT p.email, p.role, p.status, p.org_id, o.name AS org_name, o.type
FROM public.zen_profiles p LEFT JOIN public.zen_organizations o ON o.id = p.org_id
WHERE p.email LIKE 'r10-agency-%' ORDER BY p.created_at DESC LIMIT 5;
-- r10-agency-...@zenith.kr | AGENCY | PENDING | d31ed8f4-... | R10 대리점 ... | AGENCY
```

→ **브라우저로 실제 가입한 신규 AGENCY 조직 생성자의 role이 `AGENCY`(ADMIN 아님), status PENDING 확인.**

### 5. 검증 요약

- `npx tsc --noEmit`: 본 Task 변경 파일 오류 0건 (기존 베이스 브랜치 잔존 오류 52건은 pre-existing, origin/TeamB_Dev와 동일)
- `npm run test:regression`: **155 files / 1071 tests ALL PASS** (기존 152/1047 대비 +3 files/+24 tests)
- `npm run build`: **SUCCESS** (Compiled successfully in 66s)
- 마이그레이션 2건 fresh DB(`supabase db reset --yes`) 정상 적용 확인

### 6. 범위

- 프로덕션 기존 계정 감사(org_type≠PLATFORM인데 role=ADMIN)는 task 범위 밖 — JSJung 직접 확인 예정.

## [발견 이슈]

1. **`/register` UI에 PLATFORM org_type 노출되지 않음 (정상)**: `register/page.tsx` `OrgType = 'PLATFORM' | 'SHIPPER' | 'CARRIER' | 'AGENCY'` 타입에는 PLATFORM이 있지만, UI 선택지는 `(['SHIPPER','CARRIER','AGENCY'] as OrgType[])`만 렌더링 — 사용자가 PLATFORM을 선택할 수 없어 위험 노출 없음. 다만 타입 선언에 PLATFORM이 잔존하므로 향후 제거/정리 고려 가능(이번 범위 밖).
2. **신규 조직 가입 성공 시 페이지 URL이 `/ko/register`에 머물러 있음**: signup 성공 후 `router.push(/ko/register/pending)`가 호출되지만(register/page.tsx:127), 스크립트 측 4초 대기 시점에도 URL이 `/ko/register`였음 — DB에는 정상적으로 PENDING 프로필 생성됨. 리다이렉트 타이밍/동작은 이번 취약점과 무관하나, 유저 피드백 관점에서 확인 여지 있음(이번 범위 밖).
