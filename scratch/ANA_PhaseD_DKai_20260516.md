# Phase D 사전 GitNexus 분석

> **수행**: D_Kai (OpenCode) | **검증**: Aiden (Claude)
> **분석 대상**: IMP-014 / IMP-033 / IMP-058 / IMP-059
> **분석일**: 2026-05-16 | **유형**: 순수 분석 (코드 수정 없음)

---

## IMP-014 — admin/rates/page.tsx 531줄 분할

### 현황

- **파일**: `src/app/[locale]/(dashboard)/admin/rates/page.tsx`
- **크기**: 531줄
- **관심사 혼재**: 등록 폼 + 목록 + 할증 + 역할 분기 + 상태 관리 5개 관심사

### 현재 컴포넌트 구조 (단일 파일 내 추정)

| 구성 요소 | 역할 | 예상 줄 수 |
|:---------|:-----|:---------:|
| Page 컴포넌트 (Client, 'use client') | 데이터 fetch + 레이아웃 | ~80줄 |
| RateForm (Client) | 요율 등록/수정 폼 | ~150줄 |
| RateList / RateCardList | 등록된 요율 목록 표시 | ~120줄 |
| SurchargeSection | 할증 요금 섹션 | ~80줄 |
| RoleGuard 분기 | ADMIN/CARRIER/OPERATOR UI 분기 | ~50줄 |
| 유틸/타입/상수 | inline 정의 | ~51줄 |

### 권장 분리 파일 구조

```
src/components/admin/
├── RateForm.tsx          # 등록/수정 폼 (SurchargeEditor 포함)
├── RateCardList.tsx      # 요율 목록 (카드 테이블)
├── SurchargeEditor.tsx   # 할증 편집기 (이미 존재 — IMP-011에서 생성)
└── RatePageContainer.tsx # Page 역할 분기 + 상태 관리 (Thin wrapper)
```

### Blast Radius: LOW

**영향 파일**: `admin/rates/page.tsx` 1개만 직접 수정. `SurchargeEditor.tsx`는 이미 분리됨.

### Riley 구현 시 주의사항

1. **RateCardList.tsx는 이미 IMP-011 FEAT-RATES에서 생성되었을 가능성 높음** — 기존 파일 재활용
2. **`fetchData()`는 이미 Server Actions(`getRateCards` 등)를 경유하므로** 분리 시 동일 패턴 유지
3. re-export `index.ts` 또는 barrel 파일로 기존 import 경로 호환성 유지
4. 현재 전체가 클라이언트 컴포넌트이므로 분리 후에도 데이터 fetch는 Server Actions 경유 유지 (이미 올바르게 구현됨)

---

## IMP-033 — Server Actions 도메인 분할

### 현황

`src/app/actions/` — **23개 파일, 총 5,587줄**

### 파일 크기 순

| 파일 | 줄 수 | 위험도 | 책임 수 |
|:-----|:-----:|:------:|:-------:|
| `finance.ts` | **733** | 🔴 | 6+ (invoice/settlement/tax-invoice/report/PDF/export) |
| `orders.ts` | **691** | 🔴 | 5+ (CRUD/status/master/dissolve/notification) |
| `support.ts` | **484** | 🟡 | 3 (QnA/Notice/Faq) |
| `member.ts` | **364** | 🟡 | 4 (profile/grade/withdraw/promotion) |
| `voc.ts` | **334** | 🟡 | 2 (create/list/answer) |
| `claims.ts` | **286** | 🟢 | 3 (create/incident fee/details) |
| `master.ts` | **265** | 🟢 | 2 |
| `inventory.ts` | **263** | 🟢 | 2 |
| `wallet.ts` | **235** | 🟢 | 3 |
| `notifications.ts` | **218** | 🟢 | 4 |
| `tracking.ts` | **209** | 🟢 | 2 |
| `corporate.ts` | **187** | 🟢 | 3 |
| `customs.ts` | **185** | 🟢 | 2 |
| `routing.ts` | **170** | 🟢 | 1 |
| `rates.ts` | **170** | 🟢 | 2 |
| 기타 9개 | < 100 | 🟢 | 1 |

### 권장 분할 순서

#### 1차 분할 대상 (400줄 초과)

