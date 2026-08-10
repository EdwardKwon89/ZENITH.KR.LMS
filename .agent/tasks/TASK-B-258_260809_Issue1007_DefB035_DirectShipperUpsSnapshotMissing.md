# TASK-B-258: Issue #1007 / DEF-B-035 — 비대리점 직접 화주 UPS 오더 예상운임 스냅샷 미생성

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1007](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1007) |
| **DEF** | [DEF-B-035](../defects/DEF-B-035_비대리점_직접화주_UPS_예상운임_스냅샷_미생성.md) |
| **배경** | JSJung 질문("Agency는 오더별 매입/매출이 산정되는데, Admin도 산정되고 있나요?") 검증 중 Jaison 발견. 관련: `scratch/post_launch_improvements.md` IMP-157(정정판) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-08-09 |
| **긴급도/우선순위** | Critical / P1 |
| **상태** | 🔔 (완료 보고 — 검토 요청) |

## 현상 (재확인 필요 없음 — Jaison이 이미 코드 추적으로 확정)

`src/app/actions/operations/orders.ts:121-148`:

```ts
let resolvedAgencyOrgId: string | null = null;
if (profile.role === USER_ROLES.AGENCY_SHIPPER) {
  const { data: agencyLink } = await supabase
    .from('zen_agency_shippers')
    .select('agency_org_id')
    .eq('shipper_org_id', profile.org_id as string)
    .eq('is_active', true)
    .maybeSingle();
  resolvedAgencyOrgId = agencyLink?.agency_org_id ?? null;
  if (resolvedAgencyOrgId) {
    updates.agency_org_id = resolvedAgencyOrgId;
  }
}
...
if (profile.role === USER_ROLES.AGENCY_SHIPPER && validated.ups_product_code) {
  await saveOrderRateSnapshot({ supabase, orderId, validated, profile, agencyOrgId: resolvedAgencyOrgId, estimateFn: estimateUpsFreightFn });
}
```

두 조건 모두 `profile.role === USER_ROLES.AGENCY_SHIPPER`로만 게이트되어 있음:
1. `agency_org_id` 조회/설정 — role이 `AGENCY_SHIPPER`가 아니면 실제로 대리점 소속(`zen_agency_shippers`)이어도 감지 안 됨(IMP-157 원래 지적 사항)
2. **`saveOrderRateSnapshot()` 호출 — role이 `AGENCY_SHIPPER`가 아니면 UPS 예상운임 스냅샷이 아예 생성되지 않음.** 대리점 소속 여부와 무관하게, 대리점과 전혀 관계없는 순수 직접 화주(SHIPPER/CORPORATE/INDIVIDUAL 등)의 UPS 오더도 전부 해당.

## 영향 (DEF-B-035 참조)

스냅샷 부재 → `SettlementEngine.calculateOrderCosts()`(UPS 분기, `settlement.ts:71-73`) 즉시 실패("예상운임 스냅샷이 없습니다") → `zen_order_costs` 생성 불가 → `InvoiceGenerator.generateInvoice()` 연쇄 실패(**인보이스 발행 불가**) → `order-revenue-cost.ts`의 ADMIN 매입/매출도 공백/0 → `ups-detail` 예상운임 표시도 공란.

## 수정 방향 (설계 확정 — 착수 승인됨, 추가 설계 의견 절차 불필요)

`createOrder()`(`orders.ts`)의 두 조건문에서 `profile.role === 'AGENCY_SHIPPER'` 게이트를 제거하고 다음과 같이 변경:

1. **`agency_org_id` 설정**: role 체크 대신 `zen_agency_shippers`에 `shipper_org_id = profile.org_id AND is_active = true`인 행이 있는지로 판단(role 무관). 있으면 `agency_org_id` 설정, 없으면 그대로 null.
2. **예상운임 스냅샷 생성(`saveOrderRateSnapshot`)**: `validated.transport_mode === 'UPS' && validated.ups_product_code`만 조건으로 하고, role/대리점 소속 여부와 무관하게 항상 호출. `saveOrderRateSnapshot`에 넘기는 `agencyOrgId`는 위 1번에서 판단한 값(대리점 미소속이면 `null`/`undefined`) 그대로 전달 — `estimateUpsFreight`는 `agencyOrgId` 미전달 시 이미 `{ platform, agency: null, shipper: null }`을 정상 반환하도록 설계돼 있어 별도 분기 불필요(freight.ts:217-219 확인).

## 착수 체크리스트

