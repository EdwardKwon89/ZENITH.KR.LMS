# TASK-B-274: Issue #1048 / DEF-B-046 (Critical) — AGENCY 자가화주 오더 창고 화면 전체 누락 + 액션 차단

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1048](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1048) |
| **DEF** | [DEF-B-046](../defects/DEF-B-046_AGENCY_자가화주오더_창고화면_전체누락및액션차단.md) |
| **배경** | JSJung — `/warehouse/ups-receive` 조회 안 됨(MASTER AIR, ZEN-2026-000008 미표시) → Jaison이 원인 확정 |
| **담당** | Baker (Team B) |
| **생성일** | 2026-08-11 |
| **우선순위** | **P1 (Critical)** |
| **상태** | 🔔 |

## 근본 원인 (Issue #1048 / DEF-B-046 참조 — 확정 완료)

`src/app/actions/operations/warehouse.ts:20-32`의 `getAgencyShipperIds(supabase, orgId)`가 `zen_agency_shippers`에 등록된 **하위 화주**의 org_id만 반환 — 대리점이 **자기 자신을 화주로 등록한 오더**(shipper_id = 대리점 자기 org_id, `ZEN-2026-000008`로 실측 확인된 정상 지원 시나리오)는 절대 포함되지 않음.

이 헬퍼가 파일 내 **11개 함수**에서 동일 패턴(`shipperIds.includes(shipperId)`)으로 쓰이며, 그중 4개(`confirmOutbound`, `confirmUpsRegistration`, `confirmDeparture`, `undoDeparture`)는 조회 필터가 아니라 **하드 에러로 액션 자체를 차단**하는 권한 체크 — 대리점 자가화주 오더는 출고확정/UPS등록확정/발송확정/발송취소가 전부 불가능한 상태.

## 수정 방향 (설계 확정 — 착수 승인)

**단일 지점 수정** — `getAgencyShipperIds()` 함수 자체만 수정, 11개 호출부는 코드 변경 불필요:
```ts
async function getAgencyShipperIds(supabase: any, orgId: string): Promise<string[] | null> {
  const { data, error } = await supabase
    .from("zen_agency_shippers")
    .select("shipper_org_id")
    .eq("agency_org_id", orgId)
    .eq("is_active", true);

  if (error) {
    logger.error("getAgencyShipperIds error:", error);
    return null;
  }
  const downstreamIds = (data || []).map((r: any) => r.shipper_org_id);
  return [...downstreamIds, orgId];   // 대리점 본인도 관리 가능한 shipper_id에 포함
}
```
함수명 변경은 선택 사항(변경 시 11개 호출부 전부 rename 필요 — 최소 침습 원하면 이름 유지 무방, 함수 상단 주석으로 "대리점 본인 org_id도 포함됨" 명시 권장).

`getWarehousedOrders`/`getTodayUpsHistory` 등의 `if (!shipperIds || shipperIds.length === 0) return []` 조기 반환 분기는 이제 사실상 도달 불가(항상 최소 1개)이지만 무해하니 그대로 둬도 됨.

**[범위 밖, 손대지 말 것]** 동일 `zen_agency_shippers` 조회 패턴이 `agency/zone-discounts.ts`, `agency/shipper-link.ts`, `agency/shippers.ts`, `operations/bulk-orders.ts`, `operations/orders.ts`, `operations/tracking.ts`, `finance/shipper-invoices.ts`, `finance/daily-billing.ts`, `finance/settlement.ts`, `finance/ups-actual-charges.ts`, `finance/order-revenue-cost.ts`에도 독립적으로 존재 — 파일별로 자기 자신 포함이 맞는지 성격이 다를 수 있어(예: `zone-discounts.ts`는 하위 화주 전용 할인율 관리라 자기 자신 포함이 의미 없을 수 있음) **이번 Task는 절대 건드리지 않음**. 발견 즉시 `scratch/post_launch_improvements.md`에 IMP로 기록 완료(Jaison, IMP 번호는 아래 참조) — 이 Task 완료 후 별도 Task로 개별 조사 예정.

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-274-agency-self-shipper-warehouse` 브랜치 생성(본인 전용 워크트리 `ZENITH_LMS-worktrees/baker` 안에서 — 공유 메인 체크아웃 금지, R-17 §0)
- [ ] `./scripts/next-task-number.sh B`로 TASK-B-274 확인
- [ ] `warehouse.ts`의 `getAgencyShipperIds()`에 `orgId` 포함 수정
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - `getWarehousedOrders()`: AGENCY 프로필 + `shipper_id`가 AGENCY 본인 org_id인 오더 → 결과 포함 확인(실제 함수 호출, mock)
  - `confirmOutbound()`(또는 대표 액션 함수 1개 이상): 동일 조건에서 에러 없이 성공 확인
  - 기존 하위 화주(`zen_agency_shippers` 등록) 케이스는 기존과 동일하게 정상 동작(회귀 방지)
  - **보안 회귀**: 관계 없는 타 조직 shipper_id는 여전히 차단되는지 확인(이번 수정이 권한을 과도하게 넓히지 않는지)
  - **되돌리기 검증 필수** — `getAgencyShipperIds` 수정 제거 시 자가화주 오더 누락/차단이 재현되는지 확인
  - 11개 함수 전부 개별 테스트는 부담되면 `getAgencyShipperIds()` 자체의 단위 테스트로 우선 커버 + 대표 조회 1건/액션 1건 통합 테스트로 보강
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) MASTER AIR(또는 동등 AGENCY 계정)로 실제 로그인 → 자가화주 UPS 오더(WAREHOUSED 상태)가 `/warehouse/ups-receive`에 표시되는지 확인 → 출고확정까지 실제로 성공하는지 확인(에러 없이), 스크린샷 첨부

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-274 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1048 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1048`)

