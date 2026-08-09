# TASK-B-241: Issue #943 — 법인정보(마이페이지) 주소·사업자정보 zen_organizations 실제 컬럼 연결 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#943](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/943) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P2 |
| **상태** | 🔔 |

## 개요

JSJung 요청("마이페이지-내프로필에서 주소정보 수정기능이 있어야 해")을 조사하는 과정에서, 오더 등록 시 화주(발송인) 주소 자동입력은 `zen_organizations`의 **실제 컬럼**(`address`/`city`/`state_province`/`zipcode`/`country_code`/`address_detail`, `getCurrentUserAffiliation()`이 조회)에서 온다는 것을 확인했습니다. 그런데 이미 존재하는 "마이페이지 > 법인정보"(`/mypage/corporate`) 화면의 주소(및 대표자/사업자번호/연락처/이메일) 수정 기능은 `zen_organizations.metadata`(JSON)에만 저장되고 있어 — 여기서 아무리 주소를 고쳐도 오더 등록 자동입력에는 전혀 반영되지 않는 연결 누락 버그입니다.

대조군인 `createAgencyShipper()`(`src/app/actions/agency/shippers.ts`)는 동일한 정보를 실제 컬럼에 정확히 저장하고 있어, 이 정상 패턴과 동일하게 맞추면 됩니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `src/app/actions/admin/corporate.ts` 수정

**`getOrganizationInfo()`** (11~29행) — `select` 대상 변경:

```ts
const { data, error } = await supabase
  .from("zen_organizations")
  .select('id, name, rep_name, biz_no, contact_phone, contact_email, address')
  .eq("id", profile.org_id)
  .single();
```

**`updateOrganizationInfo()`** (36~72행) — `metadata` 머지 로직 제거하고 실제 컬럼에 직접 UPDATE:

```ts
export const updateOrganizationInfo = withAction(async function (payload: {
  representative?: string;
  bizNo?: string;
  address?: string;
  contact?: string;
  email?: string;
}) {
  const { profile, supabase } = await validateUserAction();

  if (!profile || (profile.role !== USER_ROLES.CORPORATE && profile.role !== USER_ROLES.ADMIN)) {
    throw new Error("조직 정보를 수정할 권한이 없습니다.");
  }

  if (!profile.org_id) {
    throw new Error("소속된 조직 정보가 없습니다.");
  }

  const { error } = await supabase
    .from("zen_organizations")
    .update({
      rep_name: payload.representative,
      biz_no: payload.bizNo,
      contact_phone: payload.contact,
      contact_email: payload.email,
      address: payload.address,
    })
    .eq("id", profile.org_id);

  if (error) {
    logger.error("Error updating organization info:", error);
    throw new Error("조직 정보 저장 중 오류가 발생했습니다.");
  }

  revalidatePath("/mypage/corporate");
  return true;
});
```

기존 `metadata` 조회/머지 블록(51~59행)은 삭제 — 더 이상 필요 없음.

### 2. `src/app/[locale]/(dashboard)/mypage/corporate/page.tsx` 수정

5개 `defaultValue` 바인딩만 `org?.metadata?.X` → `org?.X`로 변경 (UI 구조·라벨·순서는 전혀 건드리지 않음):

- 209행: `defaultValue={org?.metadata?.representative || ''}` → `defaultValue={org?.rep_name || ''}`
- 217행: `defaultValue={org?.metadata?.bizNo || ''}` → `defaultValue={org?.biz_no || ''}`
- 225행: `defaultValue={org?.metadata?.contact || ''}` → `defaultValue={org?.contact_phone || ''}`
- 233행: `defaultValue={org?.metadata?.email || ''}` → `defaultValue={org?.contact_email || ''}`
- 241행: `defaultValue={org?.metadata?.address || ''}` → `defaultValue={org?.address || ''}`

### 3. 건드리지 않는 것 (범위 밖)

