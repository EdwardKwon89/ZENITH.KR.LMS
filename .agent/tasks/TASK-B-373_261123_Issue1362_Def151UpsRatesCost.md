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

- A는 **설계 확정 후 구현**. B는 Aiden이 "설계와 무관하게 먼저 PR로 분리 가능"이라고 명시 → **PR-1(B) → PR-2(A)** 분리 권장.
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
- 추가 발견: `anon`·`authenticated`에 6개 테이블 **INSERT/UPDATE/DELETE/TRUNCATE GRANT**가 부여되어 있다(RLS 정책이 없어 실제 쓰기는 차단되지만, GRANT 과다). 컬럼 GRANT도 `authenticated`에 원가 컬럼 포함. → §2-6 잔여 위험.

### 1-4. 대리점 부가요금 소유권 공백 (측정)

`src/app/actions/agency/other-charges.ts` 3개 액션은 `checkPermission('/agency')`만 확인하고 `createAdminClient()`(service_role)로 쿼리한다 → **RLS 우회**.

| 호출(AGENCY A 세션) | 결과 |
|:--|:--|
| `getAgencyOtherCharges(B)` | **B 대리점 행 조회 성공**(selling 20 / cost 18) |
| `upsertAgencyOtherCharge(B, {...})` | **B 행 변경 성공**(99 / 88) |
| `deactivateAgencyOtherCharge(B_row)` | **B 행 비활성화 성공**(`is_active=false`) |

- `zen_agency_other_charges`에는 `agency_own` RLS가 있으나 **admin client가 우회**하므로 액션 가드가 없으면 교차 테넌트 IDOR가 성립한다.
- #1469(`agency/shippers.ts`)는 같은 문제를 `ownAgencyError`로 닫았다. 이 파일만 미적용.

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
4. **페이지 가드 보강**: `admin/ups-rates/page.tsx`는 현재 `requireAuth()`만 호출한다. 액션 가드와 동일하게 `checkPermission(profile.role, '/admin/ups-rates')`(또는 역할 검사)를 추가해 비관리자 진입을 차단(미들웨어와 이중 방어).
5. **Low**
   - `getAgencyPricingPolicies`(호출처 0): `requireAdminManagerOrSubAdmin` 추가(방어). RLS(`admin_all`/`sub_admin_scoped`/`agency_select`)는 유지.
   - `getPublicWeightTierRates`: `valid_from <= refDate` + `valid_until is null or >= refDate` 필터 추가(기본요율과 동일).

### 2-4. 구현 설계 (B: 대리점 소유권 가드, PR-1 권장)

`src/app/actions/agency/other-charges.ts` 3개 액션:

| 액션 | 가드 |
|:--|:--|
| `getAgencyOtherCharges(agencyOrgId)` | `ownAgencyError(profile, agencyOrgId, ...)` → 불일치 시 `own_agency_only` |
| `upsertAgencyOtherCharge(agencyOrgId, data)` | 동일 + upsert 후 대상 행의 `agency_org_id`가 호출자 소속인지 재확인 |
| `deactivateAgencyOtherCharge(id)` | **선조회**로 `agency_org_id` 확인 + `update ... eq('agency_org_id', profile.org_id)`로 이중 방어 |

- `ZENITH_SUPER_ADMIN` 예외는 #1469와 동일(전역 바이패스 정합).
- 공유 헬퍼: `src/lib/auth/agency-ownership.ts`로 `ownAgencyError` 추출 후 `shippers.ts`도 교체(중복 방지). #1469 파일을 건드리므로 PR-1에서 함께 테스트.
- 거부 시 `logger.warn` + `own_agency_only`(4로케일 기존 키).
- `createAdminClient`는 가드 통과 후 유지(현행). RLS 우회는 가드로 보완.
- **PR-1 분리 이유**: Aiden 지시·운영 p1·DEF-151 설계와 독립. PR-1은 코드+테스트, PR-2는 A 확정 후.

### 2-5. 테스트 계획 (R-09)

**A. 6종 액션 (구현 단계)**
1. 실제 로그인 세션(`signInWithPassword`)으로 SHIPPER·AGENCY → 6종 호출 시 **거부**(`permission_denied`), 원가 payload 0.
2. ADMIN·MANAGER → 6종 허용 + 원가 컬럼 포함(양성 대조).
3. SUB_ADMIN → `getUpsBaseRates` 허용(원가 포함), 나머지 5종 거부(C안).
4. **되돌리기**: 가드를 제거하면 SHIPPER/AGENCY가 원가를 받아 **FAIL**하는지 조건별 표로 실측 후 원복.
5. `/agency/other-charges`·`/agency/ups-rates` 응답 payload에 `cost_price`/`cost_rate` 등 미포함(실제 세션·RSC payload).
6. `admin/ups-rates` 관리자 화면 무회귀, `/admin/error-logs` 신규 ERROR 0.