- [ ] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-258-direct-shipper-snapshot` 브랜치 생성(worktree 사용 — `agent-worktree-init.sh dave`)
- [ ] `orders.ts:createOrder()` 두 조건문 수정(위 "수정 방향" 1·2번)
- [ ] **회귀 테스트 신설 (필수, R-09)**:
  - 비대리점 직접 화주(role=SHIPPER 또는 CORPORATE, `zen_agency_shippers`에 행 없음)가 UPS 오더 생성 시 `saveOrderRateSnapshot`이 호출되는지(mock 호출 여부 직접 검증 — 결과값이 아니라 **호출 자체**를 assert)
  - 대리점 소속 직접 화주(role=CORPORATE, `zen_agency_shippers`에 활성 행 있음)가 UPS 오더 생성 시 `agency_org_id`가 올바르게 설정되고 스냅샷도 생성되는지(기존 AGENCY_SHIPPER 케이스와 동일 동작)
  - 기존 AGENCY_SHIPPER 케이스가 되돌리기 없이 그대로 정상 동작하는지(회귀 방지)
  - **되돌리기 검증 필수**: 수정 전 코드로 되돌렸을 때 신규 테스트가 실제로 FAIL하는지 직접 확인 후 보고에 명시(최근 Mike/Dave 반복 지적 사항 — vacuous test 금지)
- [ ] `npm run test:regression` 직접 실행, 정확한 PASS 수치 기재
- [ ] `npm run build` SUCCESS 확인
- [ ] (R-10) 실제 브라우저로 비대리점 SHIPPER 계정으로 UPS 오더 1건 등록 → `zen_order_rate_snapshots`에 행이 생겼는지 DB 직접 확인 스크린샷/로그 첨부. 생략 시 반려 처리됩니다.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Dave] fix: TASK-B-258 ...` → 2. task file `[작업 결과]` 작성(커밋 해시 실제 값 기재) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 1007 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성(`feature/* → TeamB_Dev`, `Closes #1007`)

## 담당자 위반 이력 사전 경고

- **Dave**: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. JSJung 2026-07-15 결정에 따라 누적 이력과 무관하게 할당 지속(재론 금지). 최근 반복 유형 — ①task file/ACTIVE_TASK.md 커밋 누락(2026-07-22) ②채번 절차 미준수(`next-task-number.sh` 미실행으로 완료된 과거 Task 번호 재사용, 2026-07-24) ③"그림자 컴포넌트" 테스트(실제 프로덕션 컴포넌트/함수를 거치지 않고 로컬 재구현 대상만 검증, 2026-07-24 2회) ④무관한 과거 task file 오염(워크트리 미격리 혼입, 2026-07-26) ⑤결함 보고서 원본 임의 축소·긴급도 하향(2026-07-24, DEF-B-001). **이번 Task는 특히 ③(그림자 컴포넌트) 재발에 주의** — 위 체크리스트의 되돌리기 검증을 실제 `createOrder()` 서버 액션 호출 기반으로 수행할 것(로컬 재구현 컴포넌트/함수 금지). ②(채번)도 `./scripts/next-task-number.sh B` 직접 실행 후 확인할 것.

## [작업 결과]

**작성자**: Dave | **작성일**: 2026-08-09 | **상태**: 🔔 (검토 요청)

### 구현 (코드 커밋 `1b2bd3c7`)

`src/app/actions/operations/orders.ts` `createOrder()` 두 조건문 수정:

1. **`agency_org_id` 설정** (`orders.ts:121-133`): `if (profile.role === USER_ROLES.AGENCY_SHIPPER)` 게이트 제거 → `if (profile.org_id)`로 변경, `zen_agency_shippers`에 `shipper_org_id = profile.org_id AND is_active = true`인 행 존재 여부로 판단. 대리점 미소속이면 `resolvedAgencyOrgId` 유지(`null`).
2. **예상운임 스냅샷 생성** (`orders.ts:146-148`): `if (profile.role === USER_ROLES.AGENCY_SHIPPER && validated.ups_product_code)` → `if (validated.transport_mode === 'UPS' && validated.ups_product_code)`로 변경. role/대리점 소속 여부와 무관하게 UPS 오더면 항상 `saveOrderRateSnapshot` 호출. `agencyOrgId`는 1번에서 해석한 값 그대로 전달(미소속 시 `null` → `estimateUpsFreight`가 `{platform, agency:null, shipper:null}` 정상 반환, 별도 분기 불필요 — freight.ts:217-219 확인).

### 회귀 테스트 (코드 커밋 `1b2bd3c7` — `tests/unit/orders/direct-shipper-ups-snapshot.test.ts`)

실제 `createOrder()` 서버 액션 호출 기반, `estimateUpsFreight` mock(`saveOrderRateSnapshot` 내부에서만 호출되는 함수)으로 스냅샷 생성 경로 실행 여부를 직접 assert:

