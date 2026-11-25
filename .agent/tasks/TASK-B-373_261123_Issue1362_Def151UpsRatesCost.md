# TASK-B-373 — Issue #1362: DEF-151 UPS 요율 조회 원가 노출·가드 공백 + 대리점 부가요금 소유권 공백 (설계 의견)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1362](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1362) — DEF-151 (Aiden 발령, Jaison 배정: Dave) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison / **확정: Aiden** |
| **상태** | 🔔 PR-2 구현 완료 — 검토 대기 |
| **브랜치** | PR-1 `feature/teamb-task-b373-iss1362-def151-ups-rates-cost`(병합) · PR-2 `feature/teamb-task-b373-iss1362-pr2-guard-dto` (base `origin/TeamB_Dev` 병합본) |
| **공개 저장소 주의** | 노출 경위·재현 절차는 본문에 쓰지 않고 "도달 가능/불가 + 결과표 + 코드 위치"만 기재 |

## 0. 범위

| 구분 | 내용 |
|:--|:--|
| **A. DEF-151 (원 Issue)** | `src/app/actions/ups/rates.ts` 요율 조회 6종 역할 가드 + 비관리자 화면의 `rates-public.ts` 전환 + `/agency/other-charges` 원가 payload 제거 |
| **B. 신규 (Aiden 2026-11-23)** | `src/app/actions/agency/other-charges.ts` 3개 액션의 대리점 소유권(IDOR) 가드 — #1469와 동일 패턴 |
| **C. Low (Issue §2.3)** | `getAgencyPricingPolicies` 가드, `getPublicWeightTierRates` 유효기간 필터 |
| **제외** | RLS 정책·테이블 GRANT 변경(§2-6 잔여 위험), 요율 계산 로직 변경 |

- A는 **설계 확정 후 구현**. B는 Aiden·Jaison이 **PR-1로 먼저 분리 승인** → **PR-1(B) → PR-2(A)**.
- 설계 의견 단계에서는 `src/` 변경 0.

---

## 1. 실측 (실DB, 2026-11-23)

### 1-1. 방법과 한계

- 로컬 실DB·역할별 세션으로 실측 완료. 상세 방법·결과는 비공개 보고한다.
- 실제 로그인(`signInWithPassword`)은 구현 단계 R-09에서 사용한다.

### 1-2. 실측 결과

- 실측 완료, 상세는 비공개 보고.

### 1-5. 호출처 전수 (R-20)

명령: `grep -rn "getUpsOtherCharges\|getUpsBaseRates\|getUpsFuelSurcharge\|getUpsSurgeFees\|getUpsWeightTierRates\|getUpsFreightMinimums" src --include='*.ts' --include='*.tsx' | grep -v "src/app/actions/ups/rates.ts"`

| 파일 | 호출 |
|:--|:--|
| `admin/ups-rates/page.tsx` | import 1 + 호출 6 |
| `components/ups/UpsBaseRateMatrix.tsx` | import 1 + 호출 1(`:89`, client) |
| `agency/other-charges/page.tsx` | import 1 + 호출 1(`:14`) |
| **합계** | **3개 파일, 11줄** |

- `UpsBaseRateMatrix` 사용처: `admin/ups-rates/ups-rates-client.tsx`, `agency/ups-rates/agency-ups-rates-client.tsx`, `shipper/ups-rates/shipper-ups-rates-client.tsx`.
  - agency/shipper는 `readOnly` + `rates` prop을 넘기므로 **effect에서 `getUpsBaseRates`를 호출하지 않는다**(`UpsBaseRateMatrix.tsx:89`의 `isReadOnly && propRates` 분기). 따라서 가드를 걸어도 현 화면은 깨지지 않는다.
  - admin만 `rates` 없이 호출한다 → 가드 통과 필요.
- `rates-public.ts` 호출처: shipper/agency `ups-rates` 페이지 각 7줄(import 1 + 6).
- `getAgencyPricingPolicies`: **호출처 0**(export만, `rates-mutation.ts:255`). Low.
- `getPublicWeightTierRates`: shipper/agency 페이지 2곳. Low.

