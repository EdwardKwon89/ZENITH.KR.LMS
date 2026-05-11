# ZENITH LMS 코드 개선 분석 보고서 (v2)

> **분석일:** 2026-05-11
> **분석 기준:** `npm run build` · `npm run lint` · `npm run test:regression` · GitNexus 지식 그래프 (6,489 symbols, 9,598 edges, 288 flows) · 코드 정적 분석 · 프로젝트 규약 대조
> **분석 대상:** Commit `5061ae8` (main branch)
> **분석 도구:** GitNexus v1.6.4 · opencode (big-pickle)

---

## 1. 🔴 심각 — 린트 에러 483건 (+ 경고 212건 = 총 695건)

### 상세 구성

| 유형 | 건수 | 심각도 |
|------|:----:|:------:|
| `@typescript-eslint/no-explicit-any` | 446건 | 🔴 |
| `@typescript-eslint/no-unused-vars` | 197건 | 🟡 |
| `react-hooks/exhaustive-deps` | 13건 | 🟡 |
| `cascading setState in effect` | 6건 | 🔴 |
| `react/no-unescaped-entities` | 4건 | 🟢 |
| 기타 | ~29건 | 🟡 |

### 영향

- `any` 타입 **446건**은 타입 안전성 전반을 훼손
- `src/app/actions/finance.ts`(732줄) 단일 파일에 9개의 `any` 사용
- 실제 런타임 타입 에러의 근원이 될 수 있음
- `no-unused-vars` 197건 — import 찌꺼기, 미사용 변수로 인한 코드 복잡도 증가
- `cascading setState` 6건 — 불필요한 리렌더링 유발

---

## 2. 🔴 심각 — 데드 코드 (죽은 서버 액션 파일)

### ❌ 죽은 파일 (import 0회) — 삭제 대상

| 파일 | 줄 수 | 내보내는 함수 |
|------|:-----:|:-------------|
| `src/app/actions/master-data.ts` | 177줄 | `getPorts`, `getOrganizations`, `getCommonCodes`, `upsertCommonCode` 등 12개 |
| `src/app/actions/organization.ts` | 78줄 | `getOrganizations`, `approveOrganization`, `rejectOrganization`, `requestOrganizationSupplement` |

### ✅ 살아있는 파일 (v1 오판 정정)

| 파일 | import 수 | 상태 |
|------|:--------:|:----:|
| `src/app/actions/master.ts` | **6개** 파일에서 import (`settings/page.tsx`, `OrderRegistrationForm.tsx`, `orders/new/page.tsx`, `OrderFilterBar.tsx`, `master-orders/page.tsx`, `admin/settings/settings-client.tsx`) | ✅ 정상 |
| `src/app/actions/finance.ts` | **다수** 파일에서 import | ✅ 정상 |
| `src/utils/supabase/server.ts` 내 `createAdminClient` | `settlement.ts`(3회) + `params/service.ts`(4회)에서 사용 | ✅ 정상 |

### ⚠️ 함수명 중복 충돌 (위험)

GitNexus `context` 명령으로 확인 — `getOrganizations`에 대해 **4개 후보 반환**:

| 함수명 | 중복 위치 |
|--------|----------|
| `getOrganizations` | `finance.ts`, `master.ts`, `master-data.ts`(dead), `organization.ts`(dead) — **총 4회** |
| `getPorts` | `master.ts`, `master-data.ts`(dead) |
| `getCommonCodes` | `master.ts`, `master-data.ts`(dead) |
| `getCommonCodesByGroup` | `master.ts`, `master-data.ts`(dead) |
| `deleteCommonCode` | `master.ts`, `master-data.ts`(dead) |
| `upsertCommonCode` | `master.ts`, `master-data.ts`(dead) |
| `upsertPort` | `master.ts`, `master-data.ts`(dead) |
| `getAirlines` | `master.ts`, `master-data.ts`(dead) |
| `getNations` | `master.ts`, `master-data.ts`(dead) |

> 누군가 barrel import(index.ts)를 도입할 경우 **즉시 naming collision 발생**. 지금은 각각의 import 경로가 달라 충돌은 없으나, dead file 제거가 근본 해결책.

---

## 3. 🟡 프로덕션 코드 내 `console.log` 범람 (신규)

GitNexus 실행 흐름 분석 결과 **미들웨어가 모든 요청에서 console.log를 방출**:

### middleware.ts — 요청당 9회 로그

