# TASK-B-241: Issue #943 — 법인정보(마이페이지) 주소·사업자정보 zen_organizations 실제 컬럼 연결 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#943](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/943) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P2 |
| **상태** | ⬜ |

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

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-241-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 241 나와야 정상)
- [ ] 위 스펙대로 `admin/corporate.ts` + `mypage/corporate/page.tsx` 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 DB 왕복(또는 최소 실제 payload 캡처) 기반 behavioral 테스트**(toContain/그림자 컴포넌트 금지):
  1. `updateOrganizationInfo()` 호출 시 `.update()`에 전달되는 실제 payload가 `rep_name`/`biz_no`/`contact_phone`/`contact_email`/`address` 키를 포함하고 `metadata` 키는 포함하지 않는지 mock 호출 인자로 직접 검증
  2. `getOrganizationInfo()`의 `.select()` 인자에 위 실제 컬럼명들이 포함되는지 확인
  3. `CorporatePage` 컴포넌트를 실제 렌더링해 `getOrganizationInfo` mock이 반환한 `rep_name`/`address` 등 값이 폼 입력란에 실제로 나타나는지 확인(RTL)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬에서 CORPORATE 역할 계정으로 로그인 → `/mypage/corporate`에서 주소·사업자번호·대표자·연락처·이메일 수정 후 저장 → 페이지 새로고침 후에도 값이 유지되는지 확인 → 이어서 신규 오더 등록 화면(`/orders/new`)의 "화주 정보" 탭에서 방금 수정한 주소가 실제로 자동입력되는지까지 확인(연결 자체가 고쳐졌는지 최종 증명) → 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-241 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 943 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #943`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. 과거 pg_grant 오류(TASK-B-234) 사례 참고 — DB 관련 코드는 실제 실행/조회로 재검증할 것(이번 건은 마이그레이션 없음이지만 실제 컬럼명 오타 여부는 반드시 psql로 직접 확인).

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