| TC | 시나리오 | 검증 내용 |
|:---|:---------|:---------|
| TC-258-01 | role=SHIPPER, 미소속 → UPS 오더 | `estimateUpsFreight` 호출 + `zen_order_rate_snapshots` insert |
| TC-258-02 | role=CORPORATE, 미소속 → UPS 오더 | 스냅샷 생성 + `agency_org_id` 미설정(zen_orders update 없음) |
| TC-258-03 | role=CORPORATE, 활성 agency 행 → UPS 오더 | `estimateUpsFreight`에 `agencyOrgId` 전달 + 스냅샷 생성 + zen_orders update |
| TC-258-04 | role=AGENCY_SHIPPER(기존 케이스) → UPS 오더 | 회귀 방지 — agency_org_id + 스냅샷 동작 불변 |
| TC-258-05 | role=CORPORATE → AIR 오더 | 비-UPS는 스냅샷 미생성 (UPS 전용 조건 유지) |

**되돌리기 검증 (vacuous test 방지, R-09)**: 수정 전 코드로 되돌린 뒤 신규 테스트 실행 결과 **TC-258-01/02/03 3건 FAIL** 확인, TC-258-04(AGENCY_SHIPPER 회귀)·TC-258-05(non-UPS)는 정상 PASS 유지 → 테스트가 수정 내용을 실제로 검증함을 확인. 이후 수정 복원 시 5/5 PASS 재확인.

기존 테스트 3파일(`order-actions.test.ts`·`delivery-method.test.ts`·`tracking-configs-provider-type.test.ts`)은 `agency_org_id` 조회가 모든 프로필에 적용됨에 따라 `mockSupabase.maybeSingle` 기본 해석(`{data:null,error:null}`) 추가로 보정.

### 검증 수치

- **회귀 테스트**: `npm run test:regression` — **1026/1026 PASS** (150 파일)
- **빌드**: `npm run build` — **Compiled successfully** (14.6s)
- **R-10 실브라우저 검증**: 아래 참조

### R-10 실브라우저 검증 (문서 커밋, 스크린샷 `docs/99_Manual/E2E_258_Result/`)

- 신규 비대리점 직접 화주 계정 `r10_direct_shipper_258@zenith.kr`(role=CORPORATE, 신규 SHIPPER 조직 생성, `zen_agency_shippers` 링크 없음)을 서비스롤로 생성
- 실제 브라우저(Playwright Chromium) 로그인 → `/ko/orders/new` → **UPS Direct** 모드 선택 → 수취인 정보(US) + 패키지 + UPS 서비스 티어(Saver) 입력 → "오더 등록" 제출
- 생성된 오더: **ZEN-2026-000012** (`transport_mode=UPS`, `agency_org_id=null`, `ups_product_code=WW_SAVER_NONDOC`, `recipient_country_code=US`)
- **DB 직접 확인**: `zen_order_rate_snapshots`에 해당 오더 행 존재 — `applied_rule=UPS_3TIER`, `applied_unit_price=304800`, `applied_currency=KRW` ✅
- 스크린샷: `01_ups_direct_form_filled.png`(폼 입력), `02_order_detail.png`(오더 상세) — 2026-08-09 실행

### R-17 DoD 체크리스트

- [x] 코드 커밋 (`1b2bd3c7`) — role 게이트 제거 + 신규 테스트 5건
- [x] 문서 커밋 (R-10 증적 + LIVE_REGRESSION_TEST_MAP 갱신 TC-TB258-SNAP-01~04)
- [x] 회귀 테스트 직접 실행 1026/1026 PASS
- [x] `npm run build` SUCCESS
- [x] R-10 실브라우저 검증 (ZEN-2026-000012 스냅샷 생성 DB 확인 + 스크린샷)
- [x] 되돌리기 검증 — 수정 전 코드에서 신규 테스트 3건 FAIL 확인

## [발견 이슈]

1. **`get_next_order_sequence` RPC는 role `SHIPPER`를 허용하지 않음** (`get_my_role() NOT IN (... 'CORPORATE', 'INDIVIDUAL', 'AGENCY', 'AGENCY_SHIPPER')` → `Access Denied`). DEF-B-035가 언급하는 "SHIPPER/CORPORATE/INDIVIDUAL" 중 순수 `SHIPPER` role 계정은 이 RPC 제한 때문에 UPS 오더 등록 자체가 불가 — R-10에서는 `CORPORATE` role로 검증함. `SHIPPER` role 오더 등록 허용 여부는 별도 정책 결정 필요(관련: USER_ROLES에 SHIPPER/CORPORATE가 별개 role로 존재, rbac.ts:18-20).


## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_