| 라인 | 내용 | 심각도 |
|:----:|------|:------:|
| 27 | `[MIDDLEWARE] Entry: ${pathname}` | 🟡 모든 요청 |
| 34 | `[MIDDLEWARE] Session Sync Failed:` | 🟢 |
| 57 | `[MIDDLEWARE] Unauthorized Access...` | 🟢 |
| 68 | `[MIDDLEWARE] Maintenance Mode...` | 🟢 |
| 113 | `[MIDDLEWARE] Individual Master detected...` | 🟡 |
| 117 | `[MIDDLEWARE] Robust Fallback active...` | 🟡 |
| **124** | `[MIDDLEWARE] Auth Result: user=${user.id}...` | **🔴 사용자 ID 노출** |
| 130 | `[MIDDLEWARE] Guard: Redirecting Pending...` | 🟢 |
| 151 | `[MIDDLEWARE] Path Violation...` | 🟡 |

### actions/finance.ts — 정산 실행마다 로그

| 라인 | 내용 | 심각도 |
|:----:|------|:------:|
| 82 | `[Action] calculateSettlementAction started...` | 🟡 |
| **84** | `[Action] User Profile: ${profile.email}...` | **🔴 이메일 노출** |
| 89 | `[Action] Settlement calculation result...` | 🟡 |
| 98 | `[Action] Error fetching costs...` | 🟢 |
| 101 | `[Action] Fetched ${costs?.length} costs...` | 🟡 |

### 기타 console.log 분포

| 파일 | 라인 | 내용 |
|------|:----:|------|
| `src/app/actions/support.ts` | 116, 258 | `[ERROR] QnA notification failed` |
| `src/app/global-error.tsx` | 33 | `Global Runtime Error` |
| `src/components/claims/ClaimRequestModal.tsx` | 39 | `Claim error` |
| `src/lib/supabase.ts` | 10 | `CRITICAL: Supabase credentials are missing` |
| `src/utils/supabase/server.ts` | 5 | `// console.log('[DEBUG] createClient called')` — 주석 처리 |

> **권장**: `console.log` → `Sentry.captureMessage()` 또는 `logger` 유틸리티로 전환. 사용자 이메일/ID 노출은 개인정보 보호 위험.

---

## 4. 🟡 테스트 인프라 취약

### `.env.local` 직접 의존

| 파일 | 문제 |
|------|------|
| `tests/integration/tracking-business-qa.test.ts:9` | `fs.readFileSync('.env.local')` → 파일 없으면 **FAIL** (vitest 1/38 suite 실패) |
| `tests/e2e/e2e-12-route-optimization.spec.ts:7` | `dotenv.config({ path: '.env.local' })` — 동일 패턴 |

**CI/CD 환경에서 `.env.local`이 없으면 무조건 실패**. vitest 설정 또는 `dotenv` 로드 방식으로 개선 필요.

### 테스트 파일 통계

| 구분 | 파일 수 |
|:----|:------:|
| 유닛 테스트 | 29 |
| 통합 테스트 | 9 |
| E2E (Playwright) | 11 |
| **전체** | **51** |

---

## 5. 🟡 코드 규약 위반

### 파일 줄 수 제한

프로젝트 규약: `파일 800줄 이하` (TASK_BOARD) / `1,000줄 이하` (LIVE 체크리스트)

| 파일 | 실제 줄 수 | 판정 |
|------|:---------:|:----:|
| `src/types/supabase.ts` | **3,272** | ❌ 자동 생성 파일, `.eslintignore` + 디렉토리 분리 권장 |
| `src/app/actions/finance.ts` | **732** | ⚠️ 한계 근접, 분할 권장 |
| `src/app/actions/orders.ts` | **681** | ⚠️ 한계 근접, 분할 권장 |
| `src/components/orders/OrderRegistrationForm.tsx` | 575 | ⚠️ 대형 컴포넌트, 분할 검토 |
| `src/app/actions/support.ts` | 483 | ✅ OK |
| `src/app/[locale]/(admin)/rates/page.tsx` | 483 | ✅ OK |

> `supabase.ts`는 Supabase CLI `gen types` 자동 생성 파일로 lint 적용 제외(`.eslintignore`) 가능.

---

## 6. 🟡 다국어(l10n) 번역 불완전

### 파일 크기 비교

| 언어 | 파일 | 크기 | 완성도(추정) |
|:----:|:----|:----:|:-----------:|
| 한국어 | `messages/ko.json` | 14,512 bytes | 100% (기준) |
| English | `messages/en.json` | 14,105 bytes | ~97% |
| 日本語 | `messages/ja.json` | 741 bytes | ~5% |
| 中文 | `messages/zh.json` | 619 bytes | ~4% |

### `ko.json`에는 있으나 `zh.json`에 없는 키 (일부)

```
Admin, Claims, Customs, DocumentLabels, Documents, Header, Orders, Pending, Support, VOC, Wallet ...
```

