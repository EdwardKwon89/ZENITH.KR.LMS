# DEF-147 | admin 화면 11건의 역할 게이트가 미들웨어 단독 — 페이지 레벨 인가 공백

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-1151(Issue #1314, DEF-146) 운영 의존성 취약점 영향 분석 중. `next` 미들웨어 우회 권고(GHSA-492v-c6pp-mqqv 외 2건)가 **실제로 도달 가능한지** 판정하려고 "미들웨어를 우회했을 때 남는 2차 방어선"을 추적하다 발견 |
| **긴급도** | **Medium** — 직접 데이터 유출은 확인되지 않음(액션 레벨 가드·RLS가 2차 방어). 다만 인가 구조가 **미들웨어 단일 의존**이라 미들웨어 우회 취약점과 결합 시 화면 노출이 성립 |
| **발견일** | 2026-11-15 |
| **발견자** | D_Kai (Team A) |
| **관련** | Issue #1314 · TASK-1151 · DEF-146 · R-18 |
| **조치 상태** | 미조치 — 분석 Task 범위 밖(§5 참조). 별도 Task 필요 |

## 1. 현상 (확인된 사실)

### 1.1 페이지 레벨 역할 게이트 부재

`src/app/[locale]/(dashboard)/admin/` 하위 `page.tsx` **22건** 중, 서버측 역할 검사(`checkPermission`/`requireAdmin`/`USER_ROLES` 비교)를 포함한 파일은 **11건**이고 **나머지 11건은 0건**이다.

| # | 페이지 | 형태 | 비고 |
|:--|:--|:--|:--|
| 1 | `admin/members/page.tsx` | `'use client'` | 데이터는 `listMembers`(`validateAdminAction`)로 조회 |
| 2 | `admin/error-logs/page.tsx` | 클라이언트 | `@/app/actions/monitoring` 사용 |
| 3 | `admin/customs/page.tsx` | 클라이언트 | `@/app/actions/customs` 사용 |
| 4 | `admin/claims/page.tsx` | 클라이언트 | `@/app/actions/claims` 사용 |
| 5 | `admin/ups-rates/page.tsx` | **서버 컴포넌트** | `requireAuth()`만 호출 — **역할 검사 없음**, 아래 §1.3 |
| 6 | `admin/ups-actual-charges/page.tsx` | — | — |
| 7 | `admin/settings/transport-policies/page.tsx` | — | — |
| 8 | `admin/customs-rates/page.tsx` | — | — |
| 9 | `admin/delivery-rates/page.tsx` | — | — |
| 10 | `admin/rate-cards/page.tsx` | — | — |
| 11 | `admin/sub-agency-profit/page.tsx` | — | — |

`admin` 그룹에는 **`layout.tsx`가 없다**(확인: 파일 부재). 따라서 `(dashboard)/layout.tsx`가 유일한 상위 레이아웃이며, 이 파일은 `supabase.auth.getUser()`로 **세션만 재검증**하고 역할은 보지 않는다(`src/app/[locale]/(dashboard)/layout.tsx:14-22`).

→ **역할 판정은 `src/middleware.ts` → `authGuard()`(`src/lib/auth/proxy.ts:39-140`)에서만 수행된다.**

### 1.2 액션 레벨은 대부분 방어되어 있다 (중요한 반대 근거)

`src/app/actions/admin/*.ts` 15개 모듈의 가드 실태를 전수 집계했다. `checkPermission()` 사용은 0건이지만, **인라인 역할 검사(`USER_ROLES` 직접 비교)가 광범위하게 존재**한다.

| 모듈 | `validateAdminAction` | `validateUserAction` | `USER_ROLES` 비교 | 판정 |
|:--|:--:|:--:|:--:|:--|
| `exchange-rates.ts` | 4 | 0 | 0 | ✅ 역할 가드 |
| `master-data.ts` | 6 | 4 | 0 | ✅ 역할 가드 |
| `master.ts` | 8 | 7 | 0 | ✅ 역할 가드 |
| `member.ts` | 6 | 7 | 1 | ✅ 역할 가드 |
| `organization.ts` | 9 | 0 | 0 | ✅ 역할 가드 |
| `customs-rates.ts` | 0 | 5 | 7 | ✅ 인라인(`canWriteCustomsRates`) |
| `delivery-rates.ts` | 0 | 5 | 7 | ✅ 인라인 |
| `rates.ts` | 0 | 5 | 8 | ✅ 인라인 |
| `surcharges.ts` | 0 | 5 | 3 | ✅ 인라인 |
| `transport-policies.ts` | 0 | 3 | 1 | ✅ 인라인 |
| `rate-cards.ts` | 0 | 5 | 4 | ⚠️ 인라인 있음 + 모듈 `@deprecated` |
| `corporate.ts` | 0 | 7 | 4 | ⚠️ `USER_ROLES` 4회는 **역할 목록 정의**로 보임(개별 함수 역할 검사 확인 필요) |
| `auth.ts` | 0 | 3 | **0** | ⚠️ **역할 검사 0** — 본인 계정 작업(비밀번호 변경 등)으로 추정 |
| `index.ts` / `rbac.ts` | 0 | 0 | 0 | 핸들러 없음(배럴·권한표) |

즉 **"admin 액션이 전부 무방비"는 아니다.** 다만 `checkPermission()`(RBAC 권한표 기반)을 쓰는 곳이 0건이라, 역할 판정 로직이 **모듈마다 인라인으로 중복 구현**되어 있다 — 이는 IMP-001(RBAC DB 기반 전환)과 같은 방향의 구조 부채다.

### 1.3 가장 구체적인 지점: `admin/ups-rates`

`src/app/[locale]/(dashboard)/admin/ups-rates/page.tsx:7`은 `requireAuth()`(세션만) 만 호출하고, 이어서 다음을 **직접 조회해 클라이언트 컴포넌트에 전달**한다.

- `zen_ups_fuel_surcharges` (line 13-16)
- `zen_agency_pricing_policies` + 대리점명·존 (line 22-24) — **대리점 할인율 정책**
- `zen_organizations` type=AGENCY (line 26-31)
- `getUpsWeightTierRates`/`getUpsFreightMinimums`/`getUpsSurgeFees` 등 → `src/app/actions/ups/rates.ts`는 **`validateUserAction()`만** 사용(역할 검사 없음, 전 함수 동일)

→ **로그인한 화주(SHIPPER) 계정이 `/ko/admin/ups-rates`를 직접 열면** 미들웨어만 통과하면 이 화면이 렌더되고, 데이터는 RLS가 막지 않는 한 그대로 노출된다. 미들웨어가 정상 동작하는 평시에는 302로 차단되므로 **문제가 드러나지 않는다.**

## 2. 영향 범위

| 구분 | 내용 |
|:--|:--|
| **성립 조건** | ① 미들웨어 역할 게이트를 우회해야 함 ② 해당 테이블 RLS가 `authenticated` 읽기를 허용해야 함 |
| **① 우회 경로** | **실재한다** — `next` 16.2.4가 영향 범위인 미들웨어 우회 권고 3건(`GHSA-492v-c6pp-mqqv` CVSS 8.1, `GHSA-267c-6grr-h53f`, `GHSA-26hh-7cqf-hhc6`). TASK-1151 보고서 §3.1에서 **도달 가능(🔴)** 으로 판정 |
| **② RLS** | **미확인** — `supabase/migrations/`의 해당 테이블 정책을 전수 확인하지 않았다(분석 범위 밖) |
| **확인된 피해** | 없음 (실증 PoC 미수행) |
| **잠재 피해** | 관리자 화면 셸·메뉴·일부 목록/정책 데이터의 비관리자 노출. **쓰기(권한 상승)는 미확인** — 쓰기 액션은 §1.2대로 대부분 역할 가드가 있다 |

## 3. 왜 Medium인가

- **High가 아닌 이유**: 데이터 접근의 최종 관문인 서버 액션에 역할 가드가 대부분 존재하고, 페이지 11건 중 4건은 데이터 조회 자체가 `validateAdminAction()` 경유다. "미들웨어만 뚫리면 전부 유출"은 과장이다.
- **Low가 아닌 이유**: `admin/ups-rates`는 **서버 컴포넌트가 직접 테이블을 읽어** props로 내려보낸다. 액션 가드로 커버되지 않는 유일한 형태이며, 대상이 **대리점 할인율 정책**이다. 그리고 우회 수단(미들웨어 우회 권고 3건)이 현재 버전에서 실제로 도달 가능하다.

## 4. 권장 조치 (별도 Task)

1. **`admin/layout.tsx` 신설 + 서버측 역할 게이트** — `requireAdmin()`(또는 `checkPermission(profile.role, '/admin')`)로 통일. 22개 페이지를 개별 수정하는 대신 **한 곳에서 강제**하는 것이 회귀 위험이 가장 낮다.
2. **`admin/ups-rates/page.tsx`** — `requireAuth()` → `requireAdmin()`(또는 `validateAdminAction()`)로 교체. 페이지에서 직접 테이블을 읽는 패턴 자체를 액션 경유로 정리.
3. **`src/app/actions/ups/rates.ts`** — 조회 함수에 역할 정책 부여. 화주 화면(`shipper/ups-rates`)이 같은 액션을 쓰므로 **단순 ADMIN 제한은 불가** → "화주는 본인 조직 요율만" 같은 범위 제한 필요(설계 확정 사항).
4. **RLS 확인** — `zen_agency_pricing_policies`·`zen_ups_fuel_surcharges`의 `authenticated` SELECT 정책 확인.
5. **재발 방지** — `check-audit`처럼 "admin 페이지 역할 게이트" 정적 점검 스크립트 검토(선택).

> ⚠️ 본 DEF는 **발견 사실의 기록**이며, 인가 전수 감사(authorization audit)가 아니다. §1.2의 `corporate.ts`·`auth.ts`는 grep 기반 분류로, 함수별 판정은 별도 감사가 필요하다(TASK-1151 §9-3 미확인 항목).

## 5. 왜 TASK-1151에서 고치지 않았는가

- Issue #1314의 범위는 **"취약점 도달 가능성 분석 + 단계별 업그레이드 계획"** 이며, 구현은 Edward 승인 후 별도 Task다.
- 인가 구조 변경은 `src/` 동작 변경이고, 병행 진행 중인 TASK-1152(B_Kai PoC)와 파일 충돌 위험이 있다.
- 분석 Task가 코드를 바꾸면 "P0 업그레이드가 코드 변경 없이 가능하다"는 전제(§6.1)가 깨진다.