---

## 2. [설계 의견]

### 2-1. 가드 정책 대안

| 안 | 내용 | 장점 | 단점 |
|:--|:--|:--|:--|
| A. `requireAdminOrManager` 6종 | ADMIN·MANAGER·ZENITH_SUPER_ADMIN만. SUB_ADMIN 제외 | 최소 노출 | SUB_ADMIN 원가 Matrix(TASK-192) 깨짐 → 페이지 분기 필요 |
| B. `requireAdminManagerOrSubAdmin` 6종 | SUB_ADMIN 포함 | TASK-192·페이지 무변경 | SUB_ADMIN이 6종 모두 원가 열람(least privilege 아님) |
| **C. 혼합 (권장)** | `getUpsBaseRates`만 SUB_ADMIN 허용, 나머지 5종은 ADMIN/MANAGER/SUPER | TASK-192 유지 + 최소 권한 | 페이지에서 SUB_ADMIN의 나머지 5탭을 public 데이터로 전환 |

**권장: C.** SUB_ADMIN(SNTL Master Agency)의 의도된 원가 열람은 **기본요율 Matrix(TASK-192)** 뿐이다. 유류·부가요금·급증·구간·최소운임의 플랫폼 원가는 대리점 관리에 필요하지 않다.

- `requireAdminOrManager`/`requireAdminManagerOrSubAdmin`는 현재 `rates-mutation.ts`·`pricing-schedule.ts`에 **파일 로컬 함수**로 중복돼 있다. 이번에 `src/lib/auth/ups-rate-permissions.ts`로 추출해 6종 조회 액션과 기존 mutation이 같은 정의를 쓰게 한다(불일치 방지, R-11/Ds-11).
- 거부 시 `logger.warn` + `trError('permission_denied')`(또는 기존 `Error` 패턴) — 4로케일 키 존재 확인.

### 2-2. TASK-B-091 원칙과 SUB_ADMIN

- TASK-B-091 원칙: **대리점이 볼 수 있는 원가는 "대리점 계산 원가"뿐**이고 플랫폼 원가는 보이지 않는다. `/agency/ups-rates`·`/shipper/ups-rates`가 `rates-public.ts`로 전환된 이유다.
- **SUB_ADMIN은 AGENCY가 아니다**: SNTL Master Agency로 `/admin/ups-rates` 권한과 **기본요율 원가만 편집**하는 역할(TASK-192)이다. 따라서 "대리점 원가만" 원칙의 적용 대상이 아니며, 기본요율 원가 열람은 유지한다.
- **용어 정합**: 규칙 4의 "원가"는 **UPS 실제 원가(admin 전용)**이고, B안의 "대리점 단계"는 **대리점 본인의 매입 단계 금액**(TASK-B-091 원칙)이다. 서로 다른 개념이다.
- 단, SUB_ADMIN에게 5종 플랫폼 원가까지 허용할 근거는 없다 → C안(혼합)으로 최소화.

### 2-3. 구현 설계 (A: DEF-151)

1. **공유 가드 추출** `src/lib/auth/ups-rate-permissions.ts`
   - `requireAdminOrManager(role)` — ADMIN/MANAGER/ZENITH_SUPER_ADMIN
   - `requireAdminManagerOrSubAdmin(role)` — 위 + SUB_ADMIN
   - 기존 `rates-mutation.ts`·`pricing-schedule.ts`의 로컬 함수를 이 모듈로 교체(동작 동일).
2. **6종 액션 가드**
   - `getUpsBaseRates`: `requireAdminManagerOrSubAdmin`
   - `getUpsFuelSurcharge`·`getUpsOtherCharges`·`getUpsSurgeFees`·`getUpsWeightTierRates`·`getUpsFreightMinimums`: `requireAdminOrManager`
   - `validateUserAction()` → 역할 검사 → 거부 시 `logger.warn` + `trError('permission_denied')` throw.
