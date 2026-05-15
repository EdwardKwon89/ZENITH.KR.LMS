# Phase C 사전 GitNexus 분석

> **수행**: D_Kai (OpenCode) | **검증**: Aiden (Claude)
> **분석 대상**: IMP-013 / IMP-025 / IMP-045 / IMP-051 / IMP-056
> **분석일**: 2026-05-15 | **유형**: 순수 분석 (코드 수정 없음)

---

## IMP-013 — console→logger 교체 (53개 파일)

### 분석 방법

- `gitnexus_query({query: "console.log console.error console.warn"})` — 실행 흐름 매핑
- `grep -r "console\." src/` — 전체 사용 현황 카운트

### 현황

**총 156개 console 호출**, 53개+ 파일에 산재

### 사용 패턴 분류

| 패턴 | 파일 예시 | 호출 수 | 교체 우선순위 |
|:-----|:---------|:-------:|:------------:|
| **DEBUG 전용** (프로덕션 불필요) | `voc.ts` (18개), `middleware.ts` (10개), `finance.ts` (20개) | ~60 | **HIGH** |
| **에러 로깅** (console.error) | `orders.ts` (8개), `member.ts` (7개), `corporate.ts` (6개) | ~50 | **MEDIUM** |
| **경고** (console.warn) | `middleware.ts`, `member.ts`, `inventory.ts`, `email.ts` | ~5 | **LOW** |
| **정보 로깅** (console.log) | `api/export/route.ts` (13개), `login/actions.ts` (9개) | ~41 | **MEDIUM** |

### 위험 그룹 (서버 액션)

| 파일 | console 호출 수 | 위험도 |
|:-----|:--------------:|:------:|
| `finance.ts` | 20+ | HIGH — 정산 금액 노출 |
| `voc.ts` | 18+ | HIGH — DEBUG 문자열로 payload 전체 노출 |
| `middleware.ts` | 10+ | HIGH — 모든 요청 경로 stdout 출력 |
| `orders.ts` | 8 | MEDIUM — 에러 메시지 |
| `member.ts` | 8 | LOW |
| `api/export/route.ts` | 13 | MEDIUM — 데이터 샘플 노출 |
| `login/actions.ts` | 9 | MEDIUM — 인증 디버그 정보 |

### Blast Radius: HIGH