- **스키마/마이그레이션 변경 없음** — `rep_name`/`biz_no`/`contact_phone`/`contact_email`/`address` 컬럼은 이미 존재함(직접 확인 완료). 신규 마이그레이션 파일 작성 불필요.
- **백필 불필요** — 로컬 DB 확인 결과 현재 `metadata`에 해당 키를 가진 조직이 없음(신규 조직도 `createAgencyShipper()`/가입 플로우가 이미 실제 컬럼에 저장).
- `zen_organizations.address_detail`/`address_english`/`address_detail_english`/`country_code`/`state_province`/`city`/`zipcode`/`contact_name` — 이번 폼에 대응하는 UI 필드가 없으므로 건드리지 않음(구조화 다중 필드로의 확장은 이번 범위 아님).
- `createAgencyShipper()`·주소록(`zen_address_book`)·PR#941에서 임베드한 프로필 페이지 주소록 섹션 — 전부 무관, 변경 없음.

## 착수 체크리스트

- [x] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-241-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 241 나와야 정상)
- [x] 위 스펙대로 `admin/corporate.ts` + `mypage/corporate/page.tsx` 수정 (코드는 기존 커밋 `71a16679`에 이미 반영 — 본 Task에서 최종본 확인)
- [x] 회귀 테스트 추가 — **반드시 실제 DB 왕복(또는 최소 실제 payload 캡처) 기반 behavioral 테스트**(toContain/그림자 컴포넌트 금지):
  1. `updateOrganizationInfo()` 호출 시 `.update()`에 전달되는 실제 payload가 `rep_name`/`biz_no`/`contact_phone`/`contact_email`/`address` 키를 포함하고 `metadata` 키는 포함하지 않는지 mock 호출 인자로 직접 검증 ✅ (TC-MEM-05)
  2. `getOrganizationInfo()`의 `.select()` 인자에 위 실제 컬럼명들이 포함되는지 확인 ✅ (TC-MEM-06)
  3. `CorporatePage` 컴포넌트를 실제 렌더링해 `getOrganizationInfo` mock이 반환한 `rep_name`/`address` 등 값이 폼 입력란에 실제로 나타나는지 확인(RTL) ✅ (TC-MEM-07~09)
- [x] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재 → build PASS · 회귀 **988/988 PASS**
- [x] **R-10 필수**: 로컬에서 CORPORATE 역할 계정으로 로그인 → `/mypage/corporate`에서 주소·사업자번호·대표자·연락처·이메일 수정 후 저장 → 페이지 새로고침 후에도 값이 유지되는지 확인 → 이어서 신규 오더 등록 화면(`/orders/new`)의 "화주 정보" 탭에서 방금 수정한 주소가 실제로 자동입력되는지까지 확인(연결 자체가 고쳐졌는지 최종 증명) → 스크린샷 첨부 ✅ (상세는 [작업 결과] 참조)

> ⚠️ **스펙 이탈 1건 (Jaison 검토 필요)**: Jaison 확정 설계에는 "스키마/마이그레이션 변경 없음"이 명시되어 있었으나, R-10 실측 검증에서 **`zen_organizations` UPDATE RLS 정책 부재로 실제 컬럼 저장이 0행 처리되는 차단 버그**를 발견하여 `20260807100000_iss943_zen_organizations_member_update_rls.sql` 신규 migration을 추가했습니다(상세: [발견 이슈] 발견 1). 코드(액션·페이지)는 설계 그대로이며 추가 코드 변경은 없습니다.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-241 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 943 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #943`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. 과거 pg_grant 오류(TASK-B-234) 사례 참고 — DB 관련 코드는 실제 실행/조회로 재검증할 것(이번 건은 마이그레이션 없음이지만 실제 컬럼명 오타 여부는 반드시 psql로 직접 확인).

## [작업 결과]

### 검증 결과 요약

| 검증 항목 | 결과 |
|:----------|:-----|
| 단위 테스트 (TC-MEM-05~09, corporate/corporate-page) | PASS (9/9) |
| 전체 회귀 테스트 `npm run test:regression` | **988/988 PASS** (145 files, 187s) |
| `npm run build` | PASS |
| R-10 실측 (로그인→저장→새로고침→오더 폼 자동입력) | **PASS** (아래 상세) |

