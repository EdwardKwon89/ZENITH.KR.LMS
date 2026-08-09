# TASK-B-257: Issue #999 — 환율 관리 기능 (일자별 환율 자동 수집/관리)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#999](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/999) |
| **배경** | JSJung 요청: "환율 관리 기능 추가 — ①환율이 정기적으로 자동 수집/갱신되어야 함 ②일자별 환율이 관리되어야 함" |
| **담당** | Baker (Team B) |
| **생성일** | 2026-08-09 |
| **우선순위** | P2 |
| **상태** | 🔔 (구현 완료 → 리뷰) |

## 개요

현재 환율은 `zen_system_params`의 단일 파라미터 `EXCHANGE_RATE_USD_KRW`(2026-04-26 시드 1350.0 고정, 갱신 이력 0건)로만 관리 — 날짜 개념 자체가 없는 단일 "현재값". `getNumericParam('EXCHANGE_RATE_USD_KRW', 1350)` 호출이 5곳에 분산되어 있고 전부 "오늘" 값만 사용. 특히 `daily-billing.ts`는 과거 기간 조회 시에도 "오늘" 환율을 일괄 적용하는 문제가 있음.

## [설계 확정] (2026-08-09, JSJung)

1. **외부 API**: 한국수출입은행(Korea Eximbank) Open API 고시환율 확정. **JSJung이 직접 API 키 확인 후 전달** — 구현 담당은 키 발급 액션 불필요, 전달받는 대로 환경변수(`KOREAEXIM_API_KEY`)로 등록.
2. **관리자 UI 위치**: 기존 **"기본 정보"(`t("master")`, `/admin/codes` 하위) 메뉴의 서브메뉴로 추가** — `src/components/layout/NaviSidebar.tsx`의 기존 `rates`/`customs_rates`/`ups_rates` 등과 같은 그룹. 신규 서브메뉴 `exchange_rates` → `/admin/exchange-rates`.
3. **환율 적용 규칙(확정)**: **오더 운임에 적용되는 환율은 해당 오더가 "출고확정"(OrderStatus.RELEASED)된 날짜의 환율**을 사용. 추가 규칙은 필요 시 별도 정의(현재 미정, 임의 확장 금지).

### 규칙 반영 근거 (Jaison 조사)

- `updateOrderStatus()`가 RELEASED 전이 시 동기적으로 `generateInvoicesForOrder()` → `InvoiceGenerator.generateInvoice()` 호출 — **인보이스 생성 시점 = 출고확정 시점**이 이미 보장. 따라서 `invoice-generator.ts`의 호출을 `getExchangeRate('USD','KRW', 오늘)`로 교체만 하면 "출고확정일 환율" 규칙이 자동 충족(별도 과거 상태이력 조회 불필요).
- `applied_exchange_rate` 스냅샷이 `zen_invoices`/`zen_tax_invoices`에 저장되므로, 이후 이를 참조하는 화면은 **스냅샷 값을 그대로 사용**해야 일관성 유지.
  - `invoice.ts`(`issueTaxInvoice`): 이미 `invoice.applied_exchange_rate || fallback` 패턴으로 구현됨 — 그대로 유지(참고 패턴).
  - `daily-billing.ts`: 스냅샷을 select조차 하지 않고 매번 "오늘" 기준 일괄 적용 → **확정 규칙 위반(별도 버그)**. `applied_exchange_rate` select 추가 + 인보이스별 스냅샷 우선 사용으로 수정.
  - `settlement.ts`(`createAdjustmentInvoice`): 조정 발행 "오늘" 날짜 사용 — 원 오더 출고일과 다를 수 있어 추가 규칙 필요 여부는 **미정**(JSJung 지시대로 필요 시 별도 정의). 원본 동작 유지하되 환율 소스만 새 테이블로 교체.
  - `service-rates.ts`(`getUsdKrwRate`): 오더 등록 전 견적(출고 전, 미래) 용도라 "오늘" 기준 유지가 타당 — 규칙 대상 아님, 소스만 교체.

### 구현 스펙

#### 1. 신규 테이블 `zen_exchange_rates`

```sql
CREATE TABLE public.zen_exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency   VARCHAR(3) NOT NULL,      -- 'USD'
  quote_currency  VARCHAR(3) NOT NULL,      -- 'KRW'
  rate            NUMERIC(18,6) NOT NULL CHECK (rate > 0),
  rate_date       DATE NOT NULL,            -- 해당 환율의 기준 영업일
  source          VARCHAR(20) NOT NULL DEFAULT 'MANUAL', -- 'KOREAEXIM_API' | 'MANUAL'
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES public.zen_profiles(id), -- MANUAL인 경우만
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (base_currency, quote_currency, rate_date)
);
```

- 통화쌍 컬럼 분리(스키마 확장 여지) + **1차 구현 범위는 USD/KRW 1종만**(과설계 방지).
- `UNIQUE(base_currency, quote_currency, rate_date)` — 하루 1건, 재수집/보정 시 `ON CONFLICT` upsert.
- RLS: ups-zones 패턴 — ADMIN/MANAGER/ZENITH_SUPER_ADMIN `ALL`, authenticated `SELECT`.