| 파일 | 분할 방향 | 신규 파일 |
|:-----|:---------|:---------|
| `finance.ts` (733) | → IMP-058 참조 | `finance/invoice.ts`, `finance/settlement.ts`, `finance/report.ts` 등 |
| `orders.ts` (691) | → `orders/` 디렉토리 | `orders/create.ts`, `orders/status.ts`, `orders/master.ts` |
| `support.ts` (484) | → `support/` | `support/qna.ts`, `support/notice.ts`, `support/faq.ts` |

#### 순환 참조 위험 경로

- `orders.ts` ↔ `inventory.ts`: `syncInventoryFromOrder()` 호출 관계 — 분할 시 import 순환 주의
- `finance.ts` ↔ `orders.ts`: `generateInvoicesForOrder()` 호출 — finance 분리 시 orders.ts import 유지
- `claims.ts` → `orders.ts`: `updateOrderStatus()` 경유 — 단방향 의존성이므로 안전

### Blast Radius: MEDIUM

**직접 영향**: 3개 파일 분할 = 6~8개 신규 파일 생성
**간접 영향**: actions import 경로 사용 30+개 컴포넌트 — re-export shim 필요

### Riley 구현 시 주의사항

1. **re-export shim 필수** — 기존 `from "@/app/actions/finance"` import가 깨지지 않도록 `finance/index.ts`에 re-export
2. **1차는 finance.ts만 분할** (IMP-058과 통합) → orders.ts는 2차
3. `support.ts`는 3개의 독립 도메인(QnA/Notice/Faq)으로 분할 용이

---

## IMP-058 — finance.ts 733줄 분할

### 함수 그룹별 분류

| 그룹 | 함수 | 줄 수 범위 | 비중 |
|:-----|:-----|:---------:|:----:|
| **Settlement** | `calculateSettlementAction`, `generateInvoiceAction`, `getSettlementOverview` | L81~167 | ~87줄 |
| **Invoice PDF** | `issueInvoicePdf`, `getInvoicePdfHistory` | L169~284 | ~116줄 |
| **Tax Invoice** | `issueTaxInvoice`, `sendTaxInvoiceEmail`, `updatePaymentStatus` | L41~80, L289~457 | ~208줄 |
| **Cost/Report** | `updateOrderCosts`, `getWeeklyRevenueChart` | L460~535 | ~76줄 |
| **Auto-trigger** | `generateInvoicesForOrder` | L22~39 | ~18줄 |
| **유틸/타입** | Resend 초기화, 타입 정의, import/export | L1~21, 산재 | ~228줄 |

### 권장 분리안

| 신규 파일 | 포함 함수 | 의존성 |
|:----------|:---------|:-------|
| `finance/settlement.ts` | `calculateSettlementAction`, `generateInvoiceAction`, `getSettlementOverview` | `SettlementEngine` |
| `finance/invoice.ts` | `issueInvoicePdf`, `getInvoicePdfHistory`, `generateInvoicesForOrder` | `pdf.ts` (jsPDF) |
| `finance/tax-invoice.ts` | `issueTaxInvoice`, `sendTaxInvoiceEmail`, `updatePaymentStatus` | `Resend` |
| `finance/report.ts` | `updateOrderCosts`, `getWeeklyRevenueChart` | 독립 |
| `finance/index.ts` | re-export | 위 4개 파일 |

### 공유 의존성

| 의존성 | 사용처 | 분리 시 처리 |
|:-------|:-------|:------------|
| `validateAdminAction` | 모든 함수 | 각 파일에서 개별 import — 문제 없음 |
| `createClient()` | 모든 함수 | IMP-059로 통합 해결 |
| `SettlementEngine` | `settlement.ts`만 | 자연스러운 격리 |
| `Resend` 인스턴스 | `tax-invoice.ts`만 | 자연스러운 격리 |
| `console.log` | 모든 함수 | IMP-013 logger로 대체 필요 |

### Blast Radius: MEDIUM

**직접 파일**: `finance.ts` 1개 → 5개 파일
**import 영향**: `from "@/app/actions/finance"` 참조 10+개 컴포넌트 — shim 필요

---

## IMP-059 — Supabase 클라이언트 중복 제거

### `createClient()` 호출 현황 (서버 + 클라이언트)

**서버 사이드 정의**: `src/utils/supabase/server.ts:3-29`
**클라이언트 사이드 정의**: `src/utils/supabase/client.ts`

**총 26개 호출 지점** (서버 22 + 클라이언트 4)

#### 서버 사이드 (22개)

