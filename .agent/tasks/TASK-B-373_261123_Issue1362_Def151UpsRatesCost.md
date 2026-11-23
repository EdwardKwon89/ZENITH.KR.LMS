# TASK-B-373 — Issue #1362: DEF-151 UPS 요율 조회 원가 노출·가드 공백 + 대리점 부가요금 소유권 공백 (설계 의견)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1362](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1362) — DEF-151 (Aiden 발령, Jaison 배정: Dave) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison / **확정: Aiden** |
| **상태** | 📝 설계 의견 (`status:draft`) — **구현 금지, Aiden 확정 후** |
| **브랜치** | `feature/teamb-task-b373-iss1362-def151-ups-rates-cost` (base `origin/TeamB_Dev` a4a6d3101) |
| **공개 저장소 주의** | 노출 경위·재현 절차는 본문에 쓰지 않고 "도달 가능/불가 + 결과표 + 코드 위치"만 기재 |

## 0. 범위

| 구분 | 내용 |
|:--|:--|
| **A. DEF-151 (원 Issue)** | `src/app/actions/ups/rates.ts` 원가 포함 조회 6종 역할 가드 + 비관리자 화면의 `rates-public.ts` 전환 + `/agency/other-charges` 원가 payload 제거 |
| **B. 신규 (Aiden 2026-11-23)** | `src/app/actions/agency/other-charges.ts` 3개 액션의 대리점 소유권(IDOR) 가드 — #1469와 동일 패턴 |
| **C. Low (Issue §2.3)** | `getAgencyPricingPolicies` 가드, `getPublicWeightTierRates` 유효기간 필터 |
| **제외** | RLS 정책·테이블 GRANT 변경(§2-6 잔여 위험), 요율 계산 로직 변경 |

- A는 **설계 확정 후 구현**. B는 Aiden·Jaison이 **PR-1로 먼저 분리 승인** → **PR-1(B) → PR-2(A)**.
- 설계 의견 단계에서는 `src/` 변경 0.

---

## 1. 실측 (실DB, 2026-11-23)

### 1-1. 방법과 한계

- 로컬 Supabase + `TeamB_Dev` a4a6d3101. 각 역할의 **실제 user JWT 세션**으로 `supabase` 클라이언트를 만들고, `validateUserAction`만 해당 프로필로 stub해 **6개 서버 액션을 실제 실행**했다.
- 즉 "액션 코드가 실제 세션에서 어떤 컬럼을 반환하는가"를 측정했다. **실제 로그인(`signInWithPassword`)은 사용하지 않았다**(구현 단계 R-09에서 사용).
- 픽스처: SHIPPER·AGENCY(A/B)·ADMIN·MANAGER·SUB_ADMIN(MASTER + sub-org) + 요율 6테이블 1행씩. 기존 시드 데이터도 함께 조회됨(행 수는 환경 의존).
- 측정 후 `session_replication_role=replica`로 픽스처 삭제.

### 1-2. 6종 액션 원가 컬럼 반환 (측정)

| 액션 | 원가 컬럼 | SHIPPER | AGENCY | ADMIN | MANAGER | SUB_ADMIN |
|:--|:--|:--:|:--:|:--:|:--:|:--:|
| `getUpsBaseRates` | `cost_price` | **반환** | **반환** | 반환 | 반환 | 반환 |
| `getUpsFuelSurcharge` | `cost_rate` | **반환** | **반환** | 반환 | 반환 | 반환 |
| `getUpsOtherCharges` | `cost_price` | **반환** | **반환** | 반환 | 반환 | 반환 |
| `getUpsSurgeFees` | `cost_rate_per_kg` | **반환** | **반환** | 반환 | 반환 | 반환 |
| `getUpsWeightTierRates` | `price_per_kg_cost` | **반환** | **반환** | 반환 | 반환 | 반환 |
| `getUpsFreightMinimums` | `min_charge_cost` | **반환** | **반환** | 반환 | 반환 | 반환 |