3. **비관리자 화면 전환**
   - `/agency/other-charges/page.tsx`: `getUpsOtherCharges()` → `getPublicOtherCharges()` (Team A 파일, 이 이슈 예외 허용). 클라이언트는 코드·명칭·단위만 사용하므로 public 인터페이스로 충분(코드 확인). 플랫폼 원가는 사용하지 않는다.
   - `admin/ups-rates/page.tsx`: SUB_ADMIN이면 기본요율은 `getUpsBaseRates`, 나머지 5종은 `rates-public.ts`로 전환(또는 탭 비노출). 또한 페이지의 **직접 fuel 조회**도 SUB_ADMIN 경로에서 원가가 전달되지 않도록 public 함수로 교체.
   - `UpsBaseRateMatrix`: admin은 기존 `getUpsBaseRates`, 비관리자는 `rates` prop(public)만 사용하도록 정리. client 번들에서 admin 액션 import를 제거하거나 `fetchRates` prop으로 주입.
   - **타입 정합**: `AgencyOtherChargesClient.allOtherCharges`를 public 타입으로, SUB_ADMIN용 `UpsRatesClient` prop도 public 타입으로 조정한다(클라이언트 사용 항목과 일치함을 코드로 확인).
4. **페이지 가드 보강**: `admin/ups-rates/page.tsx`에 `checkPermission(profile.role, '/admin/ups-rates')`(또는 역할 검사)를 추가해 비관리자 진입을 차단(미들웨어와 이중 방어).
5. **Low**
   - `getAgencyPricingPolicies`(호출처 0): `requireAdminManagerOrSubAdmin` 추가(방어). RLS(`admin_all`/`sub_admin_scoped`/`agency_select`)는 유지.
   - `getPublicWeightTierRates`: `valid_from <= refDate` + `valid_until is null or >= refDate` 필터 추가(기본요율과 동일).
6. **PR-2 추가 점검(Aiden 요청)**: `estimateUpsFreight` 응답에서 **비관리자에게 전달되는 필드 범위**를 점검하는 항목을 PR-2 설계에 포함할 수 있는지 검토한다. 상세 기준은 Aiden이 별도 전달하며, 이번 설계에서는 **점검 항목 등록**까지 한다.

### 2-3A. PR-2 견적 응답 필드 범위 점검 (Aiden 2026-11-23 23:34 기준)

> 공개 저장소 기준: **포함/미포함 결과표만** 기록하고 구체 필드명·응답 값·재현 호출 형태는 쓰지 않는다.

#### (1) 목표 DTO — 역할 × 단계

- 실측 완료, 상세는 비공개 보고.

**목표 DTO — JSJung ③ B안 (세션 역할 + 화주의 대리점 소속 여부)**

| 단계 | 관리자 | 대리점 | 화주(대리점 소속) | 화주(대리점 없음) |
|:--|:--:|:--:|:--:|:--:|
| 1. 플랫폼 원가 계열 | 포함 | **미포함** | 미포함 | 미포함 |
| 1. 플랫폼 판매가 계열 | 포함 | 포함 | **미포함** | 포함 |
| 2. 대리점 단계(자기 원가·판매가·할인율·부가운임) | 포함 | **포함(자기 것)** | 미포함 | 해당 없음 |
| 3. 화주 단계(최종 운임·항목별 판매 금액(기본·유류·부가 합계·급증)·화주 할인율) | 포함 | 포함(자기 소속 화주) | 포함 | 해당 없음 |
| 중량·통화·부가항목(판매) | 포함 | 포함 | 포함 | 포함 |

- **대리점 소속 화주에게 1단계 판매가를 주면 대리점 원가가 노출**되므로, 소속 화주에게는 1단계 판매가를 전달하지 않는다.
- 등록 폼의 대체 경로(화주 최종 운임이 없을 때 1단계 판매가 사용)가 **소속 화주에게 발생하지 않도록** DTO에서 화주 단계를 보장한다. `estimated_cost`는 변경 전후 동일해야 한다.
- **항목 집합 근거**: 화주 단계의 항목별 판매 금액은 견적 패널·등록 폼이 읽는 집합과 일치한다(`UpsFreightEstimatePanel`·`OrderRegistrationForm`·`UpsFreightEstimateSection` 코드 대조). 상세 목록은 비공개 전달.
- **부가항목 행 금액 기준**: 대리점 소속 화주의 항목 행 금액은 **화주 청구 단계 기준**, 비소속 화주는 **플랫폼 판매가 기준**으로 한다. 이 정의로 표시값이 바뀌면 R-10 "표시 금액 동일"의 **예외**로 명시하고, 화주·대리점 경로별 변경 전후 스크린샷과 JSJung 확인을 거친다. 바뀌지 않으면 동일 확인 방법을 기록한다.

