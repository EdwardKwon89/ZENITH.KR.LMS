# TASK-B-249: Issue #960 / DEF-B-028 — 청구서 조회 화면이 대리점 원가 인보이스 노출

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#960](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/960) |
| **DEF** | [DEF-B-028](../defects/DEF-B-028_shipper_invoices_leaks_admin_to_agency_tier_to_shipper.md) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 개요

PR#959(TASK-B-247, 직전 작업)의 R-10 스크린샷을 Jaison이 직접 확인하던 중, `jungjs72@gmail.com`(화주)이 `/shipper/invoices`에서 본인 인보이스뿐 아니라 **본인 소속 대리점이 관리자에게 지불하는 원가성 인보이스(ADMIN_TO_AGENCY)까지 함께 노출**되는 것을 발견했습니다. 상세 내용은 DEF-B-028 참조.

원인: `getShipperInvoices()`의 화주 계열 필터가 `shipper_id` 기준인데, 이 컬럼은 인보이스 티어와 무관하게 항상 원본 화주 org_id로 동일하게 저장됩니다. 실제로 "누구에게 청구되는가"는 `billed_org_id`(ADMIN_TO_AGENCY는 대리점, AGENCY_TO_SHIPPER/ADMIN_TO_SHIPPER는 화주)입니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### `src/app/actions/finance/shipper-invoices.ts` 수정

직전 TASK-B-247에서 추가된 아래 블록:
```ts
const shipperRoles = [USER_ROLES.SHIPPER, USER_ROLES.CORPORATE, USER_ROLES.AGENCY_SHIPPER, USER_ROLES.INDIVIDUAL];
if (shipperRoles.includes(profile.role as any)) {
  query = query.eq('shipper_id', profile.org_id);
} else if (profile.role === USER_ROLES.AGENCY) {
  ...
```
을 아래로 교체 — `shipper_id` → `billed_org_id` 하나만 변경(그 외 로직 동일):
```ts
const shipperRoles = [USER_ROLES.SHIPPER, USER_ROLES.CORPORATE, USER_ROLES.AGENCY_SHIPPER, USER_ROLES.INDIVIDUAL];
if (shipperRoles.includes(profile.role as any)) {
  query = query.eq('billed_org_id', profile.org_id);
} else if (profile.role === USER_ROLES.AGENCY) {
  ...
```

### 건드리지 않는 것 (범위 밖)

- `zen_invoices`의 RLS 정책("Shippers can view their own invoices", `shipper_id` 기준) — 이번 Task에서 변경하지 않음. RLS는 애플리케이션 쿼리보다 넓게 허용하고 있으나, 다른 곳에서의 영향 범위를 감안해 별도 검토 필요(이번엔 이 페이지의 애플리케이션 필터만 좁혀서 실제 노출을 막음)
- `AGENCY` role 분기(`shipper_id IN (...)`) — 대리점 본인이 자기 원가+판매 인보이스를 함께 보는 건 의도된 동작이라 변경 없음
- `ADMIN`/`ZENITH_SUPER_ADMIN` 전체 조회 분기 — 변경 없음

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-249-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 249 나와야 정상)
- [ ] 위 스펙대로 `shipper-invoices.ts` 수정 (한 줄)
- [ ] 회귀 테스트 추가/수정 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain 금지):
  1. CORPORATE/AGENCY_SHIPPER/INDIVIDUAL/SHIPPER role 호출 시 `.eq('billed_org_id', profile.org_id)`가 실제로 호출되는지 확인(기존 TASK-B-247의 `invoiceChain.eq` 검증 테스트를 `shipper_id` → `billed_org_id`로 수정)
  2. ADMIN_TO_AGENCY 티어 인보이스(billed_org_id=대리점, shipper_id=화주)가 화주 role 세션에서 결과에 **포함되지 않는지** 실측(원래 코드로 되돌리면 포함되는 걸 재현 확인 — 이번 DEF의 핵심 회귀 테스트)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬에서 `jungjs72@gmail.com`으로 `/shipper/invoices` 접속 → 본인에게 청구된 인보이스만 보이고, 대리점의 ADMIN_TO_AGENCY 인보이스(예: `INV-20260728-6441`)는 더 이상 목록에 없는지 스크린샷으로 확인. Agency 계정으로도 기존과 동일하게 양쪽 다 보이는지 회귀 확인.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-249 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 960 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #960`)

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. 직전 TASK-B-247과 같은 파일이라 조건 실수로 되돌리지 않도록 주의.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