- 6종 모두 `select('*')` + `validateUserAction()`만 사용한다(`src/app/actions/ups/rates.ts:41~129`).
- **모든 역할이 원가 컬럼을 받는다.** 액션 레벨 가드가 없다.
- 행 수(예: base 1,561 / surge 250)는 시드·픽스처에 의존하므로 보안 경계로 쓰지 않는다. **컬럼 노출 여부**가 핵심이다.

### 1-3. RLS 정책 (실DB 정의)

| 테이블 | SELECT 정책 | 원가 컬럼 |
|:--|:--|:--|
| `zen_ups_fuel_surcharges` | `authenticated_select: true` | 노출 |
| `zen_ups_other_charges` | `authenticated_select: is_active=true` | 노출 |
| `zen_ups_surge_fees` | `authenticated_select: is_active=true` | 노출 |
| `zen_ups_base_rates` | agency/shipper/sub_admin(`has_managed_sub_agency`) select | 노출 |
| `zen_ups_weight_tier_rates` | agency/shipper select | 노출 |
| `zen_ups_freight_minimums` | agency/shipper select | 노출 |

- **RLS는 행(row)만 제한하고 컬럼은 제한하지 않는다.** 그래서 액션 `select('*')`가 원가를 그대로 반환한다.
- DB 권한 수준의 잔여 위험은 이 Task에서 다루지 않는다(§2-6, 별도 p2 Task·상세 비공개).

### 1-4. 대리점 부가요금 소유권 공백 (측정)

`src/app/actions/agency/other-charges.ts` 3개 액션은 `checkPermission('/agency')`만 확인하고 `createAdminClient()`(service_role)로 쿼리한다 → **RLS 우회**.

| 호출(AGENCY A 세션) | 현재 결과(허용/거부만) |
|:--|:--|
| `getAgencyOtherCharges(B)` | **허용**(거부되어야 함) |
| `upsertAgencyOtherCharge(B, …)` | **허용**(거부되어야 함) |
| `deactivateAgencyOtherCharge(B_row)` | **허용**(거부되어야 함) |

- `zen_agency_other_charges`에는 `agency_own` RLS가 있으나 **admin client가 우회**하므로 액션 가드가 없으면 교차 테넌트 접근이 성립한다.
- #1469(`agency/shippers.ts`)는 같은 문제를 `ownAgencyError`로 닫았다. 이 파일만 미적용.
- 구체 값·호출 형태는 공개 문서에 적지 않는다(필요 시 비공개 전달).

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

- TASK-B-091 원칙: **대리점이 볼 수 있는 원가는 "대리점 계산 원가"뿐**이고 플랫폼 `cost_price`는 보이지 않는다. `/agency/ups-rates`·`/shipper/ups-rates`가 `rates-public.ts`로 전환된 이유다.
- **SUB_ADMIN은 AGENCY가 아니다**: SNTL Master Agency로 `/admin/ups-rates` 권한과 **기본요율 원가만 편집**하는 역할(TASK-192)이다. 따라서 "대리점 원가만" 원칙의 적용 대상이 아니며, 기본요율 원가 열람은 유지한다.
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
   - `/agency/other-charges/page.tsx`: `getUpsOtherCharges()` → `getPublicOtherCharges()` (Team A 파일, 이 이슈 예외 허용). 클라이언트는 `id·charge_code·charge_name·unit`만 사용하므로 public 인터페이스로 충분(코드 확인). 플랫폼 `cost_price`는 사용하지 않는다.
   - `admin/ups-rates/page.tsx`: SUB_ADMIN이면 기본요율은 `getUpsBaseRates`, 나머지 5종은 `rates-public.ts`로 전환(또는 탭 비노출). 또한 페이지의 **직접 fuel select**(L13~16)도 SUB_ADMIN에게 원가를 반환하므로 public 함수로 교체.
   - `UpsBaseRateMatrix`: admin은 기존 `getUpsBaseRates`, 비관리자는 `rates` prop(public)만 사용하도록 정리. client 번들에서 admin 액션 import를 제거하거나 `fetchRates` prop으로 주입.
   - **타입 정합**: `AgencyOtherChargesClient.allOtherCharges`를 `UpsOtherCharge[]`→`PublicOtherCharge[]`로, SUB_ADMIN용 `UpsRatesClient` prop도 public 타입으로 조정한다(필드 사용은 id·코드·명칭·단위뿐임을 코드로 확인).
