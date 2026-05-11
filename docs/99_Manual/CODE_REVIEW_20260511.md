# ZENITH LMS 코드 개선 분석 보고서

> **분석일:** 2026-05-11
> **분석 기준:** `npm run build`, `npm run lint`, `npm run test:regression`, 코드 정적 분석, 프로젝트 규약 대조
> **분석 대상:** Commit `78fd12e` (main branch)

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

### 발견된 사항

다음 3개 서버 액션 파일은 **소스 코드 전체에서 단 한 번도 import 되지 않음**:

| 파일 | 줄 수 | 내보내는 함수 |
|------|:-----:|:-------------|
| `src/app/actions/master.ts` | 262줄 | 10+ 개 |
| `src/app/actions/master-data.ts` | 177줄 | 12+ 개 |
| `src/app/actions/organization.ts` | 78줄 | 4+ 개 |

### 부수 효과 — 함수명 중복 충돌

동일 함수명이 여러 파일에 중복 정의되어 있음:

| 함수명 | 중복 정의된 파일 |
|--------|-----------------|
| `getOrganizations` | `finance.ts`, `master.ts`, `master-data.ts`, `organization.ts` — **총 4회** |
| `getPorts` | `master.ts`, `master-data.ts` — **2회** |
| `getCommonCodes` | `master.ts`, `master-data.ts` — **2회** |
| `getCommonCodesByGroup` | `master.ts`, `master-data.ts` — **2회** |
| `deleteCommonCode` | `master.ts`, `master-data.ts` — **2회** |
| `upsertCommonCode` | `master.ts`, `master-data.ts` — **2회** |
| `upsertPort` | `master.ts`, `master-data.ts` — **2회** |
| `getAirlines` | `master.ts`, `master-data.ts` — **2회** |
| `getNations` | `master.ts`, `master-data.ts` — **2회** |

> 누군가 barrel import(index.ts)를 도입할 경우 **즉시 naming collision 발생**.

---

## 3. 🟡 테스트 인프라 취약

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

## 4. 🟡 코드 규약 위반

### 파일 줄 수 제한

프로젝트 규약: `파일 800줄 이하` (TASK_BOARD) / `1,000줄 이하` (LIVE 체크리스트)

| 파일 | 실제 줄 수 | 판정 |
|------|:---------:|:----:|
| `src/types/supabase.ts` | **3,272** | ❌ 자동 생성 파일이나 디렉토리 분리 권장 |
| `src/app/actions/finance.ts` | **732** | ⚠️ 한계 근접, 분할 권장 |
| `src/app/actions/orders.ts` | **681** | ⚠️ 한계 근접, 분할 권장 |
| `src/components/orders/OrderRegistrationForm.tsx` | 575 | ⚠️ 권장치 이하지만 대형 컴포넌트 |
| `src/app/actions/support.ts` | 483 | ✅ OK |
| `src/app/[locale]/(admin)/rates/page.tsx` | 483 | ✅ OK |

> `supabase.ts`는 Supabase CLI `gen types` 자동 생성 파일로, lint 적용 제외(`.eslintignore`) 가능.

---

## 5. 🟡 다국어(l10n) 번역 불완전

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

## 6. 🟢 개선 권장 — 설정/환경

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

## 7. 🟢 개선 권장 — 구조적

### 패턴 불일치

| 위치 | 현재 | 프로젝트 패턴 |
|------|------|-------------|
| `src/lib/finance/settlement.ts` | `SettlementEngine` class 기반 (288줄) | 함수형 + 불변성 지향 |

### `createAdminClient` 미사용

- `src/utils/supabase/server.ts`에 정의되어 있으나 **어디에서도 import 되지 않음**
- 실제 코드는 `createClient`(서비스 롤) 방식 사용
- `SettlementEngine`에서 `createAdminClient` 호출 의도였으나 사용되지 않은 것으로 추정

### 스크립트 디렉토리

| 파일 | 용도 |
|------|------|
| `scripts/seed-local.ts` | 로컬 시드 데이터 |
| `scripts/test_with_filter.sh` | E2E 필터드 테스트 래퍼 |

> 추가 정리나 분류 불필요하지만, 문서화 참조 필요 시 `package.json` scripts 주석 추가 권장.

---

## 8. ✅ 양호 — 긍정적 지표

| 항목 | 상태 | 비고 |
|------|:----:|:-----|
| `npm run build` | ✅ 통과 | Next.js 16.2.4, 0 errors |
| 단위 테스트 161/161 | ✅ 전 PASS | 37 files passed |
| 하드코딩 시크릿 | ✅ 없음 | env 변수 처리 |
| 미들웨어 Loop Guard | ✅ 있음 | `purePath.startsWith(target)` 배타적 가드 |
| RLS 정책 | ✅ SAR 완료 | CRUD 전 정책 수립 Sar-013 |
| Sentry 설정 | ✅ 3종 파일 | client/edge/server |
| Playwright E2E | ✅ 11개 spec | E2E-01~12 구성 |
| Git 히스토리 | ✅ 규칙 준수 | `[Gemini]`/`[Claude]` 프리픽스, Task ID 기반 |

---

## 📋 우선 순위 추천

| 순위 | 작업 | 난이도 | 영향 범위 | 예상 공수 |
|:---:|:------|:------:|:---------:|:---------:|
| 1 | **린트 에러 정리** (any → 구체 타입, 미사용 import 제거) | ⭐⭐⭐ | 전역 | 3~4 MD |
| 2 | **데드 코드 제거** (master.ts, master-data.ts, organization.ts) | ⭐ | 3개 파일 | 0.5 MD |
| 3 | **`.env.example` 보강** (Supabase, App URL 추가) | ⭐ | 1개 파일 | 0.1 MD |
| 4 | **다국어 파일 보강** (zh.json, ja.json) | ⭐⭐ | 2개 파일 | 0.5 MD |
| 5 | **서버 액션 분할** (finance.ts 732줄 → 도메인별 분리) | ⭐⭐⭐ | 1개 파일 | 1 MD |
| 6 | **테스트 `.env.local` 의존성 제거** (vitest config 변경) | ⭐ | 2개 파일 | 0.3 MD |
| 7 | **미사용 유틸 정리** (createAdminClient, SettlementEngine 패턴 통일) | ⭐⭐ | 2~3개 파일 | 0.5 MD |

---

*분석 도구: opencode (big-pickle)*
