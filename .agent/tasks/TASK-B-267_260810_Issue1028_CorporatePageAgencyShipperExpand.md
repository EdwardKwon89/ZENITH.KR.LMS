# TASK-B-267: Issue #1028 — /mypage/corporate 법인정보 조회·수정을 AGENCY/SHIPPER까지 확장

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1028](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1028) |
| **배경** | JSJung 요청 — `/mypage/corporate`(법인정보 조회/수정 + 부서 관리)가 현재 CORPORATE·ADMIN 역할에만 열려 있음. AGENCY(대리점)·SHIPPER(화주)까지 확장 |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-10 |
| **우선순위** | P3 |
| **상태** | 🔔 (완료 보고 — 검토 요청) |

## 현재 제한 지점 (3곳 — 반드시 함께 수정)

1. **메뉴 노출** — `src/components/layout/NaviSidebar.tsx:187-189` (CORPORATE/ADMIN만)
2. **서버 액션 권한 체크** — `src/app/actions/admin/corporate.ts`의 `updateOrganizationInfo()`(45행)/`createDepartment()`(108행)/`updateDepartment()`(138행)/`deleteDepartment()`(167행) 4곳
3. **DB RLS 정책** — `supabase/migrations/20260807100000_iss943_zen_organizations_member_update_rls.sql`의 `zen_organizations` UPDATE 정책(`role IN ('CORPORATE', 'ADMIN')`)

**중요**: 이 3곳 중 하나라도 빠지면 "저장 성공" 토스트는 뜨는데 실제 DB에는 반영 안 되는 **조용한 실패**가 재현됩니다(TASK-B-241/DEF-943에서 이미 한 번 겪은 정확히 동일한 패턴 — `src/app/actions/ups/rates-mutation.ts`의 사용자 스코프 클라이언트로 타 조직 행 UPDATE 시도 시 RLS가 0행 처리하며 에러 없이 조용히 실패한 전례 참고). 반드시 앱 레벨 체크 + RLS 정책을 함께, 정확히 동일한 역할 목록으로 맞출 것.

## 수정 방향 (설계 확정 — 착수 승인)

### 1. `NaviSidebar.tsx`
```ts
...(profile?.role === USER_ROLES.CORPORATE || profile?.role === USER_ROLES.ADMIN
  || profile?.role === USER_ROLES.AGENCY || profile?.role === USER_ROLES.SHIPPER
  ? [{ title: t("corporate_mgmt"), href: "/mypage/corporate" }]
  : []),
```

### 2. `corporate.ts` — 4개 함수 모두 동일 패턴으로 역할 체크 확장
```ts
if (!profile || ![USER_ROLES.CORPORATE, USER_ROLES.ADMIN, USER_ROLES.AGENCY, USER_ROLES.SHIPPER].includes(profile.role)) {
  throw new Error("...");
}
```
(기존 `!==` 이중 조건 스타일 유지해도 무방, 가독성 우선 판단은 구현자 재량)

### 3. 신규 마이그레이션 — `zen_organizations` UPDATE RLS 정책 확장
`20260807100000_iss943_zen_organizations_member_update_rls.sql`의 정책을 `DROP POLICY` + `CREATE POLICY`로 대체(기존 파일 직접 수정 금지 — 새 마이그레이션 파일 작성):
```sql
DROP POLICY IF EXISTS "Allow org members to update their organization" ON public.zen_organizations;

CREATE POLICY "Allow org members to update their organization"
ON public.zen_organizations
FOR UPDATE TO authenticated
USING (
  id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE id = auth.uid() AND role IN ('CORPORATE', 'ADMIN', 'AGENCY', 'SHIPPER')
  )
)
WITH CHECK (
  id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE id = auth.uid() AND role IN ('CORPORATE', 'ADMIN', 'AGENCY', 'SHIPPER')
  )
);
```
컬럼 단위 GRANT(`rep_name, biz_no, contact_phone, contact_email, address`)는 이미 `authenticated`에 부여돼 있어 변경 불요(기존 마이그레이션 §2 참조, 재작업 금지).