#### (2) 처리 방향 비교 — 서버 내부 호출 불변

| 안 | 내용 | 장점 | 단점 |
|:--|:--|:--|:--|
| **(a) 내부 계산 분리 + 세션 DTO 진입점 (권장)** | 전체 계산 함수를 **`src/lib/ups/estimate-core.ts`(`server-only`)** 로 이동. `'use server'` 파일에는 **세션 역할·소속으로 DTO를 정제하는 클라이언트 진입점만** 남김 | 내부 호출은 core를 import(동작 불변·경로 변경), 비관리자 payload 최소화 | import 경로 변경·DTO 타입 |
| (b) 래퍼만 추가 | `'use server'`의 기존 `estimateUpsFreight`를 래퍼로 감쌈 | 변경 작음 | **기존 액션이 직접 호출 가능한 진입점으로 남아 제한 불완전** |
| (c) 클라이언트 정제 | 화면에서 제거 | 서버 무변경 | payload가 이미 전달된 뒤 — 보안 효과 없음 |
| (d) 타입만 제한 | TS 타입 | 변경 최소 | 런타임 보호 없음 |

- **권장: (a)**. 서버 내부 호출은 **동작 불변**이며 import 경로만 core로 바뀐다.
  - 내부 호출자: `operations/orders.ts`(직접 import + `rate-snapshot-refresh`에 `estimateFn` 주입), `finance/ups-actual-cost.ts`, 단위 테스트 4개(`freight-actions`·`rate-snapshot-refresh`·`ups-actual-cost`·`ups-estimate-panel`).
  - **#1462 B-381의 `recomputeRevenue`도 같은 함수를 import** — 구현 순서·충돌 조정 필요(같은 담당자).
  - **mock 영향 20개(unit 19 + integration 1)**: `grep -rlE "vi\.mock\(['\"]@/app/actions/ups/freight" tests` 전수 결과. core import로 바뀌면 기존 mock이 가로채지 못하므로 **모든 mock 경로를 core로 갱신**(세션 진입점 mock과 core mock 구분)하고 **한 PR에서 전체 회귀 PASS**를 증빙한다.
    ```
    tests/integration/task-b370-snapshot-safe-view.test.ts
    tests/unit/agency/order-rate-snapshots.test.ts
    tests/unit/finance/task-b352-error-locale.test.ts
    tests/unit/finance/task-b364-cost-integration.test.ts
    tests/unit/finance/task-b366-cost-settlement.test.ts
    tests/unit/finance/ups-actual-cost.test.ts
    tests/unit/logistics/inbound.test.ts
    tests/unit/logistics/order-update-b339.test.ts
    tests/unit/orders/defb058-edit-mode-autofill-overwrite.test.tsx
    tests/unit/orders/direct-shipper-ups-snapshot.test.ts
    tests/unit/orders/edit-form-warehoused-unlocked.test.tsx
    tests/unit/orders/iss1089-ups-redirect-ups-detail.test.tsx
    tests/unit/orders/iss1091-hscode-english-filter.test.tsx
    tests/unit/orders/iss1100-shipper-name-toggle.test.tsx
    tests/unit/orders/iss1102-shipper-info-ui-simplify.test.tsx
    tests/unit/orders/iss1104-addressinput-toggle.test.tsx
    tests/unit/orders/order-registration-form-b301.test.tsx
    tests/unit/orders/task-b367-settled-cargo-guard.test.ts
    tests/unit/orders/ups-product-code-select.test.tsx
    tests/unit/orders/ups-product-guard.test.ts
    ```
  - 클라이언트 import 전환 대상: `src/components/orders/UpsFreightEstimateSection.tsx` **1곳**. 다른 클라이언트 호출처 없음(전수 grep).