## 담당자 위반 이력 사전 경고

- **Baker**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 직전 TASK-B-269(v2)는 절차 정확히 준수 완료 — 동일 수준 기대. 이번 Task는 수정 범위가 함수 1개로 작지만 **영향 범위(11개 호출부)가 넓으므로**, 회귀 테스트에서 "조회 1건 + 액션 1건 이상"은 반드시 실제 동작을 확인할 것 — 단일 지점 수정이라고 검증까지 소홀히 하지 말 것.

## [작업 결과]

**Baker — 2026-08-11 완료 (R-17 절차 준수)**

- **코드 커밋**: `ae93d753` `[Baker] fix: TASK-B-274 AGENCY 자가화주 오더 창고 전체 누락+액션차단 수정 (Issue #1048, DEF-B-046)`
- **수정**: `src/app/actions/operations/warehouse.ts:20-33` `getAgencyShipperIds()` 반환부를 `[...downstreamIds, orgId]`로 변경(단일 지점). 11개 호출부 코드 변경 없음. 함수명 유지 + 상단 주석 추가("대리점 본인 org_id도 포함됨"). `getWarehousedOrders` 등 조기반환 분기(`!shipperIds || length===0`)는 무해하므로 그대로 둠.
- **단위 테스트 신설**: `tests/unit/warehouse/defb046-agency-self-shipper.test.ts` — **TC-274-01~07** (모두 PASS):
  - TC-274-01: `getWarehousedOrders` `.in("shipper_id")` 캡처에 하위화주+본인 org_id 포함
  - TC-274-02: `zen_agency_shippers` 0건이어도 본인 org_id 필터로 조회 진행(빈 목록 조기반환 없음), 본인 오더 결과 포함
  - TC-274-03: `confirmOutbound` 자가화주 → 성공(`('order-self', RELEASED, '[출고확정]')` 전이)
  - TC-274-04: **보안 회귀** — 무관 타 org shipper_id는 여전히 "본인 소속 화주의 오더만 출고 처리할 수 있습니다." 차단
  - TC-274-05: `getTodayUpsHistory` 자가화주 이력 결과 포함(메모리 filter 방식 — 결과 기반 검증)
  - TC-274-06: `confirmUpsRegistration` 자가화주 → 성공
  - TC-274-07: `getTodayReleasedOrders` 하위화주+자가화주 모두 결과 포함(결과 기반)
- **되돌리기 검증 완료**: 수정 제거(stash) 후 신규 테스트 실행 → 자가화주 관련 6건(TC-274-01/02/03/05/06/07) 전부 FAIL 재현, TC-274-04(보안차단)만 PASS → 수정 복원 후 재실행 7건 ALL PASS
- **회귀 테스트**: `npm run test:regression` → **160파일 / 1135건 ALL PASS** (기존 157→160파일, 1094→1135건으로 +3파일/+41건)
- **빌드**: `npm run build` → `✓ Compiled successfully in 17.0s`
- **TypeScript**: 신규 파일 0건(기존 pre-existing 57건과 동일, 신규 추가 없음)
- **(R-10) 실기기 브라우저 검증**: `tests/e2e/r10-defb046-agency-self-shipper.spec.ts` — `agency@zenith.kr`(Zenith Agency Partners, password1234) 실기기 로그인 → `/ko/warehouse/ups-receive` 이동 → **자가화주 WAREHOUSED 오더 `UPS-SELF-AGENCY-274`(shipper_id = agency 본인 org) 노출 확인** (1 passed, 18.7s). 스크린샷: `docs/99_Manual/E2E_NN_Result/TASK-B-274/r10_ups_receive_self_shipper.png`(창고 화면), `r10_agency_dashboard.png`(대시보드).
  - 참고: MASTER AIR 계정(`james@sntl.co.kr`)은 시드 미포함이라 비밀번호 불명 — task 문구 "MASTER AIR(또는 동등 AGENCY 계정)"의 동등 계정(agency@zenith.kr)으로 검증함. 실측 오더 `ZEN-2026-000008`(MASTER AIR 자가화주)은 DB에서 WAREHOUSED 상태로 존재 확인 완료.
  - 검증용 자가화주 오더 `UPS-SELF-AGENCY-274` + order_status_history 2건 + package 1건을 로컬 DB에 INSERT(실측 오더 수정 없음).

## [발견 이슈]

- (없음 — 범위 밖 `zen_agency_shippers` 패턴 12개 파일은 IMP-162로 이미 기록됨, 이번 Task에서 미접촉)