### R-10 실측 로그인 검증 (커밋 `45295ad2` 스크린샷 포함)

- 계정: `shipper@zenith.kr`(CORPORATE) / 로그인 → `/ko/mypage/corporate`
- 5개 필드(대표자·사업자번호·연락처·이메일·주소) 마커 값 저장 → 성공 토스트 → 페이지 새로고침 후 **값 유지 확인** (`AFTER_RELOAD` = 마커 값 전부 일치)
- `/ko/orders/new` "화주 정보" 탭 주소 자동입력 = 방금 수정한 주소와 일치 확인 (`ORDER_SHIPPER_ADDRESS`)
- 검증 후 원본 값 복원 완료 (DB 상태: `biz_no=123-45-67890`, 나머지 빈값 — 원본과 동일)
- 스크린샷: `tests/e2e/screenshots/r10-corporate-form-filled.png`, `r10-corporate-after-reload.png`, `r10-order-shipper-auto-fill.png`
- 자동화 스크립트: `tests/e2e/r10-corporate-info-real-column.spec.ts` (Playwright, CI 이전 실측 재현용)

### 커밋 목록 (브랜치 `feature/teamb-241-corporate-info-real-column-fix`)

| 커밋 | 내용 |
|:-----|:-----|
| `a88edac1` | fix: zen_organizations 소속 조직원 UPDATE RLS 추가 (실제 컬럼 저장 차단 해결) |
| `56ee49f9` | fix: **PR#996 리뷰 반영** — UPDATE 정책 컬럼 단위 GRANT 제한 + CORPORATE/ADMIN role 조건 (보안 강화) |
| `45295ad2` | test: R-10 실측 로그인 검증 스크립트 + 스크린샷 3장 |
| `7427fc6a` | test: 법인정보 실제 컬럼 단위 테스트 (TC-MEM-05~09) |
| `19693dc5` | test: pricing-schedule-jsonb 하드코딩 날짜 → KST 동적 날짜 (회귀 결함 수정, TASK-B-131 소관 — R-18 사유: 발견 3 참조) |

> 참고: `admin/corporate.ts`·`mypage/corporate/page.tsx` 코드는 이전 커밋 `71a16679`에 이미 반영되어 있었으며, 본 Task에서 추가 코드 수정은 없었음(RLS migration 신설 + 테스트/검증만 수행).

## [발견 이슈]

### 발견 1 — zen_organizations UPDATE RLS 정책 부재 (TASK-B-241 직접 차단 → 본 Task에서 해결)

- **증상**: `updateOrganizationInfo()`(사용자 스코프 `createClient()`)로 실제 컬럼 UPDATE 시 **에러 없이 0행 처리** → 저장 성공 토스트만 표시되고 DB 미반영.
- **원인**: `zen_organizations`에는 `SELECT` RLS만 존재(`20260506160000_fix_auth_tokens_and_rls_hardening.sql`)하고 UPDATE 정책이 없어, PostgreSQL 기본 거부로 UPDATE 대상 행이 보이지 않음(조용한 0행).
- **검증 방법**: R-10 실측 로그인(`shipper@zenith.kr`) 저장 후 psql로 DB 조회 → 미반영 확인. PostgREST 사용자 토큰 PATCH `return=representation` → `[]`(0행) 확인.
- **1차 해결** (커밋 `a88edac1`): `supabase/migrations/20260807100000_iss943_zen_organizations_member_update_rls.sql` 신규 작성 — "소속 조직원(본인 org)만 본인 조직 행 UPDATE" 정책.
- **Jaison PR#996 리뷰 반려(차단) → 2차 보완 (PR 재제출)**:
  - 지적: RLS는 행 단위만 제어 — "본인 org 소속이면 **전 컬럼** 수정 가능" 보안 결함. `volumetric_divisor`(정산 직결)·`type`·`status` 등 민감 컬럼을 PostgREST 직접 호출로 우회 가능.
  - 보완: ① 정책에 **CORPORATE/ADMIN role 조건** 추가(defense-in-depth, `updateOrganizationInfo()` 역할 검증과 동일 기준) ② **컬럼 단위 GRANT** — `imp153_authenticated_grant_일괄`이 부여한 전체 컬럼 UPDATE(테이블 레벨 + 컬럼 레벨)를 REVOKE로 철회 후 **법인정보 5개 컬럼만 재부여**.
  - 재검증 결과:
    - 정상: CORPORATE 본인 org `rep_name` 변경 → 반영 성공
    - 부정 ①: CORPORATE `volumetric_divisor` 변경 → **HTTP 403 permission denied**
    - 부정 ②: AGENCY(비 CORPORATE/ADMIN) 본인 org `rep_name` 변경 → `[]`(0행) 차단
    - 부정 ③: CORPORATE 타 org `rep_name` 변경 → `[]`(0행) 차단
    - R-10 실측 재실행 → **PASS** (저장→새로고침 유지→오더 폼 자동입력, 원본 복원 완료)
