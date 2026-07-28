# TASK-B-247: Issue #957 / DEF-B-026 — 청구서 조회 화면 role 차단 + 메뉴 누락 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#957](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/957) |
| **DEF** | [DEF-B-026](../defects/DEF-B-026_shipper_invoices_page_role_gap_and_unreachable.md) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 개요

JSJung 요청으로 "청구서 조회 기능 구조"를 Jaison이 분석하던 중 `/shipper/invoices` 페이지가 실제 화주 role 대부분(`CORPORATE`/`AGENCY_SHIPPER`/`INDIVIDUAL`)에게 "조회 권한이 없습니다" 에러를 던지고, 사이드바 메뉴에도 링크가 없어 아무도 도달할 수 없는 상태임을 발견했습니다. 상세 내용은 DEF-B-026 참조.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `src/app/actions/finance/shipper-invoices.ts` — role 화이트리스트 확장

```ts
const allowedRoles = [
  USER_ROLES.SHIPPER,
  USER_ROLES.CORPORATE,
  USER_ROLES.AGENCY_SHIPPER,
  USER_ROLES.INDIVIDUAL,
  USER_ROLES.ADMIN,
  USER_ROLES.ZENITH_SUPER_ADMIN,
  USER_ROLES.AGENCY,
];
if (!allowedRoles.includes(profile.role as any)) {
  throw new Error('조회 권한이 없습니다.');
}
```

소유권 필터 분기도 4개 화주 계열 role 전부에 동일하게 적용(기존엔 `SHIPPER`만):
```ts
const shipperRoles = [USER_ROLES.SHIPPER, USER_ROLES.CORPORATE, USER_ROLES.AGENCY_SHIPPER, USER_ROLES.INDIVIDUAL];
if (shipperRoles.includes(profile.role as any)) {
  query = query.eq('shipper_id', profile.org_id);
} else if (profile.role === USER_ROLES.AGENCY) {
  // 기존 로직 그대로
  ...
}
// ADMIN/ZENITH_SUPER_ADMIN은 필터 없이 전체 조회 (기존 로직 그대로)
```

### 2. `src/components/layout/NaviSidebar.tsx` — 메뉴 항목 추가

기존 `shipper_ups_rates_nav` 항목(174행 부근) 바로 아래에 동일 패턴으로 추가:
```ts
{ title: t("shipper_invoices_nav"), href: "/shipper/invoices", icon: FileText },
```
(`FileText` 아이콘은 파일 상단에서 이미 다른 용도로 import되어 있는지 확인 후, 없으면 `lucide-react`에서 추가 import)

### 3. 번역키 추가 — `messages/ko.json`·`messages/en.json`의 `Navigation` 네임스페이스

`ko.json`(`shipper_ups_rates_nav` 바로 아래, 107행 부근)에 추가:
```json
"shipper_invoices_nav": "청구서 조회",
```
`en.json`에도 동일 위치에 영문 값으로 추가(예: `"shipper_invoices_nav": "Invoices"`).

### 4. `src/app/[locale]/(dashboard)/shipper/invoices/page.tsx` — 상태 뱃지 수정

`getStatusBadge()`의 `switch` 문을 실제 `zen_invoices.status` CHECK 제약 값 기준으로 교체(기존 `PENDING`/`SENT`는 실존하지 않는 값이라 제거):
```tsx
const getStatusBadge = (status: string) => {
  switch (status) {
    case "UNPAID":
      return <ZenBadge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px]">미결제</ZenBadge>;
    case "PARTIAL":
      return <ZenBadge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">부분결제</ZenBadge>;
    case "PAID":
      return <ZenBadge className="bg-green-50 text-green-700 border-green-200 text-[10px]">결제완료</ZenBadge>;
    case "OVERDUE":
      return <ZenBadge className="bg-red-50 text-red-700 border-red-200 text-[10px]">연체</ZenBadge>;
    case "CANCELED":
      return <ZenBadge className="bg-slate-50 text-slate-400 border-slate-200 text-[10px]">취소</ZenBadge>;
    default:
      return <ZenBadge className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">{status}</ZenBadge>;
  }
};
```

### 건드리지 않는 것 (범위 밖)

- `zen_invoices` 테이블/RLS/CHECK 제약 — 변경 없음(이미 정확함, 액션의 role 화이트리스트만 문제)
- `proxy.ts`의 `isAllowedPath` — `/shipper` 프리픽스는 이미 role 무관하게 허용되어 있어 변경 불필요(직접 확인 완료)
- daily-billing/settlement 등 다른 재무 화면 — 무관

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-247-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 247 나와야 정상)
- [ ] 위 스펙대로 4개 파일 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain/그림자 컴포넌트 금지):
  1. `CORPORATE`/`AGENCY_SHIPPER`/`INDIVIDUAL` role 각각으로 `getShipperInvoices()`를 호출했을 때 에러 없이 성공하고, `.eq('shipper_id', profile.org_id)` 필터가 실제로 걸리는지 mock 호출 인자로 검증(원래 코드로 되돌리면 에러가 던져지는지 재현 확인)
  2. `AGENCY`/`ADMIN` 기존 케이스가 리팩터링 후에도 그대로 동작하는지 확인(회귀 없음)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬에서 `jungjs72@gmail.com`(CORPORATE) 또는 `jungjs@aventusm.com`(AGENCY_SHIPPER) 계정으로 로그인 → 사이드바에서 새 메뉴("청구서 조회") 클릭 → `/shipper/invoices` 페이지에서 실제 본인 소속 화주의 청구서 목록이 에러 없이 뜨는지 스크린샷으로 확인.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-247 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 957 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #957`)

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것.

## [작업 결과]

| 항목 | 내용 |
|:-----|:------|
| **담당 실행자** | D_Kai (Dave 대리) |
| **커밋 해시** | `6b9f930e` |
| **변경 파일** | 6개 파일 (shipper-invoices.ts · NaviSidebar.tsx · i18n 2개 · invoices/page.tsx · tests) |
| **테스트 결과** | `vitest run` — 144 files · 974 tests **ALL PASS** |
| **빌드 결과** | `npm run build` — **SUCCESS** |
| **R-10** | jungjs72@gmail.com(CORPORATE) → /shipper/invoices 정상 접속 확인 ✅ |

### 기존 테스트 개선
- `shipper-invoices.test.ts`: `toContain`/`readFileSync` 소스 문자열 검사(3건) → 실제 함수 호출 기반 behavioral 테스트(8건)로 전면 교체
- 기존 `shipper-invoices-agency-rls.test.ts`는 건드리지 않음(회귀 유지)

### 체크리스트 완료 현황

- [x] 4개 파일 수정 완료
- [x] behavioral 테스트 8건 (CORPORATE/AGENCY_SHIPPER/INDIVIDUAL/SHIPPER/ADMIN/AGENCY/BLOCKED/날짜필터)