- DTO 범위는 **세션 역할 + 화주의 대리점 소속 여부**로 정한다. 클라이언트 인자로 범위를 정하지 않는다.
  - SHIPPER: `shipperOrgId`는 세션 org로 고정, `agencyOrgId`는 서버에서 소속 조회.
  - AGENCY: `agencyOrgId`는 세션 org, 대상 `shipperOrgId`는 **자기 소속인지 검증(PR-1 패턴)**.
  - ADMIN: 전체.
- **JSJung ③ B안 확정**: 관리자 전체, 대리점 자기 단계, 소속 화주는 자기 청구 단계만, 비소속 화주는 자기 운임.

#### (3) 회귀 확인 (R-10)

- 오더 등록 폼의 **표시 금액**과 `estimated_cost`가 변경 전후 동일해야 한다.
- 화주 등록 경로·대리점 등록 경로 각각 R-10 스크린샷으로 확인한다(구현 PR-2).
- `estimated_cost`는 화주 최종 운임을 우선하고, 없는 경우 플랫폼 판매가를 쓴다(실측 상세 비공개).

#### (4) `estimated_cost` 서버 사용 방식

- `zen_orders.estimated_cost`에 저장되고 수정 화면 기본값·이력 비교에 쓰이는 **참고 표시용 파생값**이다.
- 청구·정산 계산에는 사용되지 않는다(코드 검색 결과).

#### (5) 범위 확장 점검

- 실측 완료, 상세는 비공개 보고. 이번 PR-2에서는 수정하지 않는다.

#### (6) PR-2 포함/분리