4. **페이지 가드 보강**: `admin/ups-rates/page.tsx`는 현재 `requireAuth()`만 호출한다. 액션 가드와 동일하게 `checkPermission(profile.role, '/admin/ups-rates')`(또는 역할 검사)를 추가해 비관리자 진입을 차단(미들웨어와 이중 방어).
5. **Low**
   - `getAgencyPricingPolicies`(호출처 0): `requireAdminManagerOrSubAdmin` 추가(방어). RLS(`admin_all`/`sub_admin_scoped`/`agency_select`)는 유지.
   - `getPublicWeightTierRates`: `valid_from <= refDate` + `valid_until is null or >= refDate` 필터 추가(기본요율과 동일).
6. **PR-2 추가 점검(Aiden 요청)**: `estimateUpsFreight` 응답에서 **비관리자에게 전달되는 필드 범위**를 점검하는 항목을 PR-2 설계에 포함할 수 있는지 검토한다. 상세 기준은 Aiden이 별도 전달하며, 이번 설계에서는 **점검 항목 등록**까지 한다.

### 2-3A. PR-2 견적 응답 필드 범위 점검 (Aiden 2026-11-23 23:34 기준)

> 공개 저장소 기준: **포함/미포함 결과표만** 기록하고 구체 필드명·응답 값·재현 호출 형태는 쓰지 않는다.

#### (1) 응답 실측 — 역할 × 응답 객체

클라이언트가 호출하는 견적 액션(`estimateUpsFreight`)을 SHIPPER·AGENCY·ADMIN 세션으로 실행한 결과, **세 역할 모두 동일한 전체 응답**을 받았다(내부 계산용 원가·내부율 포함).

| 역할 | 플랫폼 판매가 | 플랫폼 원가 | 중량·통화·부가항목(판매) | breakdown 원가·내부율 | 대리점 판매가 | 대리점 원가·내부율 | 화주 판매가·할인율 |
|:--|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| SHIPPER | 포함 | **포함** | 포함 | **포함** | 포함 | **포함** | 포함 |
| AGENCY | 포함 | **포함** | 포함 | **포함** | 포함 | **포함** | 포함 |
| ADMIN | 포함 | 포함 | 포함 | 포함 | 포함 | 포함 | 포함 |

- 화면이 실제 사용하는 값은 **판매가·중량·통화·부가항목·화주 할인율** 계열이다(코드 확인).
- 원가·내부율은 화면에서 사용하지 않는다.

#### (2) 처리 방향 비교 — 서버 내부 호출 불변

| 안 | 내용 | 장점 | 단점 |
|:--|:--|:--|:--|
| **(a) 클라이언트 진입점 래퍼 (권장)** | `getUpsFreightEstimateForClient` 신규 액션이 내부 `estimateUpsFreight`를 호출하고 역할별 DTO로 정제 | 내부 호출(스냅샷·정산·입고 재계산) **무변경**, payload 최소화 | 클라이언트 import 변경·DTO 타입 |
| (b) `estimateUpsFreight`에 audience 인자 | 한 액션에서 분기 | 파일 수 적음 | 내부 호출자가 인자를 빠뜨리면 그대로 노출 |
| (c) 클라이언트에서 정제 | 화면에서 제거 | 서버 무변경 | **payload가 이미 전달된 뒤** — 보안 효과 없음 |
| (d) 타입만 제한 | TS 타입 | 변경 최소 | 런타임 보호 없음 |

- **권장: (a)**. 서버 내부 호출은 전체 계산 결과가 필요하므로 **변경하지 않는다**.
- 비관리자 DTO는 판매가·중량·통화·부가항목(판매)·화주 할인율 등 **화면 필요 필드**로 한정하고, 원가·내부율·대리점 원가 필드는 제외한다.
- **JSJung 확인**: 관리자 응답 범위(원가 포함)와 **대리점에게 전달되는 대리점 단계 금액의 범위**.