- **GRANT 최종 상태**: `authenticated` UPDATE = `rep_name, biz_no, contact_phone, contact_email, address` 5개 컬럼만.
- **커밋**: `a88edac1`(1차) + `56ee49f9`(2차 보완)

### 발견 2 — `updateAgencyVolumetricDivisor` 동일 RLS 차단 (기존 잠재 결함, 범위 밖)

- `src/app/actions/ups/rates-mutation.ts:367` — `validateUserAction()`(사용자 스코프)로 **타 조직** `volumetric_divisor`를 UPDATE. org UPDATE 정책이 전무했던 기간 동안 동일하게 조용히 0행 처리되었을 것. "본인 org" 정책(발견 1)으로는 해소 불가(타 조직 대상).
- **권고**: 별도 이슈 등록 후 조치 필요 — ① 해당 액션을 admin 클라이언트 전환(`agency/shippers.ts` 패턴) 또는 ② ADMIN/MANAGER 전용 org UPDATE 정책/검증 함수 추가. (본 Task 범위 아님)
- **Jaison 리뷰 부수 확인**: 본 PR의 컬럼 단위 GRANT(`authenticated` UPDATE 5개 컬럼 제한) 적용 후에도 동일하게 타 org 대상이라 RLS USING에서 걸러져 0행(잠재 결함 지속) — 정책 변경과 무관하게 별도 이슈 필요.

### 발견 3 — 범위 밖 커밋 혼입 `19693dc5` (TASK-B-131 회귀 결함 수정, R-18 사유 기록)

- `tests/unit/ups/pricing-schedule-jsonb.test.ts` 하드코딩 날짜(`2026-08-01` 등) → KST 동적 날짜(`kstDateOffset`/`TOMORROW`) 전환. TASK-B-131(Issue #509)의 기존 회귀 결함으로, 오늘(2026-08-07) 기준 날짜 경과로 4건 실패 중이었음. 전체 회귀 통과를 위해 본 PR에 포함했으나, Jaison 확인처럼 별개 Task 사유임 — 되돌리지 않고 유지하며, 향후 유사 케이스는 task file 사유 기재 선행.
- **Jaison 의견**: 수정 방향 타당, 되돌릴 필요 없음. 다음부터 task file에 사유 명시.

### 발견 4 — R-10 스크린샷 주소 "잘림" 확인 (차단 아님, 확인 요청 대응)

- Jaison: `r10-order-shipper-auto-fill.png`에 주소가 "…R1"로 보임 → 법인정보에 저장한 "…R10호"와 다름.
- **확인 결과**: 시각적 잘림(입력란 폭 overflow)일 뿐, DOM 값은 정확 — R-10 재실행 로그 `ORDER_SHIPPER_ADDRESS: 서울 강남구 테헤란로 100길 R10호` = 저장 값과 정확히 일치, 테스트 assertion(`expect(orderAddress).toBe(MARKER.address)`)도 통과.