> 일본어/중국어는 사실상 placeholder만 있는 상태. 실 서비스 오픈 전 번역 완료 필수.

---

## 7. 🟢 개선 권장 — 설정/환경

### `.env.example` 누락 (현재 Sentry만 있음)

```
# 현재 내용
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
```

**필수 추가 항목:**
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Sentry DSN

- DSN 값이 문서/설정 어디에도 없음 — 운영 DSN 관리 정책 수립 필요

---

## 8. 🟢 개선 권장 — 구조적

### 패턴 불일치

| 위치 | 현재 | 프로젝트 패턴 |
|------|------|-------------|
| `src/lib/finance/settlement.ts` | `SettlementEngine` **class** 기반 (288줄) | 함수형 + 불변성 지향 |

> `SettlementEngine.calculateOrderCosts()`는 서버 액션 `calculateSettlementAction`에서 호출되며, `InvoiceGenerator.generateInvoice()`도 같은 파일에 class로 존재. 프로젝트의 함수형 패턴과 불일치.

### 스크립트 디렉토리

| 파일 | 용도 |
|------|------|
| `scripts/seed-local.ts` | 로컬 시드 데이터 |
| `scripts/test_with_filter.sh` | E2E 필터드 테스트 래퍼 |

---

## 9. ✅ 양호 — 긍정적 지표

| 항목 | 상태 | 비고 |
|------|:----:|:-----|
| `npm run build` | ✅ 통과 | Next.js 16.2.4, 0 errors |
| 단위 테스트 161/161 | ✅ 전 PASS | 37 files passed |
| 하드코딩 시크릿 | ✅ 없음 | env 변수 처리 |
| 미들웨어 Loop Guard | ✅ 있음 | `purePath.startsWith(target)` 배타적 가드 |
| RLS 정책 | ✅ SAR 완료 | CRUD 전 정책 수립 SAR-013 |
| Sentry 설정 | ✅ 3종 파일 | client/edge/server |
| Playwright E2E | ✅ 11개 spec | E2E-01~12 구성 |
| Git 히스토리 | ✅ 규칙 준수 | `[Gemini]`/`[Claude]` 프리픽스, Task ID 기반 |
| GitNexus 인덱싱 | ✅ 신규 도입 | 6,489 nodes, 9,598 edges, 288 flows |

---

## 📋 최종 우선순위 (v2 — GitNexus 심층 분석 반영)

| 순위 | 작업 | 난이도 | 위험도 | 예상 공수 | v1 대비 |
|:---:|:------|:------:|:------:|:---------:|:--------|
| 1 | **린트 에러 정리** (`any` → 구체 타입, 미사용 import 제거) | ⭐⭐⭐ | 🔴 | 3~4 MD | — |
| 2 | **데드 코드 제거** (`master-data.ts`, `organization.ts`) | ⭐ | 🔴 | 0.3 MD | `master.ts` 삭제 대상에서 제외 |
| 3 | **`console.log` 제거** (미들웨어 9회 + 액션 → Sentry/logger) | ⭐ | 🔴 | 0.5 MD | **신규 발견** |
| 4 | **다국어 파일 보강** (zh.json, ja.json) | ⭐⭐ | 🟡 | 0.5 MD | — |
| 5 | **서버 액션 분할** (`finance.ts` 732줄 → 도메인 분리) | ⭐⭐⭐ | 🟡 | 1 MD | — |
| 6 | **테스트 `.env.local` 의존성 제거** (vitest config 변경) | ⭐ | 🟡 | 0.3 MD | — |
| 7 | **`.env.example` 보강** (Supabase, App URL 추가) | ⭐ | 🟢 | 0.1 MD | — |
| 8 | **SettlementEngine class → 함수형 리팩터링** | ⭐⭐ | 🟢 | 0.5 MD | `createAdminClient` 미사용 주장 삭제 |

---

### 분석 방법 비교 (v1 vs v2)

| 구분 | v1 (기본 도구) | v2 (GitNexus 추가) |
|:-----|:---------------:|:------------------:|
| 분석 도구 | `rg` + `wc` + lint | + GitNexus 지식 그래프 |
| 오판정 | 2건 (`createAdminClient`, `master.ts`) | 0건 |
| 미발견 누락 | `console.log` 19건 전부, 보안 이슈(이메일 노출) | 전부 발견 |
| 함수 수준 분석 | ❌ 불가능 | ✅ startLine/endLine 정밀 식별 |
| 실행 흐름 가시화 | ❌ | ✅ 288 flows · 78 clusters · 78개 기능 영역 |
| 블래스트 레이더 | ❌ | ✅ 함수 변경 시 영향 범위 예측 |