### 4. `zen_departments` RLS 확인
현재 정책이 CORPORATE/ADMIN 제한을 갖고 있는지 먼저 `\d zen_departments` 및 관련 마이그레이션으로 확인. 있으면 동일 기준(AGENCY/SHIPPER 추가)으로 확장, 없으면(이미 org_id 기준으로만 열려 있으면) 손대지 말고 [발견 이슈]에 "확인 결과 이상 없음"으로 기재.

## 범위 관련 — 손대지 말 것
`AGENCY_SHIPPER` 역할은 이번 요청("agency, shipper")에 명시적으로 포함되지 않음. 임의로 포함하지 말 것 — 필요 여부는 [발견 이슈]에만 기재, 코드 변경은 하지 말 것.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-267-corporate-page-agency-shipper` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/dave` 안에서 — 공유 메인 체크아웃 금지, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-267 확인
- [ ] `NaviSidebar.tsx` 메뉴 노출 조건 확장
- [ ] `corporate.ts` 4개 함수 역할 체크 확장
- [ ] 신규 마이그레이션 작성(zen_organizations UPDATE RLS 정책 교체)
- [ ] `zen_departments` RLS 확인(필요 시 동일 확장, 불필요 시 [발견 이슈]에만 기재)
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - AGENCY/SHIPPER 역할로 `updateOrganizationInfo()` 호출 시 성공 + 실제 DB 반영 확인(behavioral)
  - 기존 CORPORATE/ADMIN 하위 호환 유지
  - 여전히 권한 없는 역할(CARRIER, INDIVIDUAL 등)은 거부되는지
  - **되돌리기 검증 필수(2건)** — ①앱 레벨 체크만 확장하고 RLS는 원복 시 "저장 성공 토스트 뜨지만 DB 미반영"(0행 UPDATE) 재현 ②반대로 RLS만 확장하고 앱 체크는 원복 시 애초에 거부되는지 재현. 결과를 task file에 기재.
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] `npx supabase db reset --yes`(fresh DB) 기준으로 마이그레이션 검증
- [ ] (R-10) 실제 브라우저로 AGENCY 역할 계정 로그인 → 사이드바에 "법인정보 관리" 메뉴 노출 확인 → `/mypage/corporate` 진입 → 정보 수정·저장 → DB 직접 조회로 실제 반영 확인, 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] feat: TASK-B-267 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1028 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1028`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 최근 반복 유형 — ①task file/ACTIVE_TASK.md 커밋 누락 ②채번 절차 미준수 ③무관한 과거 task file 오염(본인 전용 워크트리에서만 작업할 것). 직전 TASK-B-258/261/264는 절차 정확히 준수 — 동일 수준 기대. **이번 Task는 RLS+앱레벨 권한을 정확히 일치시켜야 하는 유형**(TASK-B-241/DEF-943 전례)이라 되돌리기 검증 2건 모두 반드시 실제로 수행할 것.

## [작업 결과]

**작성자**: Dave | **작성일**: 2026-08-10 | **상태**: 🔔 (검토 요청)

### 구현 (코드 커밋 `ce9355ce`)

3곳을 동일 기준(CORPORATE/ADMIN/AGENCY/SHIPPER)으로 함께 수정:

1. **`NaviSidebar.tsx` (187-191)**: "법인 관리"(corporate_mgmt) 메뉴 노출 조건에 `AGENCY`, `SHIPPER` 추가
2. **`src/app/actions/admin/corporate.ts`**: `canManageCorporateInfo()` 헬퍼 신설(`CORPORATE/ADMIN/AGENCY/SHIPPER`) — `updateOrganizationInfo`/`createDepartment`/`updateDepartment`/`deleteDepartment` 4개 함수 역할 체크를 헬퍼로 통일
3. **마이그레이션 `20260810020000_iss1028_corporate_mgmt_agency_shipper_rls.sql`**:
   - `zen_organizations` UPDATE RLS: `role IN ('CORPORATE','ADMIN')` → `('CORPORATE','ADMIN','AGENCY','SHIPPER')` (DROP + CREATE 교체)
   - **`zen_departments` 관리(FOR ALL) RLS**도 CORPORATE/ADMIN 제한 보유 확인 → 동일 기준으로 확장(org_id 매칭 + `role IN ('CORPORATE','AGENCY','SHIPPER')` OR `ADMIN`)
   - 컬럼 GRANT(rep_name/biz_no/contact_phone/contact_email/address)는 기존 부여 유지 — 변경 불요
   - `AGENCY_SHIPPER`는 범위 미포함 — 코드·RLS 모두 추가 안 함

### 회귀 테스트 (코드 커밋 `ce9355ce` — `tests/unit/member/corporate.test.ts`)

| TC | 시나리오 | 결과 |
|:---|:---------|:-----|
| TC-267-01 | AGENCY → updateOrganizationInfo 성공 | ✅ |
| TC-267-02 | SHIPPER → updateOrganizationInfo 성공 | ✅ |
| TC-267-03 | AGENCY/SHIPPER → 부서 create/update/delete 성공 | ✅ |
| TC-267-04 | CORPORATE/ADMIN 하위 호환 유지 | ✅ |
| TC-267-05 | CARRIER/INDIVIDUAL/USER/OPERATOR 거부 | ✅ |
| TC-267-06 | AGENCY_SHIPPER 거부 (범위 미포함 확인) | ✅ |
| TC-267-07 | 권한 없음 역할 부서 create 거부 | ✅ |

### 되돌리기 검증 2건 (TASK-B-241/DEF-943 재발 방지)

- **① 앱 체크만 확장 + RLS 원복**: AGENCY 사용자 스코프 UPDATE → `{data:null, error:null}`(조용한 실패, "저장 성공"으로 오인 가능) + DB에 이전값 유지 → **"토스트는 뜨지만 DB 미반영" 패턴 재현 확인** 후 복원
- **② RLS만 확장 + 앱 체크 원복**: AGENCY `updateOrganizationInfo()` → `data:null`(권한 에러) 반환 → 앱 레벨이 독립적으로 차단함을 확인 후 복원

### 검증 수치

- 전체 회귀: `npm run test:regression` — **1069/1069 PASS** (153 파일, corporate 13건 포함)
- `npm run build` — Compiled successfully (41s)
- `npx supabase db reset` — 마이그레이션 정상 적용 + 시드 후에도 RLS 확장 유지 확인

### R-10 실브라우저 검증 (문서 커밋, 스크린샷 `docs/99_Manual/E2E_267_Result/`)

- AGENCY 역할 계정(`r10_agency_1028@zenith.kr`) 실제 로그인 → **사이드바 "법인 관리" 메뉴 노출 확인** (`01_sidebar_menu.png`)
- `/ko/mypage/corporate` 진입 → 대표자명/연락처 수정(`02_form_filled.png`) → "정보 저장" 클릭(`03_saved.png`)
- **DB 직접 조회**: `rep_name` = 수정값(`R10대표자_...`), `contact_phone` = `010-9999-8888` 실제 반영 확인 ✅

### R-17 DoD 체크리스트

- [x] 코드 커밋 (`ce9355ce`) — NaviSidebar + corporate.ts + 마이그레이션 + 테스트 7건
- [x] 문서 커밋 — R-10 증적
- [x] 회귀 1069/1069 PASS / build SUCCESS / db reset 적용 확인
- [x] R-10 실브라우저 검증 (AGENCY 메뉴 노출 + 수정 저장 DB 반영)
- [x] 되돌리기 검증 2건 (①RLS 원복 조용한 실패 재현 ②앱 체크 원복 거부 재현)

## [발견 이슈]

1. **`zen_departments` 관리 RLS 정책이 CORPORATE/ADMIN 제한 보유 확인 → 이번에 AGENCY/SHIPPER로 확장함** (task 체크리스트 4번 항목: 있으면 동일 확장에 해당). SELECT 정책("Users can view their own organization's departments")은 org_id 기준으로 이미 열려 있어 변경 불요.
2. **AGENCY_SHIPPER 역할**: 이번 요청("agency, shipper")에 명시적으로 미포함되어 코드·RLS 모두 추가하지 않음. 대리점 소속 화주도 법인정보 관리가 필요할지는 JSJung 별도 확인 필요 — 확인 후 필요하면 동일 패턴으로 확장 가능.


## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_