**B. 소유권 (PR-1)**
7. AGENCY A → B 조회/upsert/deactivate **거부** + DB 불변.
8. A 자기 소속 성공, ZENITH_SUPER_ADMIN 성공.
9. 가드 제거 시 IDOR 성공(FAIL) 확인 후 원복.
10. 실DB 세션·실제 로그인 기준.

**C. Low**
11. `getAgencyPricingPolicies` 비관리자 거부.
12. `getPublicWeightTierRates` 만료 행 미반환.

- 구현 단계: `npm run test:regression`, `npm run build`, Ds-11 `check:ds11`.

### 2-6. 잔여 위험 — 직접 PostgREST 노출 (별도 판단)

- 액션 가드 + public 화면 전환은 **서버 액션/RSC 경로**를 닫는다.
- 그러나 `authenticated`에 테이블 SELECT GRANT가 있고 RLS는 행만 제한하므로, **대리점·화주가 자신의 JWT로 PostgREST에 직접 `select=cost_price`를 호출하면 원가 컬럼을 받을 수 있다**(실DB GRANT 확인). `anon`에는 DML GRANT까지 있다(RLS로 차단되지만 과다).
- 완전 차단은 (a) 원가 컬럼 REVOKE + 안전 뷰/`SECURITY DEFINER` 함수 경유, (b) 공개용 안전 뷰(`zen_ups_*_safe`) + base 테이블 SELECT 회수 중 하나가 필요하며, **요율 마스터 전반의 GRANT/정책 변경**이라 이 이슈 범위를 넘는다.
- **이번 PR은 액션·화면 경로를 닫고**, 직접 PostgREST 잔여 위험은 별도 DEF/Task로 보고·분리할 것을 제안한다. R-09의 "대리점·화주 세션이 원가 컬럼을 받지 못한다"는 **액션/화면 경로 기준**으로 검증하고, 직접 REST는 별도 항목으로 명시한다.
- Aiden이 직접 REST까지 요구하면 범위를 (a)/(b)로 확장해야 하므로 **설계 확정 시 확인 필요**.

### 2-7. Ds-11·R-12

- `docs/02_Analysis/ds11/Ds_11_11A_UPS_Rates.md` §11.15~11.17의 "역할 가드 없음 — DEF-151 참조"를 수정 후 상태(6종 가드·public 전환)로 갱신.
- `rates.ts` 시그니처는 변경 없음(내부 가드만) → 시그니처 변경 없음 근거를 PR에 기재.
- `agency/other-charges.ts` 3종 가드·오류(`own_agency_only`)도 같은 문서/인덱스에 반영.
- `npm run check:ds11` 통과.

### 2-8. 마이그레이션·배포

- **DB 마이그레이션 없음**(액션 가드·화면·Low). 직접 PostgREST 잔여 위험은 별도 Task.
- PR 순서: **PR-1(소유권)** → Aiden 확인 → **PR-2(DEF-151)**. 각 PR은 `Refs #1362`, Close는 Jaison 수동.
- PR-2는 `agency/other-charges/page.tsx`(Team A 1파일) 외 Team A 파일을 건드리지 않는다(`git diff --stat` 확인).

---

## 3. 확인 요청 (Aiden)

1. **가드 정책 C안**(기본요율만 SUB_ADMIN, 나머지 5종 admin/manager) 승인 여부. B안(SUB_ADMIN 6종)을 원하면 페이지 변경을 줄일 수 있다.
2. **PR 분리**: PR-1(소유권, 즉시) → PR-2(DEF-151) 순서 승인.
3. **직접 PostgREST 잔여 위험**: 이번 범위는 액션/화면만 닫고, 컬럼 GRANT/안전 뷰는 별도 Task로 분리하는 안 승인 여부.
4. Low 2건을 PR-2에 포함할지 후속으로 미룰지.

## 4. [작업 결과]

- 설계 의견 + 실측(6종×5역할, 소유권 IDOR 실측, RLS/GRANT 정의, 호출처 전수).
- **구현·마이그레이션 없음** (Aiden 확정 전).
- PR: #1476 (draft, `Refs #1362`).