- **core 분리 + 세션 DTO 진입점 + 클라이언트 전환 + 회귀 테스트**는 **PR-2에 포함 권장**.
- **구현 순서**: B-382(#1465) 함수 적용 → **B-373 PR-2(core 분리)** → **B-381(#1462, core import 기준)**. B-381이 먼저면 import 경로를 다시 바꿔야 하므로 이 순서를 따른다.
- JSJung ③ B안 확정에 따라 DTO 범위를 위 표로 고정한다.
- 범위 확장 점검에서 발견한 별도 보안 Task 대상 1건은 **PR-2에서 수정하지 않는다**(상세 비공개 보고).
- 회귀 테스트는 **"DTO 키 집합 = 화면 사용 집합"** 을 역할·소속 조합별(관리자/대리점/화주 소속/화주 자가)로 단언하고, `estimated_cost` 변경 전후 동일을 확인한다.

### 2-4. 구현 설계 (B: 대리점 소유권 가드, PR-1 권장)

`src/app/actions/agency/other-charges.ts` 3개 액션:

| 액션 | 가드 |
|:--|:--|
| `getAgencyOtherCharges(agencyOrgId)` | **조회 전** `ownAgencyError(profile, agencyOrgId, …)` → 불일치 시 `own_agency_only` |
| `upsertAgencyOtherCharge(agencyOrgId, data)` | **쓰기 전** `agencyOrgId`를 `profile.org_id`와 비교(SUPER_ADMIN 예외). 사후 재확인 없음 |
| `deactivateAgencyOtherCharge(id)` | **선조회**로 `agency_org_id` 확인 + `update … eq('id').eq('agency_org_id', row.agency_org_id)` 이중 방어 |

- **PR-1은 `shippers.ts`를 건드리지 않는다.** `ownAgencyError`는 `other-charges.ts` **파일 내부 지역 헬퍼**로 둔다(동일 로직의 소규모 중복 허용). 새 파일·새 오류 키 금지, `own_agency_only`(main 기존 키) 재사용.
- `ZENITH_SUPER_ADMIN` 예외는 #1469와 동일(전역 바이패스 정합).
- 거부 시 `logger.warn` + `own_agency_only`(4로케일 기존 키).
- `createAdminClient`는 가드 통과 후 유지(현행). #1469 패턴과 동일.
- **diff 범위**: `other-charges.ts` + 통합 테스트 + Ds-11 + 회귀 항목. `git diff --stat`으로 PR에 기재.
- **장기 방향(IMP 제안)**: 이 테이블에는 `agency_own`/`admin_all` DB 정책이 있으므로 세션 클라이언트로 전환하면 DB가 격리를 강제한다. 이번 PR-1은 Aiden 요청대로 #1469 패턴(admin client + 가드) 유지, 세션 클라이언트 전환은 IMP 제안으로 분리.
- **PR-1 분리 이유**: Aiden·Jaison 승인, 운영 p1, DEF-151 설계와 독립.

### 2-5. 테스트 계획 (R-09)

**A. 6종 액션 (구현 단계)**
1. 실제 로그인 세션(`signInWithPassword`)으로 SHIPPER·AGENCY → 6종 호출 시 **거부**(`permission_denied`), 원가 payload 0.
2. ADMIN·MANAGER → 6종 허용 + 원가 컬럼 포함(양성 대조).
3. SUB_ADMIN → `getUpsBaseRates` 허용(원가 포함), 나머지 5종 거부(C안).
4. **되돌리기**: 가드를 제거하면 SHIPPER/AGENCY가 원가를 받아 **FAIL**하는지 조건별 표로 실측 후 원복.
5. `/agency/other-charges`·`/agency/ups-rates` 응답 payload에 원가 계열 미포함(실제 세션·RSC payload).
6. `admin/ups-rates` 관리자 화면 무회귀, `/admin/error-logs` 신규 ERROR 0.

**B. 소유권 (PR-1)**
7. AGENCY A → B 조회/upsert/deactivate **거부**. 거부 시 **DB 불변**: 타 대리점 행의 값·`is_active`·행 수 불변, 거부된 upsert가 행을 만들지 않음.
8. A 자기 소속 조회/upsert/deactivate 성공, ZENITH_SUPER_ADMIN 양성 대조.
9. **함수별 되돌리기 실측**: 각 가드를 무효화하면 해당 케이스만 FAIL(IDOR 성립)하고 나머지는 PASS — 측정 후 원복.
10. 실DB·실제 세션 기준(`signInWithPassword`·`getUserClient`), 소스 문자열 검사·skip 금지.

**C. Low**
11. `getAgencyPricingPolicies` 비관리자 거부.
12. `getPublicWeightTierRates` 만료 행 미반환.

- 구현 단계: `npm run test:regression`, `npm run build`, Ds-11 `check:ds11`.

### 2-6. 잔여 위험 — 액션·화면 외 경로 (별도 p2 Task)

- 이번 설계는 **서버 액션/RSC·화면 경로**를 닫는다.
- 액션·화면 외 경로(DB 권한·정책 수준)의 잔여 위험은 **이 Task에서 다루지 않는다.** Aiden이 **p2 별도 Task**로 안내하며, **이번 PR-1·PR-2 범위에는 포함하지 않는다.** 정책 교체는 견적 엔진·공개 조회 함수의 읽기 방식 변경이 선행되어야 하며, 상세·재현 정보는 공개 문서에 적지 않고 비공개로 전달한다.
- PR-2의 공개 조회 함수(`rates-public.ts`)는 이후 **안전 뷰로 소스 테이블을 교체하기 쉬운 구조**(조회 함수 한 곳에서 소스 변경)를 유지한다.
- R-09의 "대리점·화주 세션이 원가 컬럼을 받지 못한다"는 **액션/화면 경로 기준**으로 검증하고, 그 외 경로는 별도 Task 결과로 다룬다.

### 2-7. Ds-11·R-12

- `docs/02_Analysis/ds11/Ds_11_11A_UPS_Rates.md` §11.15~11.17의 DEF-151 관련 서술을 수정 후 상태(6종 가드·public 전환)로 갱신.
- `rates.ts` 시그니처는 변경 없음(내부 가드만) → 시그니처 변경 없음 근거를 PR에 기재.
- `agency/other-charges.ts` 3종 가드·오류(`own_agency_only`)도 같은 문서/인덱스에 반영.
- `npm run check:ds11` 통과.

### 2-8. 마이그레이션·배포

- **DB 마이그레이션 없음**(액션 가드·화면·Low). 액션·화면 외 잔여 위험은 **p2 별도 Task**(이번 범위 제외).
- PR 순서: **PR-1(소유권, 착수 승인됨)** → **PR-2(DEF-151, 설계 확정 후)**. 각 PR은 `Refs #1362`, Close는 Jaison 수동. PR-1은 `TeamB_Dev` 대상·`other-charges.ts`/테스트/Ds-11 최소 diff로 만들고 Aiden이 main 이식을 검토한다.
- PR-2는 `agency/other-charges/page.tsx`(Team A 1파일) 외 Team A 파일을 건드리지 않는다(`git diff --stat` 확인).

---

## 3. 확정된 결정 (Aiden·Jaison, 2026-11-23)

| # | 결정 |
|:-:|:--|
| 1 | 가드 **C안** 승인(기본요율만 SUB_ADMIN, 나머지 5종 ADMIN/MANAGER/ZENITH_SUPER_ADMIN). 공유 가드 추출 승인 |
| 2 | **PR-1(소유권) → PR-2(DEF-151)** 분리 승인. PR-1 먼저 |
| 3 | 액션·화면 외 잔여 위험은 **p2 별도 Task**(Aiden 안내, 이번 PR-1·PR-2 범위 제외) |
| 4 | Low 2건은 **PR-2 포함** |
| 5 | PR-1: `shippers.ts` 미수정·새 파일/키 금지·`own_agency_only` 재사용·쓰기 전 검증·DB 불변 테스트 |
| 6 | PR-2: 대리점 자기 `agency_other_charges` 매입가 편집 유지 R-10 화면 증적 필요 |
| 7 | PR-2: Aiden 점검 기준 5개 반영 완료. **JSJung ③ B안 확정** — core 분리+세션 DTO를 PR-2 포함. 범위 확장 점검의 별도 보안 Task 대상 1건은 상세 비공개 |

### JSJung 확인 항목

| # | 항목 | 상태 |
|:-:|:--|:--|
| 1 | 부가항목 행 금액 기준(소속 화주=화주 청구 단계) 적용 시 표시값 변경 여부 | **확인 필요** — 변경 시 R-10 예외·화주/대리점 경로 스크린샷 |

### JSJung 확정 (2026-11-23, Jaison 회신)

| # | 항목 | 확정 |
|:-:|:--|:--|
| ① | 요율 조회 6종 가드 | **C안 확정** — `getUpsBaseRates`만 SUB_ADMIN, 나머지 5종은 ADMIN·MANAGER·ZENITH_SUPER_ADMIN. 공유 가드 추출 포함 |
| ② | 액션·화면 외 경로 잔여 위험 | **p2 별도 Task 수용**, PR-1·PR-2 범위 제외. **DEF-151 완전 종결은 그 Task 일정에 종속** |
| ③ | 견적 응답 범위(관리자·대리점 단계 금액) | **B안 확정** — 관리자 전체, 대리점 자기 단계, 소속 화주 자기 청구 단계, 비소속 화주 자기 운임. §2-3A 목표 DTO 참조 |

## [설계 확정] (Aiden 전속 — R-17)

| 항목 | 내용 |
|:--|:--|
| **확정 대상** | PR-2 설계 의견 8차 (head `6bbb25686`, 내용 커밋 `3183626b7`) |
| **확정 일시** | 2026-11-24 10:50 KST 조건부 확정 → 11:29 KST 조건 반영 확인·**확정** |
| **근거 코멘트** | 조건부 확정: [PR #1476 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1476#issuecomment-7119501112) / 확정: [PR #1476 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1476#issuecomment-7120194538) |
| **확정 범위** | 요율 조회 6종 가드 C안, `server-only` core 분리 + 세션 진입점 DTO, JSJung ③ B안 DTO, 공개 기재 정정, 필수 조건 3건(화주 단계 DTO 필드 완전성·부가항목 행 금액 기준 단계·규칙 4 용어 정합)과 경미 조건 |
| **미결(JSJung 확인)** | 부가항목 행 금액 기준 적용 시 소속 화주의 표시값 변경 여부 — 구현 단계에서 변경 전후 스크린샷으로 확인, 바뀌면 R-10 예외 기록 |
| **유지되는 전제** | 구현 순서 B-382 → B-373 PR-2 → B-381(core import 기준, Jaison이 JSJung 확인). 병합은 Squash(제목·본문 직접 작성), 구현은 별도 PR. 공개 기재 기준(목표 상태·판정 기준만) 유지 |
| **상태 라벨** | IS #1362 `status:in-progress`(PR-1 병합분). PR-2 착수 전 담당자 지정 필요 |

## 4. [작업 결과]

- 설계 의견 + 실측(6종×5역할, 소유권 허용/거부, RLS 정의, 호출처 전수). 공개 문서에는 허용/거부 결과만 기재.
- Aiden·Jaison 조건부 승인(2026-11-23). **PR-1(소유권) 착수 승인**, PR-2는 설계 확정 후.
- **PR-1 구현**: #1478 TeamB_Dev 병합 완료.
- **8차 변경**: Aiden 조건 3건(화주 단계 항목 완전성·부가항목 기준 단계·규칙4 용어 정합) + 경미(요율 6종 표현, DTO=화면 집합, 구현 순서) 반영.
- 범위 확장 점검에서 별도 보안 Task 대상 1건 발견 — 상세는 비공개 보고(공개 문서 미기재).
- PR: #1476 (draft, `Refs #1362`).
- **커밋 해시**: `3183626b7` (8차 내용 커밋). 해시 갱신 커밋 별도.


## 5. PR-2 구현 결과 (2026-11-25)

| 항목 | 내용 |
|:--|:--|
| **브랜치** | `feature/teamb-task-b373-iss1362-pr2-guard-dto` |
| **PR** | `Refs #1362` (별도 PR, `TeamB_Dev` 대상·Squash) |
| **마이그레이션** | **없음** |

### 1. 요율 조회 6종 가드 (C안)
- 기본요율: ADMIN·MANAGER·ZENITH_SUPER_ADMIN·**SUB_ADMIN**
- 나머지 5종(유류·부가·급증·구간·최소): ADMIN·MANAGER·ZENITH_SUPER_ADMIN
- 거부 시 `permission_denied` + warn 로그
- 공용 가드 `src/lib/auth/ups-rate-permissions.ts`로 통합(기존 mutation·schedule 로컬 함수 대체)

### 2. 비관리자 화면 데이터 최소화
- `/agency/other-charges`: 공개 판매가 조회로 전환
- `/admin/ups-rates`: SUB_ADMIN은 Zone·제품·기본요율·대리점 정책 탭만 노출, 나머지 원가 데이터는 서버에서 미전달
- 기본요율 Matrix: 관리자 액션 직접 import 제거 → 서버 주입 `fetchRates` 사용

### 3. 견적 응답 DTO (확정 B안)
- 전체 계산을 `src/lib/ups/estimate-core.ts`(server-only)로 분리
- 세션 진입점은 **역할·소속으로 범위 결정 후 DTO 반환**
- 내부 서버 호출자(오더 등록·스냅샷 갱신·실비 재계산)는 core 직접 사용
- 원가 계열은 관리자에게만, 소속 화주에게는 플랫폼 판매가(1단계) 미전달

### 4. Low
- `getAgencyPricingPolicies` 관리자급 가드 추가(방어)
- `getPublicWeightTierRates` 기준일 유효기간 필터 추가

### 5. 테스트·검증
- 신규 단위 3파일 **30/30 PASS**, 기존 회귀 PASS, `npm run build` SUCCESS
- 되돌리기: 가드 제거 → 4 failed / DTO 판매가 허용 → 1 failed, 복구 후 30/30·5/5 PASS
- `check:ds11`·`check:doc-links` 통과
- 회귀 항목: `docs/08_Self_Audit/Checklists/regression-items/TASK-B-373_Issue1362_ups-rates-guard-dto.md`