| 카테고리 | 호출 지점 | 호출 수 |
|:---------|:---------|:-------:|
| **Auth guards** | `requireAuth`, `requireAdmin`, `validateAdminAction`, `validateUserAction` | 4 |
| **Params** | `updateSystemParam`, `isFeatureEnabled` | 2 |
| **Actions** | `findUserId`, `sendPasswordReset`, `getUserSession` (auth.ts), `logClientError` (monitoring.ts), `getVesselSchedules` (schedules.ts), `updateRolePermissions` (rbac.ts) | 6 |
| **Notifications** | `triggerStatusChangeNotification`, `getNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `sendInAppNotification` | 5 |
| **Pages** | `DashboardGroupLayout` (layout.tsx), `PermissionsPage` (admin/permissions), `login`/`signup` (login/actions.ts) | 4 |
| **API routes** | `GET` (api/finance/export) | 1 |

#### 클라이언트 사이드 (4개, `@/utils/supabase/client` 사용)

| 카테고리 | 호출 지점 |
|:---------|:---------|
| **Admin UI** | `organizations-client.tsx` |
| **Auth UI** | `LogoutButton.tsx` |
| **Inventory** | `InventoryScanner.tsx` |
| **Hook** | `useAuth.ts` |

**중복 패턴**:
- `validateUserAction()` 내부 `createClient()` + 서버 액션 자체 `createClient()` = **2중 생성**
- `requireAdmin()` 내부 `createClient()` + 페이지 컴포넌트 `createClient()` = **2중 생성**
- DashboardGroupLayout → 하위 Server Component들 각각 `createClient()` = **N중 생성**

### 통합 가능 범위

| 방안 | 설명 | 공수 | 위험도 | 적용 대상 |
|:-----|:-----|:----:|:------:|:---------|
| `React.cache()` 래핑 | `createClient()`를 `React.cache()`로 감싸기 | 0.1 MD | 🟢 LOW | 서버 사이드 22개 |
| Request-scoped 싱글톤 | `asyncLocalStorage` 또는 request 전달 | 1 MD | 🟡 MEDIUM | 서버 사이드 |
| `createClient()` 게으른 초기화 | flags.ts 패턴처럼 최초 호출 시 생성 | 0.1 MD | 🟢 LOW | 서버 사이드 |

### Blast Radius: HIGH (서버 22개 + 클라이언트 4개)

`React.cache()` 방식이 가장 안전 — `server.ts` 1개 파일만 수정으로 서버 22개 호출受益.

### Riley 구현 시 주의사항

1. **`React.cache()`로 `createClient()` 래핑**이 최적 — `server.ts` 1개 파일만 수정, 0.1 MD
2. 단, `React.cache()`는 **서버 사이드 전용** — 클라이언트 사이드 4개 호출은 `@/utils/supabase/client`를 사용하므로 범위 외
3. middleware.ts도 `React.cache()` 사용 불가 (Edge Runtime) — middleware용 `createClient()`는 별도 유지
4. guards.ts(`requireAuth`, `validateUserAction` 등)가 가장 많은 중복 생성 유발 — 서버 액션 내 guards 호출 + 액션 자체 createClient = 2중 생성 해소

---

## 종합 Blast Radius 요약

| IMP | Risk | 직접 영향 | 핵심 전략 |
|:---:|:----:|:---------|:---------|
| IMP-014 | **LOW** | `page.tsx` 1개 | 단순 컴포넌트 추출 (RateForm/RateCardList) |
| IMP-033 | **MEDIUM** | 3개 파일 → 6~9개 | 1차 finance(IMP-058), 2차 orders, 3차 support |
| IMP-058 | **MEDIUM** | 1개 → 5개 | settlement/invoice/tax-invoice/report 분할 |
| IMP-059 | **HIGH** | `server.ts` 1개 | `React.cache()` 1줄로 서버 22개 호출 최적화 |

### 구현 순서 권장

```
IMP-059(1줄, 0.1MD) → 가장 빠른 성능 개선, 선행 필수
                    → IMP-033 D1(선행 분할) + IMP-058(분할안 적용)
                    → IMP-014(LOW, 막바지)
```

> `IMP-033`과 `IMP-058`은 긴밀히 연계 — **동시 구현** 권장. `finance.ts` 분할이 `orders.ts` 분할보다 영향도 낮으므로 finance 선행.

---

[D_Kai (OpenCode) | 2026-05-16 | 순수 분석 — 코드 수정 없음]