**직접 영향 파일**: 53개 파일 전역 (actions/*.ts, components/*.tsx, lib/*.ts, middleware.ts)

### Riley 구현 시 주의사항

1. **`logger.ts` 신규 생성** — `src/lib/logger.ts`에 레벨(log/info/warn/error)별 함수 정의. `pino` 또는 `next-logger` 사용 여부 Aiden 결정 필요
2. **교체 순서**: middleware.ts(가장 위험) → voc.ts(디버그 과잉) → finance.ts(금융 정보) → 나머지 순
3. **console.log vs console.error 구분 유지** — error는 logger.error, log는 logger.info로 매핑
4. **NODE_ENV 조건부 분기** — production에서는 debug 레벨 자동 억제

---

## IMP-025 — Server Actions 에러 래퍼

### 분석 방법

- `gitnexus_query({query: "Server Actions try catch error handling"})` — 실행 흐름
- `gitnexus_query({query: "actions error handling"})` — 패턴 분석

### 현황

현재 3가지 상이한 에러 처리 패턴 혼재:

| 패턴 | 사용 파일 | 비율 | 문제 |
|:-----|:---------|:----:|:-----|
| **throw 직접** | `auth.ts`, `orders.ts`, `inventory.ts` | ~40% | 클라이언트에서 raw error 표시 |
| **try-catch + console.error** | `finance.ts`, `member.ts`, `corporate.ts`, `customs.ts` | ~35% | 에러를 console에만 기록, 사용자 피드백 없음 |
| **try-catch + throw** | `voc.ts`, `support.ts` | ~15% | console은 없으나 에러 타입 미표준화 |
| **silent continue** | `orders.ts:89-111` | ~10% | **최악** — 실패 무시하고 계속 진행 |

### Blast Radius: MEDIUM

**직접 영향**: `src/app/actions/*.ts` (18개 파일), `src/lib/auth/guards.ts`

**에러 래퍼가 없는 주요 서버 액션**:

| 액션 | 파일 | 현재 처리 | 위험도 |
|:-----|:-----|:---------|:------:|
| `createOrder()` | `orders.ts` | throw + silent continue | HIGH |
| `updateOrder()` | `orders.ts` | throw | MEDIUM |
| `calculateSettlementAction()` | `finance.ts` | console.log | HIGH |
| `issueTaxInvoice()` | `finance.ts` | console.log + throw | MEDIUM |
| `createClaim()` | `claims.ts` | throw | MEDIUM |
| `createVoc()` | `voc.ts` | console.log + throw | HIGH |

### Riley 구현 시 주의사항

1. **`Result<T, E>` 패턴 도입** — B_Kai IMP-PLAN 제안과 동일. `src/lib/actions/action-wrapper.ts` 신규
2. **에러 타입 표준화**: `ValidationError`, `AuthError`, `NotFoundError`, `BusinessError` 최소 4종
3. **console.error를 Result 실패에 통합** — IMP-013 logger와 연계 (IMP-013 완료 후 IMP-025 착수)
4. **silent continue 제거 최우선** (`orders.ts:89-111`) — 패키지/아이템 INSERT 실패 무시 코드

---

## IMP-045 — 무제한 리스트 페이지네이션 (18곳)

### 분석 방법

- `gitnexus_query({query: "pagination limit offset range list"})` — 서버 액션 리스트

### 현황

페이지네이션이 없는 주요 조회 함수:

| 함수 | 파일 | 조인 규모 | 영향 테이블 |
|:-----|:-----|:--------:|:-----------|
| `getMasterOrders()` | `orders.ts` | 3+ 테이블 | zen_orders (master) |
| `getDeclarations()` | `customs.ts` | 4 테이블 | zen_customs_declarations |
| `getVocList()` | `voc.ts` | 3 테이블 | zen_voc |
| `getQnaList()` | `support.ts` | 2 테이블 | zen_qna |
| `getNoticeList()` | `support.ts` | 1 테이블 | zen_notices |
| `getNotifications()` | `notifications.ts` | 2 테이블 | zen_notifications |
| `getInvoicePdfHistory()` | `finance.ts` | 2 테이블 | zen_invoice_pdf_history |
| `getSettlementOverview()` | `finance.ts` | 4+ 테이블 | zen_invoices + zen_order_costs |
| `getTransportCosts()` | `statistics.ts` | 3 테이블 | zen_order_costs |
| `getCostProfitStats()` | `statistics.ts` | 5+ 테이블 | 집계 쿼리 |
| `getRevenueReport()` | `statistics.ts` | 5+ 테이블 | 집계 쿼리 |
| `getCostReport()` | `statistics.ts` | 5+ 테이블 | 집계 쿼리 |
| `getVesselSchedules()` | `schedules.ts` | 2 테이블 | zen_vessel_schedules |
| `getClaims()` | `claims.ts` | 5 테이블 (중첩 조인) | zen_claims + zen_orders + zen_invoices |
| `getWalletTransactions()` | `wallet.ts` | 2 테이블 | zen_wallet_transactions |
| `getErrorLogs()` | `monitoring.ts` | 1 테이블 | zen_error_logs |
| `getTrackingRawLogs()` | `tracking.ts` | 1 테이블 | zen_tracking_logs |
| `getPendingHouseOrders()` | `orders.ts` | 2 테이블 | zen_orders |

### Blast Radius: MEDIUM

**직접 영향 파일**: 8개 액션 파일

### Riley 구현 시 주의사항

1. **`getClaims()` 최우선** — 5개 테이블 중첩 조인, Supabase `max_rows = 1000`이 유일한 방어
2. **`getMasterOrders()` + `getDeclarations()` 차순위** — 사용자 빈도 높음
3. **통계 쿼리 4종(`getCostProfitStats`, `getRevenueReport`, `getCostReport`, `getTransportCosts`)** — 페이지네이션보다 `.count('exact')`로 전체 집계 후 불필요한 데이터 제한 권장
4. **모든 함수에 `page`, `pageSize` 파라미터 추가** + `.range((page-1)*pageSize, page*pageSize-1)` 적용

---

## IMP-051 — 감사 추적 (마스터/인보이스/통관)

### 분석 방법

- `gitnexus_query({query: "audit log history master invoice customs"})` — 감사 추적 현황
- `gitnexus_impact({target: "issueInvoicePdf", direction: "upstream"})` — 인보이스 PDF 발행

### 현황

| 영역 | 상태 | 이력 테이블 | 위험도 |
|:-----|:----:|:-----------|:------:|
| 오더 상태 변경 | ✅ 있음 | `order_status_history` | LOW |
| 마스터 오더 상태 변경 | ❌ **없음** | `remarks` 필드에만 기록 | **HIGH** |
| 인보이스 상태 변경 (UNPAID→PAID/OVERDUE) | ❌ **없음** | `updated_at`만 갱신 | **HIGH** |
| 통관 상태 변경 | ❌ **없음** | 이력 테이블 없음 | **HIGH** |
| PDF 발행 이력 | ✅ 있음 | `zen_invoice_pdf_history` | LOW |
| 사용자 접근 로그 | ❌ 없음 | 없음 | MEDIUM |

### Blast Radius: HIGH

**`issueInvoicePdf()` 직접 호출자** (d=1):
- `InvoiceTable.tsx:handleIssuePdf` (Finance)
- `admin/InvoiceTable.tsx:handleIssuePdf` (Admin)
- `uat-phase3-e2e.test.ts` (테스트)

**간접 영향** (d=2~3):
- `FinanceDashboardPage` (6개 실행 흐름)
- `SettlementPage` (4개 실행 흐름)

### Riley 구현 시 주의사항

1. **`zen_master_order_history` 테이블 신규 생성** — `updateMasterOrderStatus()` 변경 시 이력 INSERT
2. **`zen_invoice_history` 테이블 신규 생성** — 인보이스 status 변경 시 트리거 또는 서버 코드 INSERT
3. **통관 이력** — `customs.ts` 내 `updateDeclarationStatus()`에 이력 INSERT 추가
4. **IMP-019(createOrder RPC)과 동시 구현 권장** — 트랜잭션 내 이력 기록이 더 안전

---

## IMP-056 — 이메일 HTML 인젝션 방지

### 분석 방법

- `gitnexus_query({query: "email template html sendEmail"})` — 이메일 발송 경로
- 소스 코드 직접 검증 (HTML 템플릿 내 사용자 입력 삽입 여부)

### 이메일 발송 경로

| 경로 | 파일 | 템플릿 유형 | 외부 입력 | 위험도 |
|:-----|:-----|:-----------|:---------|:------:|
| `sendStatusChangeEmail()` | `email.ts:21-46` | 인라인 HTML | `orderNo`(시스템 생성), `label`(상수) | **LOW** |
| `sendTaxInvoiceEmail()` | `finance.ts:394-457` | 인라인 HTML | `tx.tax_invoice_no`(시스템 생성), `tx.total_amount`(DB), `tx.currency`(DB) | **MEDIUM** |

**상세 분석**:

1. **`email.ts`**: `${orderNo}`는 시스템 생성(order_no), `${label}`은 `STATUS_LABELS` 상수 — 인젝션 위험 낮음
2. **`finance.ts:418-429`**: `${tx.tax_invoice_no}` 및 `${tx.total_amount}`가 DB에서 조회되어 HTML에 직접 삽입. DB 값이 사용자 입력을 통해 오염될 가능성 존재 (특히 `sendTaxInvoiceEmail`이 ADMIN 전용이지만 DB 오염 경로는 다수)

### Blast Radius: LOW

**직접 영향 파일**: `email.ts`, `finance.ts`

### Riley 구현 시 주의사항

1. **현재 위험은 낮지만 예방 조치 권장** — `escapeHtml()` 유틸 함수를 `src/lib/utils/sanitize.ts`에 추가
2. **이메일 템플릿에 적용**: `sendTaxInvoiceEmail()`의 `${tx.*}` 값을 `escapeHtml()`로 감싸기
3. **향후 새 이메일 템플릿 추가 시 규칙으로 강제** — 리뷰 체크리스트에 "escapeHtml 처리" 항목 추가

---

## 종합 Blast Radius 요약

| IMP | Risk | 직접 영향 파일 | 주요 발견 |
|:---:|:----:|:-------------|:---------|
| IMP-013 | **HIGH** | 53개 파일, 156개 호출 | DEBUG 문자열로 payload 노출 (voc.ts), 모든 요청 경로 stdout (middleware.ts) |
| IMP-025 | **MEDIUM** | 18개 액션 파일 | 3가지 이질적 패턴 혼재, silent continue 최악 |
| IMP-045 | **MEDIUM** | 8개 파일, 18개 함수 | 5중첩 조인(getClaims)에 max_rows만이 유일한 방어 |
| IMP-051 | **HIGH** | 3개 영역 (master/invoice/customs) | 마스터·인보이스·통관 상태 변경 이력 테이블 부재 |
| IMP-056 | **LOW** | 2개 파일 | 현재 위험 낮으나 예방 조치 권장 |

### 구현 순서 권장

```
IMP-013(1차: middleware + voc) → IMP-025(Result<T,E> 패턴)
                                    → IMP-045(18곳 페이지네이션) ← 병렬 가능
IMP-051(3개 이력 테이블) ← 병렬 가능
IMP-056(escapeHtml 2줄) ← IMP-013과 병행 가능
```

---

[D_Kai (OpenCode) | 2026-05-15 | 순수 분석 — 코드 수정 없음]