#### (3) 회귀 확인 (R-10)

- 오더 등록 폼의 **표시 금액**과 `estimated_cost`가 변경 전후 동일해야 한다.
- 화주 등록 경로·대리점 등록 경로 각각 R-10 스크린샷으로 확인한다(구현 PR-2).
- 현재 `estimated_cost` 기준값: `shipper.finalFreight` 우선, 없으면 `platform.totalSellingPrice`(코드 확인).

#### (4) `estimated_cost` 서버 사용 방식

- `zen_orders.estimated_cost`에 저장되고 수정 화면 기본값·이력 비교에 쓰이는 **참고 표시용 파생값**이다.
- 청구·정산 계산에는 사용되지 않는다(코드 검색 결과).

#### (5) 범위 확장 점검 — 견적·요율 반환 액션

| 액션 | 원가/내부 포함 | 비고 |
|:--|:--|:--|
| `estimateUpsFreight` | **포함(현재)** | PR-2 래퍼로 비관리자 제한 |
| `previewUpsActualCost` | 포함(의도) | admin 가드 |
| `getUpsActualCost` | 포함(의도/RLS) | B-377/#1451 범위 |
| `getUpsBaseRates` 외 5종 | 포함(현재) | PR-2 가드 C안 |
| `getPublicBaseRates` 외 5종 | 미포함 | 판매가 전용 |
| `calculateSettlementAction` | 원가 아님(청구 원장) | AGENCY/ADMIN |
| `getOrderRevenueCost` | 일부 포함 가능 | B-377/#1451 범위 |

#### (6) PR-2 포함/분리

- 래퍼 + DTO + 클라이언트 전환 + 회귀 테스트는 **PR-2에 포함 권장**(변경 범위가 작음).
- 대리점 단계 금액·관리자 응답 범위는 JSJung 결정 후 확정한다. 결정 전에는 **판매가 계열만 전달**하는 보수적 DTO로 설계한다.

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
5. `/agency/other-charges`·`/agency/ups-rates` 응답 payload에 `cost_price`/`cost_rate` 등 미포함(실제 세션·RSC payload).
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

- `docs/02_Analysis/ds11/Ds_11_11A_UPS_Rates.md` §11.15~11.17의 "역할 가드 없음 — DEF-151 참조"를 수정 후 상태(6종 가드·public 전환)로 갱신.
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
| 7 | PR-2: Aiden 점검 기준 5개 반영 완료. 포함/분리는 실측 후 제안(래퍼+DTO는 PR-2 포함 권장) |

### JSJung 확정 (2026-11-23, Jaison 회신)

| # | 항목 | 확정 |
|:-:|:--|:--|
| ① | 요율 조회 6종 가드 | **C안 확정** — `getUpsBaseRates`만 SUB_ADMIN, 나머지 5종은 ADMIN·MANAGER·ZENITH_SUPER_ADMIN. 공유 가드 추출 포함 |
| ② | 액션·화면 외 경로 잔여 위험 | **p2 별도 Task 수용**, PR-1·PR-2 범위 제외. **DEF-151 완전 종결은 그 Task 일정에 종속** |
| ③ | 견적 응답 범위(관리자·대리점 단계 금액) | **실측 결과 후 JSJung 결정** — §2-3A의 두 안 비교 참조 |

## 4. [작업 결과]

- 설계 의견 + 실측(6종×5역할, 소유권 허용/거부, RLS 정의, 호출처 전수). 공개 문서에는 허용/거부 결과만 기재.
- Aiden·Jaison 조건부 승인(2026-11-23). **PR-1(소유권) 착수 승인**, PR-2는 설계 확정 후.
- **PR-1 구현 제출**: PR #1478 (base `TeamB_Dev`, CI 7/7). Jaison 재확인 대기.
- PR: #1476 (draft, `Refs #1362`).