#### 2. 조회 헬퍼 `getExchangeRate(base, quote, date)` — `src/lib/finance/exchange-rate.ts`

- `rate_date <= :date` 중 가장 최근 값 조회(`ORDER BY rate_date DESC LIMIT 1`) — 주말/공휴일 자동 fallback.
- 값이 하나도 없는 극단적 상황(신규 배포 직후 등)에 한해 기존 `getNumericParam('EXCHANGE_RATE_USD_KRW', 1350)` 최후 fallback(완전 장애 방지 방어선).
- 기존 5개 호출부 전부 이 함수로 교체.

#### 3. 정기 자동 수집 — `POST /api/cron/exchange-rate-sync`

- 기존 cron 2건(`pricing-schedule-apply`, `ups-tracking-poll`)과 동일한 Vercel Cron 헤더 인증 패턴 재사용(`x-vercel-cron`/`x-api-key`=CRON_SECRET).
- `vercel.json`에 매일 1회 등록 — KST 11:30 = UTC 02:30 → `"30 2 * * *"`.
- KoreaExim Open API: `authkey=KOREAEXIM_API_KEY`, `searchdate=YYYYMMDD`, `data=AP01`, `deal_bas_r`(매매기준율) 사용. 키 미설정 시 200 + 로그(스킵). 수집 실패 시 에러 삼키지 않고 로깅.
- `ON CONFLICT (base_currency, quote_currency, rate_date) DO UPDATE SET rate, source='KOREAEXIM_API', fetched_at, is_active=true`.

#### 4. 관리자 UI — `/admin/exchange-rates` (기본 정보 서브메뉴)

- 일자별 환율 이력 테이블(날짜, 환율, 소스, 수집시각)
- **수동 보정 입력**(`source='MANUAL'`, 관리자 직접 특정 일자 입력)
- 최근 수집 성공/실패 상태 표시
- NaviSidebar `master` 그룹에 `exchange_rates` 서브메뉴 + i18n 4파일(co/ja/en/zh)
- RBAC `STATIC_PERMISSIONS` + `proxy.ts` 화이트리스트 양쪽 등록 확인(필수 검증 항목 — rbac/proxy 별도 관리)

#### 5. 하위 호환

- `zen_system_params.EXCHANGE_RATE_USD_KRW` 즉시 제거하지 않음 — 신규 테이블 값 없는 극단 케이스의 최후 fallback으로만 당분간 유지.
- `applied_exchange_rate` 스냅샷 컬럼·로직 유지 — 스냅샷 소스만 새 테이블로 교체.

#### 6. 범위 밖(후속 IMP)

- USD/KRW 외 통화쌍 추가 지원(스키마만 확장 가능, UI/로직은 이번 범위 아님)
- 장중 실시간 환율 반영(무역 결제 관행상 일 1회 고시환율로 충분)

## 착수 체크리스트

- [X] `git fetch origin && git pull origin TeamB_Dev` 후 `feature/teamb-257-exchange-rate-management` 브랜치 생성(추적: `origin/TeamB_Dev`) — `./scripts/next-task-number.sh B`로 TASK-B-257 확인 완료
- [X] Issue #999 본문 전체 재확인 — 설계 확정(외부 API/UI 위치/환율 적용 규칙) 반영 확인 + 잔여 조사 완료
- [X] 마이그레이션 `zen_exchange_rates` 생성(RLS + GRANT + 인덱스 포함) — `supabase/migrations/20260809060000_*.sql`
- [X] 헬퍼 `src/lib/finance/exchange-rate.ts` — `getExchangeRate(base, quote, date, supabase?)`
- [X] `/api/cron/exchange-rate-sync/route.ts` + `vercel.json` cron 등록
- [X] 호출부 5곳 교체: invoice-generator / daily-billing(스냅샷 우선 버그 수정 포함) / invoice / settlement / service-rates
- [X] `/admin/exchange-rates` UI(이력 테이블 + 수동 보정 + 수집 상태) + 서버 액션
- [X] NaviSidebar `master` 서브메뉴 `exchange_rates` 추가 + i18n 4파일 번역 키 추가
- [X] RBAC `STATIC_PERMISSIONS` + `proxy.ts` 화이트리스트 등록 확인 (rbac/proxy 별도 관리 — 실제 네비게이션 일치 검증)
- [X] 단위 테스트 작성(헬퍼: 최근일 조회/주말 fallback/빈 테이블→1350 fallback, daily-billing: 스냅샷 우선) — behavioral 테스트
- [X] `npx vitest run --exclude='tests/e2e/**' --exclude='tests/scratch/**'` 직접 실행 후 정확한 결과 기재 — 149/149 files · 1020/1020 tests ALL PASS
- [X] `npm run build` SUCCESS 확인
- [ ] (R-10) 로컬 DB 미연결 시 수동 화면 검증은 JSJung 수행 요청

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] feat: TASK-B-257 ...` → 2. `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 999 --add-label status:review --remove-label status:in-progress` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #999`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 최근 반복 유형 — ①vacuous test(핵심 로직을 실제로 검증 못하는 테스트) ②R-10 스크린샷 미확인 제출 ③TeamB_Dev 직접 커밋. 이번 Task는 **환율 적용 규칙(daily-billing 스냅샷 우선)**이 핵심이므로 behavioral 테스트로 실제 검증할 것. 확정 설계 스펙의 권한검증 조건(이번엔 관리자 수동 보정 권한) 누락 주의.

