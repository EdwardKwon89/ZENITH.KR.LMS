# [TASK-1156] DEF-147 admin 접근통제 점검 — 비관리자에게 열린 8개 경로

| 항목 | 내용 |
|:-----|:------|
| **문서 ID** | TASK-1156 (Review) |
| **관련 Issue** | [#1338](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1338) |
| **근거 결함** | `DEF-147_admin페이지_역할게이트_미들웨어단독.md` |
| **수행(Worker)** | B_Kai (Team A) |
| **검증(Auditor)** | Aiden (R-01) |
| **작성일** | 2026-11-17 (실측 2026-11-17~18) |
| **성격** | **점검·보고 전용 — 소스 수정 0건** (수정은 Aiden이 별도 Task 발령, R-18) |
| **기준 커밋** | `origin/develop` `d4629151` (브랜치 `feature/teama-task-1156-def147-admin-access-audit`) |
| **점검 계정** | `shipper@` (CORPORATE/화주) · `agency@` (AGENCY/대리점) · `manager@`·`operator@` (MANAGER·OPERATOR/플랫폼 직원) · `admin@` (ADMIN/관리자) |

---

## 0. 결론 요약 (먼저 읽을 것)

### 0.1 3줄 요약

1. **8개 경로 전부 미들웨어 화이트리스트(`proxy.ts:190-213`)에 의해 "비플랫폼 조직이면 역할과 무관하게" 통과된다.** 그런데 페이지 레벨 서버 역할 게이트는 8개 중 4개(`transport-costs`·`exchange-rates`·`ups-actual-charges`·`daily-billing`)에만 있고, `rates`·`customs-rates`·`delivery-rates`·`ups-rates` 4개는 **세션 확인만** 한다. 이 4개는 **미들웨어가 뚫리면 곧바로 화면이 노출**되는 DEF-147의 구조적 공백이 그대로 남아 있다.
2. **화면 노출과 별개로, 데이터 계층(RLS)에서 실제 문제 1건이 확인됐다** — `zen_rate_cards`의 SELECT 정책이 `SHIPPER`/`CORPORATE`/`INDIVIDUAL`에게 **조직 스코프 없이 전 행**을 허용하고, 이 테이블에는 `carrier_cost`(원가)·`margin_rate`·`platform_fee_rate`(플랫폼 마진)가 같은 테이블에 있다. 화주 세션의 PostgREST 직접 조회로 **24건 전량 + 원가/마진 컬럼이 그대로 반환**되는 것을 실측했다(§5.1). 서버 액션은 `CARRIER`에게만 `platform_fee_rate`를 마스킹하므로(`admin/rates.ts:303-307`), **의도적으로 숨기려던 값이 RLS 경유로 노출**되는 상태다.
3. **쓰기(권한 상승)는 실증 결과 전부 차단됐다.** 비관리자 세션의 PostgREST INSERT는 `zen_rate_cards`·`zen_customs_rates`·`zen_ups_actual_charges` 모두 403(RLS 위반)이었고(§5.2), 각 쓰기 서버 액션도 역할 가드를 갖는다. 다만 **대리점(`AGENCY`)에게 열어 둔 UPS 실비 입력 경로는 코드 가드(`assertAdminOrAgency`)는 통과하지만 RLS가 막아 실제 저장이 실패**한다 — 코드와 RLS의 허용 범위가 어긋난 불일치 1건이다(§5.3).

### 0.2 판정 요약

| # | 경로 | 페이지 서버 역할 게이트 | 실측(비관리자) | 판정 |
|:-:|:--|:--|:--|:--|
| 1 | `/admin/rates` | ❌ 없음(클라이언트 컴포넌트) | 화면 셸 렌더, 요율 데이터는 액션이 거부 | ⚠️ **결함(데이터 계층)** — RLS 원가·마진 노출(§5.1) |
| 2 | `/admin/transport-costs` | ✅ `checkPermission` | 화주·대리점 → `/` 리다이렉트 / **운송사 → HTTP 500** | ⚠️ 정상(게이트) + 결함(운송사 500, §8.1-3) |
| 3 | `/admin/customs-rates` | ❌ `requireAuth`만 | 화주: 전체 통관요율 조회 / 대리점: RLS로 0건 | ⚠️ 관찰(요율 자체는 판매가) |
| 4 | `/admin/delivery-rates` | ❌ `requireAuth`만 | 화주: 전체 배송요율 조회 / 대리점: 0건 | ⚠️ 관찰 |
| 5 | `/admin/ups-rates` | ❌ `requireAuth`만 | 화주·대리점: UPS 원가 테이블 조회(Issue #528 설계) | ⚠️ 관찰(설계 근거 있음) |
| 6 | `/admin/exchange-rates` | ✅ `requireAdmin` | 화주·대리점 → `/` 리다이렉트 | ✅ 정상 |
| 7 | `/admin/ups-actual-charges` | ✅ 인라인 4역할 | 화주 → `/` 리다이렉트 / 대리점 → 진입(설계) | ⚠️ 관찰(대리점 쓰기 RLS 불일치) |
| 8 | `/finance/daily-billing` | ✅ 인라인 6역할 | `CORPORATE` 화주 → `/dashboard` 리다이렉트 | ⚠️ 미확인(역할 모델 확인 필요) |

> 표의 "실측"은 프로덕션 빌드 + Playwright 실로그인 결과(§3). 스크린샷은 `docs/08_Self_Audit/Reviews/assets/TASK-1156/`.

---

## 1. 점검 방법과 재현

### 1.1 환경

| 항목 | 값 |
|:--|:--|
| 코드 | `feature/teama-task-1156-def147-admin-access-audit` (base `d4629151`), 소스 수정 0건 |
| 런타임 | Node v24.14.0, `next` 16.4.6 (`npm ci`로 lock 일치), `npm run build` → `next start -p 3101` |
| DB | 로컬 Supabase(`127.0.0.1:54321`/`54322`), 마이그레이션 적용 상태 그대로 |
| 브라우저 | Playwright 1.59 (Chromium 1217), 뷰포트 1440×1100 |
| 계정 | `scripts/seed-local.ts` 재현 계정 (비밀번호 `password1234`) |

> **주의**: 개발 서버(`next dev`)에서는 이 워크트리 환경에서 React 하이드레이션이 완료되지 않아(폼 노드에 `__reactFiber$` 미부착, JS 오류 없음, HMR 웹소켓 실패) UI 로그인 자동화가 불가능했다. **프로덕션 빌드(`next start`)로 전환해 실측**했다. 이 현상 자체는 이번 Task 범위가 아니므로 기록만 남긴다(§9).

### 1.2 절차

1. 역할별 실제 로그인(`/ko/login`) → 세션 쿠키 발급 확인
2. 8개 경로를 `page.goto()`로 직접 이동 → 최종 URL·리다이렉트 여부·표 행 수·금액 토큰 수·쓰기 버튼 목록·거부 문구 수집
3. DB 계층은 (a) 마이그레이션 원문 인용 + (b) `pg_policies` 실측 + (c) 역할 위장(`set local role authenticated` + `request.jwt.claims`) SQL로 교차 검증
4. 쓰기 차단은 (a) 서버 액션 가드 코드 + (b) 비관리자 세션 PostgREST INSERT 403 실측으로 확인

### 1.3 재현 스크립트

Aiden 회신(2026-11-17)에 따라 **커밋되는 부록 A**에 SQL·스크립트 요지를 수록했다. `scratch/` 원본은 R-13에 따라 커밋하지 않으며, #1346 파트2는 부록 A를 재사용한다(§8.4 참조).

---

## 2. 구조 분석 — 왜 열리는가

### 2.1 미들웨어: 조직 유형만 보고, 역할은 보지 않는다

`src/lib/auth/proxy.ts:190-213`:

```ts
if (orgType !== 'PLATFORM') {
  const isAllowedPath =
    purePath === '/' || purePath.startsWith(allowedRoot) || isAuthPage ||
    purePath.startsWith('/orders') || ... ||
    purePath.startsWith('/admin/rates') ||          // :201
    purePath.startsWith('/admin/transport-costs') || // :202
    purePath.startsWith('/admin/customs-rates') ||   // :203
    purePath.startsWith('/admin/delivery-rates') ||  // :204
    purePath.startsWith('/admin/ups-rates') ||       // :205
    purePath.startsWith('/admin/exchange-rates') ||  // :206
    purePath.startsWith('/admin/ups-actual-charges') || // :207
    purePath.startsWith('/finance/daily-billing') || // :208
    ...
```

- 조건은 **`orgType !== 'PLATFORM'`** 하나다. 즉 `SHIPPER`·`AGENCY`·`CARRIER`·`CUSTOMS_BROKER`·`DELIVERY_AGENT` 조직 소속이면 **역할(`role`)과 무관하게 8경로 전부 통과**한다.
- 8경로를 **경로별로 허용 역할을 구분하지 않는다.** 예를 들어 대리점도 `/admin/customs-rates`를, 화주도 `/admin/ups-rates`를 URL로 열 수 있다.

### 2.2 레이아웃: admin 공통 게이트가 없다

- `src/app/[locale]/(dashboard)/admin/layout.tsx` — **파일 없음**(DEF-147 §1.1과 동일).
- 유일한 상위 레이아웃 `(dashboard)/layout.tsx:14-22`는 `supabase.auth.getUser()`로 **세션만** 확인하고 역할은 판정하지 않는다. `getPermissionsByRole`(`:32`)은 사이드바 메뉴 렌더링용이며 접근 차단에 쓰이지 않는다.

### 2.3 가드 3종의 실제 의미 (혼동 주의)

| 가드 | 위치 | 실제 검사 |
|:--|:--|:--|
| `requireAuth()` | `guards.ts:12` | **세션만**. 역할 없음 |
| `requireAdmin()` | `guards.ts:33` | 세션 + (`ZENITH_SUPER_ADMIN` 또는 `ADMIN`+PLATFORM) **또는** `checkPermission(role, '/admin')` → 불허 시 `redirect('/')` |
| `validateAdminAction()` | `guards.ts:75` | 위와 동일 판정 → 불허 시 `throw new Error("Unauthorized access")` |
| `validateUserAction()` | `guards.ts:121` | **세션만**. 이름과 달리 **권한 검증이 아니다** |

`validateUserAction`이라는 이름 때문에 "역할 검증을 한다"고 오독하기 쉽다. 실제로는 인증 전용이며, 역할 판정은 각 액션이 인라인으로 따로 한다.

### 2.4 권한표가 두 개로 갈라져 있다 (구조 부채)

| 계층 | 데이터 | 8경로 중 부여된 것 |
|:--|:--|:--|
| 미들웨어 화이트리스트 | 하드코딩 배열 | **8개 전부, 조직 유형만 조건** |
| 앱 정적 권한표 `STATIC_PERMISSIONS` (`rbac.ts:45-58`) | 코드 상수 | 8개 중 `CARRIER`(rates·transport-costs), `CUSTOMS_BROKER`(customs-rates), `DELIVERY_AGENT`(delivery-rates), `SUB_ADMIN`/`MANAGER`(ups-rates)만 부여. **`SHIPPER`·`CORPORATE`·`AGENCY`는 8개 중 0개** — 이들에게 부여된 것은 비관리 경로 `/ups-rates`·`/shipper`·`/finance`뿐 |
| DB 권한표 `zen_role_permissions` (실측) | DB | `CARRIER`→rates·transport-costs / `CUSTOMS_BROKER`→customs-rates / `DELIVERY_AGENT`→delivery-rates / `AGENCY`·`MANAGER`→ups-actual-charges / `CORPORATE`·`MANAGER`→`/finance` |

→ **미들웨어만 8경로를 전 조직에 열고, 앱/DB 권한표는 역할별로 좁게 부여**한다. 화면 노출은 미들웨어가 결정하고, 메뉴 노출은 DB 권한표가 결정하므로 **"메뉴에는 없는데 URL로는 열리는" 상태**가 성립한다. 이것이 DEF-147의 본질이다.

---

## 3. 경로별 실측 결과 (역할 × 경로)

| 경로 | 화주(`CORPORATE`) | 화주(`AGENCY_SHIPPER`) | 대리점(`AGENCY`) | 마스터대리점(`SUB_ADMIN`) | 운송사(`CARRIER`) | 플랫폼직원(`MANAGER`) | 플랫폼직원(`OPERATOR`) | 관리자(`ADMIN`) |
|:--|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `/admin/rates` | 렌더(`200`) · 행 1 · 🔧 1 | 렌더(`200`) · 행 1 · 🔧 1 | 렌더(`200`) · 행 1 · 🔧 1 | 렌더(`200`) · 행 1 · 🔧 1 | 렌더(`200`) · 행 1 | 렌더(`200`) · 행 24 · 🔧 1 | 렌더(`200`) · 행 1 · 🔧 1 | 렌더(`200`) · 행 24 · 🔧 1 |
| `/admin/transport-costs` | ↪ `/ko` | ↪ `/ko` | ↪ `/ko` | ↪ `/ko` | ⛔ HTTP 500 | ↪ `/ko` | ↪ `/ko` | 렌더(`200`) · 행 1 · 🔧 1 |
| `/admin/customs-rates` | 렌더(`200`) · 행 5 | 렌더(`200`) · 행 1 | 렌더(`200`) · 행 1 | 렌더(`200`) · 행 1 | 렌더(`200`) · 행 5 | 렌더(`200`) · 행 5 · 🔧 1 | 렌더(`200`) · 행 1 | 렌더(`200`) · 행 5 · 🔧 1 |
| `/admin/delivery-rates` | 렌더(`200`) · 행 1 | 렌더(`200`) · 행 1 | 렌더(`200`) · 행 1 | 렌더(`200`) · 행 1 | 렌더(`200`) · 행 1 | 렌더(`200`) · 행 1 · 🔧 1 | 렌더(`200`) · 행 1 | 렌더(`200`) · 행 1 · 🔧 1 |
| `/admin/ups-rates` | 렌더(`200`) · 행 10 | 렌더(`200`) · 행 10 | 렌더(`200`) · 행 10 | 렌더(`200`) · 행 10 | 렌더(`200`) · 행 10 | 렌더(`200`) · 행 10 · 🔧 1 | 렌더(`200`) · 행 10 | 렌더(`200`) · 행 10 · 🔧 1 |
| `/admin/exchange-rates` | ↪ `/ko` | ↪ `/ko` | ↪ `/ko` | ↪ `/ko` | ↪ `/ko` | ↪ `/ko` | ↪ `/ko` | 렌더(`200`) · 🔧 1 |
| `/admin/ups-actual-charges` | ↪ `/ko` | ↪ `/ko` | 렌더(`200`) | ↪ `/ko` | ↪ `/ko` | 렌더(`200`) | ↪ `/ko` | 렌더(`200`) |
| `/finance/daily-billing` | ↪ `/dashboard` · 행 9 | 렌더(`200`) | 렌더(`200`) · 행 3 · 🔧 1 | ↪ `/ko` | ↪ `/dashboard` · 행 1 | 렌더(`200`) | ↪ `/dashboard` · 행 2 | 렌더(`200`) · 행 1 · 🔧 1 |

> **기호**: `렌더(200)` = 대상 경로 진입 성공 · `↪경로` = 다른 경로로 리다이렉트(차단) · `행 N` = 표 데이터 행 수 · `🔧 N` = 쓰기 관련 버튼 수 · `⛔ HTTP N` = 서버 오류 응답. `—` = 미측정(본 실측에서는 없음). **8경로 × 8역할 = 64셀 전부 실측.**
> 스크린샷 원본: `docs/08_Self_Audit/Reviews/assets/TASK-1156/`.

### 3.1 경로별 상세 (상태·최종 URL·데이터·쓰기 UI)

#### `/admin/rates`

| 역할 | 상태 | 최종 URL | 표 행 | 금액 토큰 | 쓰기 UI | 거부 문구 |
|:--|:-:|:--|:-:|:-:|:--|:-:|
| 화주(`CORPORATE`) | 200 | `/admin/rates` | 1 | 0 | 새 요율 등록 | — |
| 화주(`AGENCY_SHIPPER`) | 200 | `/admin/rates` | 1 | 0 | 새 요율 등록 | — |
| 대리점(`AGENCY`) | 200 | `/admin/rates` | 1 | 0 | 새 요율 등록 | — |
| 마스터대리점(`SUB_ADMIN`) | 200 | `/admin/rates` | 1 | 0 | 새 요율 등록 | — |
| 운송사(`CARRIER`) | 200 | `/admin/rates` | 1 | 0 | — | — |
| 플랫폼직원(`MANAGER`) | 200 | `/admin/rates` | 24 | 0 | 새 요율 등록 | — |
| 플랫폼직원(`OPERATOR`) | 200 | `/admin/rates` | 1 | 0 | 새 요율 등록 | — |
| 관리자(`ADMIN`) | 200 | `/admin/rates` | 24 | 0 | 새 요율 등록 | — |

#### `/admin/transport-costs`

| 역할 | 상태 | 최종 URL | 표 행 | 금액 토큰 | 쓰기 UI | 거부 문구 |
|:--|:-:|:--|:-:|:-:|:--|:-:|
| 화주(`CORPORATE`) | 200 | `/ko` | 0 | 0 | — | — |
| 화주(`AGENCY_SHIPPER`) | 200 | `/ko` | 0 | 0 | — | — |
| 대리점(`AGENCY`) | 200 | `/ko` | 0 | 0 | — | — |
| 마스터대리점(`SUB_ADMIN`) | 200 | `/ko` | 0 | 0 | — | — |
| 운송사(`CARRIER`) | 500 | `/admin/transport-costs` | 0 | 0 | — | — |
| 플랫폼직원(`MANAGER`) | 200 | `/ko` | 0 | 0 | — | — |
| 플랫폼직원(`OPERATOR`) | 200 | `/ko` | 0 | 0 | — | — |
| 관리자(`ADMIN`) | 200 | `/admin/transport-costs` | 1 | 0 | 새 원가 등록 | — |

#### `/admin/customs-rates`

| 역할 | 상태 | 최종 URL | 표 행 | 금액 토큰 | 쓰기 UI | 거부 문구 |
|:--|:-:|:--|:-:|:-:|:--|:-:|
| 화주(`CORPORATE`) | 200 | `/admin/customs-rates` | 5 | 4 | — | — |
| 화주(`AGENCY_SHIPPER`) | 200 | `/admin/customs-rates` | 1 | 0 | — | — |
| 대리점(`AGENCY`) | 200 | `/admin/customs-rates` | 1 | 0 | — | — |
| 마스터대리점(`SUB_ADMIN`) | 200 | `/admin/customs-rates` | 1 | 0 | — | — |
| 운송사(`CARRIER`) | 200 | `/admin/customs-rates` | 5 | 4 | — | — |
| 플랫폼직원(`MANAGER`) | 200 | `/admin/customs-rates` | 5 | 4 | 새 요율 등록 | — |
| 플랫폼직원(`OPERATOR`) | 200 | `/admin/customs-rates` | 1 | 0 | — | — |
| 관리자(`ADMIN`) | 200 | `/admin/customs-rates` | 5 | 4 | 새 요율 등록 | — |

#### `/admin/delivery-rates`

| 역할 | 상태 | 최종 URL | 표 행 | 금액 토큰 | 쓰기 UI | 거부 문구 |
|:--|:-:|:--|:-:|:-:|:--|:-:|
| 화주(`CORPORATE`) | 200 | `/admin/delivery-rates` | 1 | 0 | — | — |
| 화주(`AGENCY_SHIPPER`) | 200 | `/admin/delivery-rates` | 1 | 0 | — | — |
| 대리점(`AGENCY`) | 200 | `/admin/delivery-rates` | 1 | 0 | — | — |
| 마스터대리점(`SUB_ADMIN`) | 200 | `/admin/delivery-rates` | 1 | 0 | — | — |
| 운송사(`CARRIER`) | 200 | `/admin/delivery-rates` | 1 | 0 | — | — |
| 플랫폼직원(`MANAGER`) | 200 | `/admin/delivery-rates` | 1 | 0 | 새 요율 등록 | — |
| 플랫폼직원(`OPERATOR`) | 200 | `/admin/delivery-rates` | 1 | 0 | — | — |
| 관리자(`ADMIN`) | 200 | `/admin/delivery-rates` | 1 | 0 | 새 요율 등록 | — |

#### `/admin/ups-rates`

| 역할 | 상태 | 최종 URL | 표 행 | 금액 토큰 | 쓰기 UI | 거부 문구 |
|:--|:-:|:--|:-:|:-:|:--|:-:|
| 화주(`CORPORATE`) | 200 | `/admin/ups-rates` | 10 | 0 | — | — |
| 화주(`AGENCY_SHIPPER`) | 200 | `/admin/ups-rates` | 10 | 0 | — | — |
| 대리점(`AGENCY`) | 200 | `/admin/ups-rates` | 10 | 0 | — | — |
| 마스터대리점(`SUB_ADMIN`) | 200 | `/admin/ups-rates` | 10 | 0 | — | — |
| 운송사(`CARRIER`) | 200 | `/admin/ups-rates` | 10 | 0 | — | — |
| 플랫폼직원(`MANAGER`) | 200 | `/admin/ups-rates` | 10 | 0 | Zone 등록 | — |
| 플랫폼직원(`OPERATOR`) | 200 | `/admin/ups-rates` | 10 | 0 | — | — |
| 관리자(`ADMIN`) | 200 | `/admin/ups-rates` | 10 | 0 | Zone 등록 | — |

#### `/admin/exchange-rates`

| 역할 | 상태 | 최종 URL | 표 행 | 금액 토큰 | 쓰기 UI | 거부 문구 |
|:--|:-:|:--|:-:|:-:|:--|:-:|
| 화주(`CORPORATE`) | 200 | `/ko` | 0 | 0 | — | — |
| 화주(`AGENCY_SHIPPER`) | 200 | `/ko` | 0 | 0 | — | — |
| 대리점(`AGENCY`) | 200 | `/ko` | 0 | 0 | — | — |
| 마스터대리점(`SUB_ADMIN`) | 200 | `/ko` | 0 | 0 | — | — |
| 운송사(`CARRIER`) | 200 | `/ko` | 0 | 0 | — | — |
| 플랫폼직원(`MANAGER`) | 200 | `/ko` | 0 | 0 | — | — |
| 플랫폼직원(`OPERATOR`) | 200 | `/ko` | 0 | 0 | — | — |
| 관리자(`ADMIN`) | 200 | `/admin/exchange-rates` | 0 | 0 | 저장 | — |

#### `/admin/ups-actual-charges`

| 역할 | 상태 | 최종 URL | 표 행 | 금액 토큰 | 쓰기 UI | 거부 문구 |
|:--|:-:|:--|:-:|:-:|:--|:-:|
| 화주(`CORPORATE`) | 200 | `/ko` | 0 | 0 | — | — |
| 화주(`AGENCY_SHIPPER`) | 200 | `/ko` | 0 | 0 | — | — |
| 대리점(`AGENCY`) | 200 | `/admin/ups-actual-charges` | 0 | 0 | — | — |
| 마스터대리점(`SUB_ADMIN`) | 200 | `/ko` | 0 | 0 | — | — |
| 운송사(`CARRIER`) | 200 | `/ko` | 0 | 0 | — | — |
| 플랫폼직원(`MANAGER`) | 200 | `/admin/ups-actual-charges` | 0 | 0 | — | — |
| 플랫폼직원(`OPERATOR`) | 200 | `/ko` | 0 | 0 | — | — |
| 관리자(`ADMIN`) | 200 | `/admin/ups-actual-charges` | 0 | 0 | — | — |

#### `/finance/daily-billing`

| 역할 | 상태 | 최종 URL | 표 행 | 금액 토큰 | 쓰기 UI | 거부 문구 |
|:--|:-:|:--|:-:|:-:|:--|:-:|
| 화주(`CORPORATE`) | 200 | `/dashboard` | 9 | 0 | — | — |
| 화주(`AGENCY_SHIPPER`) | 200 | `/finance/daily-billing` | 0 | 3 | — | — |
| 대리점(`AGENCY`) | 200 | `/finance/daily-billing` | 3 | 24 | 일괄 마감 | — |
| 마스터대리점(`SUB_ADMIN`) | 200 | `/ko` | 0 | 0 | — | — |
| 운송사(`CARRIER`) | 200 | `/dashboard` | 1 | 0 | — | — |
| 플랫폼직원(`MANAGER`) | 200 | `/finance/daily-billing` | 0 | 3 | — | — |
| 플랫폼직원(`OPERATOR`) | 200 | `/dashboard` | 2 | 0 | — | — |
| 관리자(`ADMIN`) | 200 | `/finance/daily-billing` | 1 | 10 | 일괄 마감 | — |

---

## 4. RLS 정책 확인 — `ups-actual-charges` 포함

### 4.1 `zen_ups_actual_charges` (실비 청구 항목)

`supabase/migrations/20260720000000_iss589_ups_actual_charges.sql`:

- `:20` `ENABLE ROW LEVEL SECURITY`
- `:26-43` `admin_manager_all` — `FOR ALL`, `USING/WITH CHECK`: `zen_profiles.role IN ('ADMIN','MANAGER')`
- `:45-59` `shipper_agency_select` — `FOR SELECT`, `USING`: `zen_orders o` 조인으로 **`o.shipper_id = p.org_id OR o.agency_org_id = p.org_id`**

`pg_policies` 실측도 동일(정책 2건, 정의 일치).

**교차 조직 읽기 실증**(§5.4): A조직 오더 1건 + B조직 오더 1건에 실비 행을 만들고 역할을 위장해 조회한 결과 —

| 세션 | 조회 가능 행 | 해석 |
|:--|:-:|:--|
| 화주(`CORPORATE`, org A) | **1/2** | 자기 조직 오더만 — **교차 조직 읽기 불가** |
| 대리점(`AGENCY`) | **1/2** | 자기 대리점 오더만 |
| 관리자(`ADMIN`) | **2/2** | 전체 |

→ **정상.** 화주/대리점이 타 조직의 실비(원가)를 읽는 경로는 확인되지 않았다. `zen_ups_actual_cost`도 동일 구조·동일 결과였다(`20260809080000_ups_actual_cost.sql:27,31-48,50-71`).

**다만 정책 허용 역할이 두 테이블에서 다르다**:

| 테이블 | `admin_manager_all` 허용 역할 |
|:--|:--|
| `zen_ups_actual_charges` | `ADMIN`, `MANAGER` |
| `zen_ups_actual_cost` | `ADMIN`, `MANAGER`, **`ZENITH_SUPER_ADMIN`**, **`SUB_ADMIN`** |

→ `ZENITH_SUPER_ADMIN`이 `zen_ups_actual_charges`는 읽을 수 없다(§8.2 관찰).

### 4.2 8경로 관련 테이블 정책 요약

| 테이블 | RLS | SELECT 정책 스코프 | 비관리자 조회 |
|:--|:-:|:--|:--|
| `zen_rate_cards` | ✅ | `ADMIN/SUPER/MANAGER/SHIPPER/CORPORATE/INDIVIDUAL` — **조직 스코프 없음** (`20260529150000:30-40`) | 🔴 **화주: 전 행 + `carrier_cost`·`margin_rate`·`platform_fee_rate`** |
| `zen_customs_rates` | ✅ | `ADMIN/MANAGER` OR `org_id=내 조직` OR `CORPORATE/INDIVIDUAL/CARRIER`(전 행, `is_active`) | 화주: 5건 전량 / 대리점: 0건 |
| `zen_delivery_rates` | ✅ | 위와 동일 패턴 | 화주: 4건 전량 / 대리점: 0건 |
| `zen_transport_costs` | ✅ | `ADMIN/ZENITH_SUPER_ADMIN` ALL만 | 화주·대리점: 0건 |
| `zen_exchange_rates` | ✅ | `authenticated` 전체(`USING true`, `20260809070000:40`) | 전 역할 조회 가능(공개 환율) |
| `zen_ups_base_rates` | ✅ | 화주/대리점 select 정책 존재(`20260614000200:38,51`, Issue #528) | 화주·대리점: 1,560건(설계) |
| `zen_ups_fuel_surcharges` | ✅ | `authenticated` 전체(`USING true`) | 전 역할 |
| `zen_agency_pricing_policies` | ✅ | `AGENCY`는 **자기 `agency_org_id`만**, `SUB_ADMIN`은 관리 대리점만 | 화주: 0건 |
| `zen_invoices` | ✅ | 화주: 자기 `shipper_id` / 대리점: 청구·소속 화주 오더 | 화주 7건·대리점 15건(자기 범위) |
| `zen_organizations` | ✅ | `authenticated` 전체(`USING true`) | 전 역할(조직 목록) |

---

## 5. 실증 — 데이터 노출과 쓰기 차단

### 5.1 🔴 `zen_rate_cards`: 화주 세션이 원가·마진을 그대로 읽는다

화주 계정(`shipper@zenith.kr`, CORPORATE)의 실제 액세스 토큰으로 PostgREST를 직접 호출했다(브라우저에서 anon key + 본인 토큰만 있으면 동일 요청 가능).

```
GET /rest/v1/zen_rate_cards?select=id,carrier_cost,margin_rate,platform_fee_rate&limit=3
→ 200
[{"id":"adddc8a7-...","carrier_cost":5.80,"margin_rate":12.00,"platform_fee_rate":5.00},
 {"id":"7f038afe-...","carrier_cost":0.70,"margin_rate":15.00,"platform_fee_rate":5.00},
 {"id":"09b00792-...","carrier_cost":4.00,"margin_rate":15.00,"platform_fee_rate":5.00}]
```

- 전체 건수: **24건**(전량), `carrier_cost` 최소 0.45 ~, `platform_fee_rate` 5.00
- 원인: `zen_rate_cards_select`(`20260529150000_fix_route_rls_corporate_individual.sql:30-40`)가 `SHIPPER`/`CORPORATE`/`INDIVIDUAL`을 **조직·소유 조건 없이** 허용. 테이블에 원가·마진 컬럼이 함께 있다(`carrier_cost`, `margin_rate`, `platform_fee_rate`).
- 대조: 서버 액션 `getRateCards`는 `SHIPPER`/`CORPORATE`를 **거부**하고(`admin/rates.ts:253-255`), `CARRIER`에게는 `platform_fee_rate`를 **마스킹**한다(`:303-307`). 즉 "숨기려는 의도"는 코드에 명시돼 있으나 **RLS에는 반영되지 않았다.**
- 영향: 화주가 경쟁사 대리점/운송사의 원가와 플랫폼 마진을 알 수 있다. 화면(`/admin/rates`)은 액션이 데이터를 거부하므로 **화면으로는 보이지 않고, 데이터 계층으로만 노출**된다(그래서 DEF-147 §1.2의 "액션 레벨은 방어되어 있다"와 모순되지 않는다).

### 5.2 ✅ 쓰기는 전부 거부됐다 (비관리자 세션 PostgREST INSERT)

| 시도 | 결과 |
|:--|:--|
| 화주 → `zen_rate_cards` INSERT | **403** `new row violates row-level security policy` |
| 화주 → `zen_customs_rates` INSERT | **403** 동일 |
| 화주 → `zen_ups_actual_charges` INSERT | **403** 동일 |
| 대리점 → `zen_ups_actual_charges` INSERT | **403** 동일 |

→ 화면의 쓰기 버튼이 숨겨져 있는 것과 별개로, **데이터 계층에서도 2차 방어선이 동작**한다.

### 5.3 ⚠️ 대리점 쓰기 경로: 코드는 허용, RLS는 차단

- 코드: `recordUpsActualCharges`는 `assertAdminOrAgency`를 통과하면 저장을 시도한다. 이 헬퍼는 **`AGENCY`를 허용**한다(`finance/ups-actual-charges.ts:20-25`).
- 페이지: `/admin/ups-actual-charges`의 서버 게이트도 `AGENCY`를 허용한다(`ups-actual-charges/page.tsx:9-13`). 클라이언트에는 `isPlatformAdmin={true}`가 **하드코딩**되어 있어(`ups-actual-charges-client.tsx:126`) 대리점에게도 입력 UI가 보인다.
- RLS: `zen_ups_actual_charges`의 INSERT를 허용하는 정책은 `admin_manager_all`(`ADMIN`/`MANAGER`)뿐이다. `shipper_agency_select`는 SELECT 전용(`migration:45-59`).
- 실측: 대리점 세션 INSERT → **403 RLS 위반**(§5.2).

→ 대리점이 실비를 입력하면 **화면에서는 입력 폼이 보이지만 저장은 RLS에서 실패**한다. 의도가 ① "대리점 입력 허용"이라면 **RLS 정책 누락(결함)**, ② "관리자만 입력"이라면 **코드 가드·UI 노출이 과도(결함)** 어느 쪽이든 불일치다. 설계 의도 확인이 필요하다(§8.1).

### 5.4 RLS 교차 조직 실증 SQL (재사용용)

부록 A 참조. 요약: `set local role authenticated` + `request.jwt.claims`에 대상 사용자 `sub`·`app_metadata.role`·`org_id`를 넣어 세션을 위장하고 조회한다.

### 5.5 DEF-149 연계 — `agency/shippers.ts` 소유권 검증 실증

Aiden 지시(2026-11-17 12:08, #1338 코멘트)에 따라 Riley가 발견한 DEF-149 §1.1~§1.3을 본 점검 범위에 포함했다. **수정은 하지 않고 증거만 남긴다**(Team B 소유 파일은 #1349에서 수정 중).

#### 5.5.1 정적 분석 — 5개 함수 모두 호출자 인자를 신뢰

`src/app/actions/agency/shippers.ts`의 5개 함수는 전부 `validateUserAction()`(**세션만 확인**) + `checkPermission(role, '/agency')`(**역할만 확인**) 후, 호출자가 넘긴 `agencyOrgId`·`shipperId`를 그대로 사용한다. `profile.org_id`와의 비교가 어디에도 없다.

| 함수 | 위치 | 호출자 인자 사용 | 소유권 검증 |
|:--|:--|:--|:--|
| `getAgencyShippers` | `:118-157` | `.eq('agency_org_id', agencyOrgId)` | ❌ |
| `createAgencyShipper` | `:163-273` | `_linkShipperToAgency(agencyOrgId, …)` | ❌ |
| `updateAgencyShipperGrade` | `:275-308` | `.eq('id', id)` | ❌ |
| `getAgencyShipperById` | `:310-350` | `.eq('id', shipperId)` | ❌ |
| `updateAgencyShipper` | `:356-427` | `.eq('id', shipperId)` → `link.shipper_org_id` 갱신 | ❌ |

모두 `createAdminClient()`(service role)를 쓰므로 **DB RLS를 우회**한다. 즉 코드 계층의 교차 테넌트 IDOR이 실제 공격 경로이며, 아래 RLS 실증은 "사용자 세션 클라이언트였다면 차단됐을 것"을 보여주는 2차 방어선 확인용이다.

#### 5.5.2 실DB 거부 실증 (역할 위장 SQL, 부록 A.4)

| 시나리오 | 세션 | 결과 | 해석 |
|:--|:--|:--|:--|
| A 대리점(org `809a04e8…`)이 B 대리점(org `57d63ade…`) 화주 목록 조회 | `AGENCY` / org A | 자기 행 **3건**, 교차 행 **0건** | RLS가 차단 |
| A 대리점이 B 대리점 화주 `grade` UPDATE | `AGENCY` / org A | `UPDATE 0`, 값 미변경 | RLS가 차단 |
| B 대리점이 A 대리점 화주 목록 조회·UPDATE | `AGENCY` / org B | 자기 행 **1건**, 교차 행 **0건**, `UPDATE 0` | RLS가 차단 |
| 통관요율 `org_id`를 타 조직으로 UPDATE | `CUSTOMS_BROKER` / org `513030e1…` | **42501** `new row violates row-level security policy` | 차단 (§5.5.3) |
| 통관요율 타 조직 `org_id`로 INSERT | 동일 | **42501** 동일 | 차단 |
| 배송요율 `org_id`를 타 조직으로 UPDATE | `DELIVERY_AGENT` / org `0725447c…` | **42501** 동일 | 차단 |

→ **DEF-149 §1.2`(updateCustomsRate`·`updateDeliveryRate`의 `org_id` 변조)는 DB 계층에서 차단됨**을 실증했다. §1.1의 코드 IDOR는 RLS가 있음에도 admin client 우회로 남아 있으므로 #1349 수정이 필요하다.

#### 5.5.3 `WITH CHECK` 존재 여부 (DEF-149 §1.2 쟁점)

`pg_policies` 실측 결과(부록 A.4):

- `zen_customs_rates`: `customs_rates_write`(INSERT)에 명시적 `WITH CHECK` **있음**(org_id = 내 조직). `customs_rates_update`(UPDATE)는 `USING`만 명시 → PostgreSQL 규칙상 `USING` 표현이 `WITH CHECK`로도 적용된다. 실측에서 `org_id` 변조 UPDATE가 42501로 거부되어 이 규칙을 확인했다.
- `zen_delivery_rates`: `delivery_rates_insert`(INSERT)에 명시적 `WITH CHECK` **있음**. `delivery_rates_update`는 동일하게 `USING`만 있으나 실측 42501로 변조 차단.
- 따라서 정책 선언만 보고 "UPDATE에 WITH CHECK가 없다"고 판단하면 오독이다. **실측 결과로 보완한다.**

> DEF-149 §1.3(조회 액션 4건의 역할 가드)은 본 Task의 8경로 × 4역할 실측(§3)과 별개 액션/range라, 판정 근거를 Aiden에게 보고하고 별도 Task 발령을 권고한다(§9.3).

---

## 6. 판정 총괄

| 판정 | 건수 | 대상 |
|:--|:-:|:--|
| ✅ 정상(의도된 설계) | 3 | `transport-costs`·`exchange-rates`(페이지 게이트), `ups-actual-charges` RLS 스코프 |
| ⛔ 서버 오류(신규, 재현됨) | 1 | `CARRIER`의 `/admin/transport-costs` HTTP 500(§8.1-3) |
| ⚠️ 관찰(구조 공백, 데이터 피해 미확인) | 4 | `rates`·`customs-rates`·`delivery-rates`·`ups-rates` 페이지 게이트 부재 |
| 🔴 결함(실증) | 1 | `zen_rate_cards` 원가·마진 RLS 노출(§5.1) |
| ⚠️ 불일치(의도 확인 필요) | 1 | 대리점 UPS 실비 쓰기: 코드 허용 ↔ RLS 차단(§5.3) |
| ❓ 미확인 | 1 | `/finance/daily-billing`의 `CORPORATE` 차단(§9.1) |
| 🔴 결함(연계, 코드 계층) | 1 | DEF-149 §1.1 — `agency/shippers.ts` 5개 함수 소유권 미검증 + admin client 우회(§5.5) |
| ✅ 정상(연계, DB 계층) | 2 | DEF-149 §1.2 — customs/delivery `org_id` 변조 42501 차단, 교차 대리점 조회·수정 0건(§5.5) |

---

## 7. P4 ① `admin/layout.tsx` 게이트 설계 제안

### 7.1 설계 원칙

1. **미들웨어 화이트리스트를 "경로 × 역할"로 좁힌다.** 현재는 `orgType !== 'PLATFORM'` 단일 조건이라 8경로가 전 조직에 열린다. 경로별 허용 역할 표를 **한 곳(`rbac.ts`)** 에 두고 미들웨어와 레이아웃이 같은 표를 참조해야 `proxy.ts` ↔ `rbac.ts` 불일치(Issue #688 재발 유형)가 구조적으로 사라진다.
2. **`admin/layout.tsx`에 서버 게이트를 두되, "허용 목록" 방식**으로 구현한다. `requireAdmin()`처럼 `/admin` 전체를 요구하면 **의도적으로 열어 둔 경로가 깨진다**(예: `CARRIER`의 `/admin/rates`).
3. 판정 근거는 **DB 권한표(`zen_role_permissions`) 우선**, 없으면 `STATIC_PERMISSIONS` 폴백. 현재 `validateAdminAction`이 정적 표만 보므로 DB에서 권한을 바꿔도 액션이 따라오지 않는다.

### 7.2 경로별 허용 역할 표(안)

> 근거: DB 권한표 실측 + 각 페이지/액션의 기존 가드 + `STATIC_PERMISSIONS`. **🔶 표시는 Aiden 확정 필요.**

| 경로 | ADMIN/SUPER | MANAGER | SUB_ADMIN | CARRIER | CUSTOMS_BROKER | DELIVERY_AGENT | AGENCY | SHIPPER/CORPORATE | 비고 |
|:--|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:--|
| `/admin/rates` | ✅ | ✅ | — | ✅(자기 운송사) | — | — | — | ❌ | 🔶 MANAGER 허용 여부(정적 표엔 없음, 액션은 허용) |
| `/admin/transport-costs` | ✅ | ❌ | — | ✅ | — | — | — | ❌ | 현행 유지(페이지가 이미 차단) |
| `/admin/customs-rates` | ✅ | ✅ | — | — | ✅(자기 조직) | — | — | ❌ | 🔶 화주 "조회 전용" 분리 여부 |
| `/admin/delivery-rates` | ✅ | ✅ | — | — | — | ✅(자기 조직) | — | ❌ | 🔶 동일 |
| `/admin/ups-rates` | ✅ | ✅ | ✅(관리 대리점) | — | — | — | ❌ | ❌ | 화주 조회는 `/ups-rates`(비관리자용 화면)로 유도 |
| `/admin/exchange-rates` | ✅ | ❌ | — | — | — | — | — | ❌ | 현행 유지 |
| `/admin/ups-actual-charges` | ✅ | ✅ | — | — | — | — | ✅ | ❌ | 🔶 대리점 쓰기 허용 시 RLS INSERT 정책 동반 필요(§5.3) |
| `/finance/daily-billing` | ✅ | ✅ | — | — | — | — | ✅ | 🔶 `SHIPPER`/`AGENCY_SHIPPER`/`CORPORATE` | 🔶 `CORPORATE` 포함 여부(§9.1) |

### 7.3 구현 시 주의

- `admin/layout.tsx`가 게이트를 갖게 되면 **`/admin` 하위 전체**에 적용된다. 위 표에 없는 admin 경로(`members`·`organizations`·`settings` 등)는 종전과 동일하게 `requireAdmin()` 수준(ADMIN/SUPER)으로 두는 것이 안전하다.
- 게이트는 **레이아웃 1곳 + 각 페이지 1곳(심층 방어)** 두 겹으로 두고, 미들웨어는 1차 필터로만 유지한다. 미들웨어 우회 취약점(`next` GHSA 계열, DEF-146)과 결합해도 페이지가 막아야 한다.
- 라우팅 화이트리스트와 권한표를 **같은 상수에서 생성**해야 한다. `rbac.ts`의 `ALL_RESOURCE_PATHS`(`:124-149`)가 이미 경로 목록을 갖고 있으므로 이를 단일 출처로 승격하는 방안을 권한다.

---

## 8. 발견 사항

### 8.1 R-18 결함 후보

| # | 항목 | 긴급도(제안) | 근거 |
|:-:|:--|:--|:--|
| 1 | `zen_rate_cards` SELECT 정책이 화주·법인·개인에게 원가(`carrier_cost`)·마진(`margin_rate`,`platform_fee_rate`) 전 컬럼을 노출 | **High** | §5.1 실측(24건 전량, 200 OK). 정책 `20260529150000:30-40`. 코드는 `CARRIER` 마스킹만 존재(`admin/rates.ts:303-307`) |
| 2 | 대리점 UPS 실비 입력: 코드 가드·UI는 허용, RLS는 차단 → 저장 실패 | **Medium** | §5.3. `ups-actual-charges.ts:20-25`, `ups-actual-charges/page.tsx:9-13`, `client:126`, RLS `migration:26-59`, 실측 403 |
| 3 | 운송사(`CARRIER`)가 `/admin/transport-costs` 진입 시 **HTTP 500** (재시도 화면). 접근은 차단되나 오류 응답 | **Low** | §3 표(`CARRIER` = `⛔ HTTP 500`), §3.1 상세. 3회 반복 실측 모두 500. 페이지 게이트는 `checkPermission`으로 정상 차단 의도 — 500 대신 리다이렉트/403이 기대값. |

> 본 Task는 **점검·보고 전용**이므로 코드 수정·DEF 파일 생성은 하지 않았다(R-18: High/즉시면 Aiden에게 먼저 보고). Aiden 판단 후 별도 Task로 발령해 주기 바란다.
>
> DEF-149 §1.1(§5.5)은 Riley가 이미 #1349로 Team B에 수정 요청한 결함이므로 **중복 DEF 등록하지 않았다**. §5.5의 실측은 #1349 수정 검증용 근거로 Aiden·Team B에 공유한다.

### 8.2 관찰(결함 아님, 기록)

1. `zen_ups_actual_charges`의 `admin_manager_all`은 `ZENITH_SUPER_ADMIN`·`SUB_ADMIN`을 포함하지 않는데, 같은 화면이 쓰는 `zen_ups_actual_cost`는 포함한다(§4.1). 최고 관리자 계정으로 실비 청구 항목이 보이지 않을 수 있다.
2. `/admin/ups-actual-charges` 페이지의 서버 게이트는 `SUB_ADMIN`을 허용하지 않는데, RLS는 `zen_ups_actual_cost`에 `SUB_ADMIN`을 허용한다(위와 같은 방향의 불일치).
3. `/admin/rates`의 "요율 카드 수정"이 실제로는 `createRateCard`를 호출한다(`useRates.ts:206`, `updateRateCard` 미사용). 이번 점검 범위(접근통제) 밖이지만 기능 결함 후보다.
4. `admin` 그룹 전체가 `(dashboard)/layout.tsx` 하나에만 의존하므로, `admin/layout.tsx` 신설은 **P4 ①의 단일 지점**이다(§7).

### 8.3 R-15 개선 후보 (IMP 제안 후보)

| # | 제안 | 근거 |
|:-:|:--|:--|
| 1 | `validateUserAction`을 `requireSessionAction` 등으로 개명하거나 역할 인자를 필수화 | 이름이 "권한 검증"으로 오독된다(`guards.ts:121-146`, 실제 인증 전용) |
| 2 | `validateAdminAction`이 정적 표 대신 DB 권한표를 사용하도록 통일 | DB에서 권한을 바꿔도 액션이 따라오지 않는다(`guards.ts:103-107` ↔ `rbac.ts:45-58`) |
| 3 | 미들웨어 화이트리스트를 `rbac.ts` 단일 출처에서 생성 | `proxy.ts:201-208` 하드코딩이 Issue #688 유형 불일치의 원인 |
| 4 | 로그인 폼이 JS 미동작 시 GET으로 제출되어 **비밀번호가 URL 쿼리에 남는다** | `<form onSubmit>`에 `method`/`action` 부재(`(auth)/login/page.tsx:62`). 하이드레이션 실패 시 `?email=...&password=...`가 브라우저 기록·서버 로그에 남는 것을 실측(§9.2) |

> R-15 v3.8에 따라 **IMP 번호 부여·`scratch/post_launch_improvements.md` 수정은 하지 않았다**(Aiden 전속). 위 표를 근거로 Aiden이 채택 여부를 판단해 주기 바란다.

### 8.4 #1338 → #1346 파트2 자료 재사용

Aiden 회신(2026-11-17, #1338 코멘트 3번)으로 "SQL·재현 자료는 `scratch/`에 두지 말고 리뷰 문서 부록으로 커밋"이 확정됐다. 이에 따라 **스크립트 원문과 SQL을 커밋되는 부록 A(A.1~A.4)에 수록**했고, `scratch/` 사본은 R-13에 따라 커밋하지 않았다. #1346 파트2(§10 #16 RLS 매트릭스)는 부록 A.1·A.4를 그대로 입력으로 재사용할 수 있다.

---

## 9. 미확인 항목과 다음 단계

### 9.1 `/finance/daily-billing`의 `CORPORATE` 차단

- 페이지 허용 역할: `ZENITH_SUPER_ADMIN/ADMIN/MANAGER/AGENCY/AGENCY_SHIPPER/SHIPPER`(`page.tsx:13-16`) — **`CORPORATE`가 없다**.
- 그런데 표준 화주 계정 `shipper@zenith.kr`의 역할은 **`CORPORATE`**이고, RLS는 `CORPORATE`의 자기 조직 인보이스 조회를 허용한다.
- 실측: `shipper@`(CORPORATE) → `/dashboard`로 리다이렉트. `AGENCY_SHIPPER` 계정으로는 진입 가능(§3 표).
- **판단 보류**: `CORPORATE`는 `/billing/invoice`를 쓰도록 설계된 것인지, 아니면 일별 청구 화면에서 빠뜨린 것인지 확인 필요. 결함으로 단정하지 않는다.

### 9.2 개발 서버 하이드레이션 미완료(환경 이슈)

- `next dev`(3100)에서 로그인 폼에 React 하이드레이션이 붙지 않아(`__reactFiber$` 미부착, pageerror 0건, HMR 웹소켓 `ERR_INVALID_HTTP_RESPONSE`) 폼 제출이 **네이티브 GET으로 폴백**했다.
- 이때 URL이 `/ko/login?locale=ko&email=...&password=...`가 되어 **비밀번호가 쿼리스트링에 남았다**(§8.3-4의 근거).
- 원인은 이 워크트리 환경(포트/프록시/캐시)일 가능성이 높고, 프로덕션 빌드에서는 정상 동작했다. **이번 Task의 판정에는 영향 없음.** 다만 재현 시 개발 서버를 쓰지 말고 프로덕션 빌드를 쓰기 바란다.

### 9.3 후속

1. Aiden: §8.1 결함 3건의 Task 발령 여부 결정(특히 #1 High, #3 Low는 병합 가능)
2. Aiden: §7.2 표의 🔶 4건 확정 → P4 ① 구현 Task
3. Aiden: DEF-149 §1.3(조회 액션 4건 역할 가드) 별도 Task 발령 여부 결정(§5.5.3)
4. #1349(Team B): §5.5 실증 근거로 `agency/shippers.ts` 5개 함수 소유권 검증 수정 검증
5. #1346 파트2: 부록 A의 RLS 위장 SQL·Playwright 프로브 재사용

---

## 부록 A. 재현 스크립트·SQL (커밋본, #1346 파트2 재사용용)

### A.1 RLS 역할 위장 SQL

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"<user-uuid>","role":"authenticated",
    "app_metadata":{"role":"<ROLE>","org_id":"<org-uuid>"}}', true);
select count(*) from zen_rate_cards;              -- 화주: 24 (원가·마진 포함)
select count(*) from zen_ups_actual_charges;      -- 화주: 자기 조직 오더만
select count(*) from zen_ups_actual_cost;         -- 화주: 자기 조직 오더만
rollback;
```

### A.2 PostgREST 실증 (쓰기 거부 / 읽기 노출)

```bash
ANON=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)
TOK=$(curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"shipper@zenith.kr","password":"password1234"}' | jq -r .access_token)

# 읽기: 원가·마진 노출 확인
curl -s "http://127.0.0.1:54321/rest/v1/zen_rate_cards?select=id,carrier_cost,margin_rate,platform_fee_rate&limit=3" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOK"

# 쓰기: RLS 차단 확인 (403 기대)
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://127.0.0.1:54321/rest/v1/zen_rate_cards" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"transport_mode":"AIR","currency":"USD","tiers":[],"carrier_cost":1}'
```

### A.3 Playwright 프로브 (요지)

```js
// 1) 프로덕션 빌드 서버 필요: npm run build && npx next start -p 3101
// 2) 하이드레이션 대기 후 로그인
await page.goto(`${BASE}/ko/login`, { waitUntil: 'load' });
await page.waitForFunction(() => {
  const el = document.querySelector('form');
  return el ? Object.keys(el).some(k => k.startsWith('__reactFiber$')) : false;
});
await page.fill('#email', email); await page.fill('#password', pw);
await page.click('[data-action="login"]');
// 3) 8경로 goto → 최종 URL/리다이렉트/표 행 수/금액 토큰/쓰기 버튼/거부 문구 수집
```

### A.4 DEF-149 연계 RLS 실증 SQL (재사용용)

```sql
-- A/B. 대리점 교차 테넌트 조회·수정 거부 (org A=Zenith, org B=SNTL)
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"274e0810-cc6d-4488-a87f-fd8045a134df","role":"authenticated",
    "app_metadata":{"role":"AGENCY","org_id":"809a04e8-7a49-48fc-b1c3-4b6f976862a4"}}', true);
select count(*) from zen_agency_shippers;                              -- 3 (자기 조직)
select count(*) from zen_agency_shippers
  where agency_org_id = '57d63ade-b140-4647-b9cd-3a1d48de181a';       -- 0 (교차)
update zen_agency_shippers set grade = 'HACK-A'
  where id = '40c92c64-38bd-4ac3-bf56-85763bed017f';                   -- UPDATE 0
rollback;
-- org B 세션(sub b32f1364…, org 57d63ade…)도 동일하게 자기 1건 / 교차 0건

-- C/D. 요율 테이블 org_id 변조 차단 (UPDATE 정책의 USING → WITH CHECK 적용 확인)
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"274e0810-cc6d-4488-a87f-fd8045a134df","role":"authenticated",
    "app_metadata":{"role":"CUSTOMS_BROKER","org_id":"513030e1-e466-4de8-8170-3e16ee7c8c87"}}', true);
update zen_customs_rates
   set org_id = 'dac201eb-6a7b-439f-afeb-11c09b4a10b2'
 where id = '2ef41448-8f48-4505-8c0a-38768895c1ca';
-- 42501: new row violates row-level security policy
rollback;
```

정책 원문: `supabase/migrations/20260606020000_p6_service_rate_tables.sql:27-71`(통관), `:102-146`(배송), `pg_policies` 실측은 §5.5.3. 스크립트 원본은 `scratch/task1156_def149_rls_probe.sql`(R-13, 비커밋).

---

## 부록 B. 실측 원본

- 스크린샷: `docs/08_Self_Audit/Reviews/assets/TASK-1156/`
- 원본 JSON: `scratch/task1156_probe_v2.json`(비커밋) — 커밋본에는 §3 표로 정리해 수록