## [작업 결과]

### 구현 완료 (2026-08-09, Baker)

**커밋**: `446e35c4` — `[Baker] feat: TASK-B-257 Issue #999 일자별 환율 관리 기능 (자동 수집 + 수동 보정 + 출고확정일 환율 적용)`

### 구현 내역

| 파일 | 설명 |
|:-----|:------|
| `supabase/migrations/20260809060000_exchange_rates.sql` | `zen_exchange_rates` 테이블 + RLS + GRANT + 인덱스 |
| `src/lib/finance/exchange-rate.ts` | `getExchangeRate(base, quote, date?, supabase?)` 조회 헬퍼 — `rate_date <= date` 최근값, 최후 1350 fallback |
| `src/app/api/cron/exchange-rate-sync/route.ts` | KoreaExim API 일 수집 Cron + `vercel.json` 등록 |
| `src/app/actions/admin/exchange-rates.ts` | 관리자 서버 액션 — 이력 조회 / 수동 보정 upsert |
| `src/app/[locale]/(dashboard)/admin/exchange-rates/page.tsx` | 관리자 UI — 이력 테이블 + 수동 보정 + 수집 상태 |
| `src/components/layout/NaviSidebar.tsx` | `master` 그룹 서브메뉴 `exchange_rates` 추가 |
| `messages/{ko,en,ja,zh}.json` | `Navigation.exchange_rates` 번역 키 |
| `src/lib/auth/rbac.ts` / `src/lib/auth/proxy.ts` | `/admin/exchange-rates` 권한·화이트리스트 등록 |
| `tests/unit/finance/exchange-rate.test.ts` | 헬퍼·Cron·daily-billing 스냅샷 우선 behavioral 테스트 |

### 테스트 결과

```
npx vitest run tests/unit/finance/exchange-rate.test.ts      → 6/6 PASS
npx vitest run tests/unit/finance/exchange-rate-cron.test.ts → 7/7 PASS
npx vitest run tests/unit/admin/exchange-rates-actions.test.ts → 6/6 PASS
npx vitest run tests/unit/finance/daily-billing-aggregation.test.ts → 25/25 PASS (스냅샷 우선 신규 케이스 포함)
최종 회귀: npx vitest run --exclude='tests/e2e/**' --exclude='tests/scratch/**' → 149/149 files · 1020/1020 tests ALL PASS
npm run build → SUCCESS (Next.js 16.2.4, TypeScript 통과)
```

### 발견 이슈 및 해결

- **통합 테스트 큐 소모 순서 변화** (`tests/integration/uat-phase3-e2e.test.ts`) — `issueTaxInvoice`의 환율 조회가 `getNumericParam` → `getExchangeRate`로 바뀌며 `zen_exchange_rates` 쿼리 1회가 result-queue를 추가 소모. TC-UAT-E2E.1이 `taxInvoice.id` null로 실패 → 큐에 `{ data: null }` 항목 추가(zen_exchange_rates 조회용)로 수정. 코드 버그 아님, 테스트 픽스처 갱신.
- **proxy.ts 화이트리스트** — `purePath.startsWith('/admin/exchange-rates')` 등록(기존 `/admin/rates`/`/admin/ups-rates` 패턴과 동일). rbac.ts `STATIC_PERMISSIONS`는 ADMIN이 `/admin` 접두로 이미 허용됨 확인(수동 보정 UI는 클라이언트에서 ADMIN/ZENITH_SUPER_ADMIN만 렌더링 + 서버 액션은 `validateAdminAction` 가드).

### 미완료 (범위 밖 / 후속)

- USD/KRW 외 통화쌍 추가 지원(§6 범위 밖)
- 장중 실시간 환율 반영(§6 범위 밖)
- `KOREAEXIM_API_KEY` 실제 발급·등록 — JSJung 액션 대기(키 수령 후 환경변수 등록 + 수동 크론 트리거 검증 필요)
- (R-10) 수동 화면 검증 — 로컬 DB 미연결 시 JSJung 수행 요청. **검증 항목**: `/admin/exchange-rates` 화면(이력/수동 보정/수집 상태), NaviSidebar `기본 정보 > 환율 관리` 네비게이션, 환율 적용 규칙(출고확정일 환율) 반영 여부. (proxy/rbac 이중 등록은 단위·통합 테스트로 검증됨 — 실제 브라우저 네비게이션 확인은 R-10 대상)

## [발견 이슈]

- 통합 테스트 픽스처 갱신: `issueTaxInvoice`의 `getExchangeRate` 도입으로 result-queue 소모 순서 변화 → TC-UAT-E2E.1에 `zen_exchange_rates` 조회용 null 항목 추가(해결).
