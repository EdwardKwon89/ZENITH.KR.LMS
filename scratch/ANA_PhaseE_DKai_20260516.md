# Phase E 사전 GitNexus 분석

> **수행**: D_Kai (OpenCode) | **검증**: Aiden (Claude)
> **분석 대상**: IMP-020 / IMP-021 / IMP-022 / IMP-054 / IMP-055 / IMP-062
> **분석일**: 2026-05-16 | **유형**: 순수 분석 (코드 수정 없음)

---

## IMP-020 — Feature Flags 캐싱

### 분석 방법

- `gitnexus_context({name: "isFeatureEnabled"})` — 호출 체인 분석

### 현황

`isFeatureEnabled()` (`src/lib/params/feature-flags.ts:14-41`) — 매 호출마다 `zen_feature_flags` 테이블 2회 쿼리 (전역 + 조직별)

**호출 지점**:
| 호출자 | 파일 | 호출 패턴 |
|:-------|:-----|:---------|
| `middleware` | `src/middleware.ts:65` | 매 요청 1회 (MAINTENANCE_MODE) |
| `OrdersPage` | `src/app/[locale]/(dashboard)/orders/page.tsx` | 페이지 로드 시 1회 |

### Blast Radius: LOW

- 현재 호출 빈도 낮음 (미들웨어 1회 + OrdersPage 1회)
- `unstable_cache()` 도입 시 `server.ts` 1개 파일만 수정

### 권장 구현 방향

```typescript
// feature-flags.ts — unstable_cache() 래핑
import { unstable_cache } from 'next/cache';

const cachedCheck = unstable_cache(
  async (key: string, orgId?: string) => { /* 기존 로직 */ },
  ['feature-flag'],
  { revalidate: 300 } // 5분 캐시
);
```

---

## IMP-021 — 미들웨어 DB 호출 최적화

### 분석 방법

- `src/middleware.ts` 소스 코드 분석 (168줄)

### 현황

`middleware.ts`가 매 요청마다 수행하는 DB 작업:

| 단계 | 작업 | 호출 비용 | 중복 여부 |
|:----|:-----|:---------:|:---------:|
| L33 | `updateSession(request)` — Supabase Auth 쿠키 갱신 + **DB 세션 조회** | 1회 | 필수 |
| L65 | `isFeatureEnabled('MAINTENANCE_MODE')` — `zen_feature_flags` 2회 쿼리 | 2회 | IMP-020 캐싱 대상 |
| L87-98 | `zen_profiles` 조회 (JOIN zen_organizations) | 1회 | 인증 경로에 필수 |

**총 DB 쿼리 수**: 매 요청 **최대 4회** (Auth 세션 + feature flags 2회 + profiles 1회)

### Blast Radius: MEDIUM

- 단일 파일(`middleware.ts`)만 수정
- `feature-flags.ts` 캐싱 시 DB 쿼리 2회 제거 → 매 요청 **2~4회 → 2회**로 감소

### 권장 구현 방향

1. **IMP-020 우선 적용**: `isFeatureEnabled('MAINTENANCE_MODE')`를 `unstable_cache()`로 캐싱
2. **JWT-only 검증**: middleware에서 DB 프로필 조회(L87-98)를 JWT `app_metadata`로 대체 가능한지 검토
3. middleware용 `createClient()`는 이미 별도(`@/utils/supabase/middleware.ts`) — 추가 최적화 불필요

---

## IMP-022 — NaviSidebar 번들 최적화

### 분석 방법

- `src/components/layout/NaviSidebar.tsx` 소스 분석

### 현황

- **파일 크기**: 10,534 bytes
- **`'use client'`** — 전체가 클라이언트 컴포넌트
- **Framer Motion**: `motion`, `AnimatePresence` 번들 포함
- **Lucide 아이콘**: 21개 아이콘 정적 import

### 블레이징 라이브러리

| 라이브러리 | 사용 컴포넌트 | 번들 영향 |
|:-----------|:-------------|:----------|
| `framer-motion` | `motion.div`, `AnimatePresence` | **HIGH** — 대형 라이브러리 |
| `lucide-react` | 21개 아이콘 | MEDIUM — tree-shaking 가능 |

### Blast Radius: LOW

- 단일 파일만 수정

### 권장 구현 방향

1. **Lucide 아이콘 dynamic import**: `import { ChevronRight } from 'lucide-react'` → `dynamic()` 래핑
2. **Framer Motion`: `motion` → CSS transition 전환 검토 (저위험, 단순 애니메이션만 사용 중)
3. **Sever Component 전환**: `'use client'`를 데이터 fetch만 분리하고 메뉴 렌더링은 Server로

---

## IMP-054 — N+1 쿼리 7곳 (B_Kai 구현 지도 필수)

### 분석 방법

- actions 파일의 `for...of` + `.map(async)` + `.forEach` 패턴 전수 검색

### N+1 쿼리 상세 목록

#### #1 — `triggerStatusChangeNotification()` — notifications.ts:91-117

| 항목 | 내용 |
|:-----|:------|
| **파일** | `src/app/actions/notifications.ts:91-117` |
| **패턴** | `for (const target of targets) { supabase.from("zen_notifications").insert(...) }` |
| **설명** | 송하인 사용자 목록(N명) 각각에 IN_APP 알림 INSERT + EMAIL 발송. 최대 2N회 DB 호출 |
| **영향** | 사용자 수 N=10 기준 20회 호출 |
| **해결** | `supabase.from("zen_notifications").insert(targets.map(...))` 단일 batch INSERT |

#### #2 — `getGlobalTrackingOverview()` — tracking.ts:188-206

| 항목 | 내용 |
|:-----|:------|
| **파일** | `src/app/actions/tracking.ts:188-206` |
| **패턴** | `(data ?? []).map(async (config) => { supabase.from("zen_tracking_events").select("*").eq("order_id", config.order_id) })` |
| **설명** | 전체 tracking config(N개) 각각에 대해 최신 tracking event 개별 조회 |
| **영향** | tracking config 100개 기준 101회 호출 |
| **해결** | 서브쿼리 또는 그래프QL 조인(`zen_tracking_configs(*, events:zen_tracking_events(*))`)으로 1회 통합 |

#### #3 — `createOrder()` 패키지 루프 — orders.ts:71-114

| 항목 | 내용 |
|:-----|:------|
| **파일** | `src/app/actions/orders.ts:71-114` |
| **패턴** | `for (const pkg of validated.packages) { supabase.from("zen_order_packages").insert(...); supabase.from("zen_order_items").insert(...) }` |
| **설명** | 패키지(N개)당 2회 INSERT. 이미 IMP-019 RPC 전환 대상 |
| **영향** | 패키지 5개 기준 10회 → 1회 RPC로 전환 가능 |
| **해결** | IMP-019 `create_order_with_items` RPC로 전환 |

#### #4 — `updateOrderStatus()` — orders.ts:357-466

| 항목 | 내용 |
|:-----|:------|
| **파일** | `src/app/actions/orders.ts:357-466` |
| **패턴** | status 변경 + history INSERT + inventory sync + settlement + notification + tracking — **6~8회 순차 호출**, 트랜잭션 없음 |
| **영향** | 단일 상태 변경에 6~8회 DB 호출 |
| **해결** | RPC 래핑 또는 Promise.all() 병렬화 (IMP-047 연계) |

#### #5 — `syncInventoryFromOrder()` 상태별 분기 — inventory.ts:140-262

| 항목 | 내용 |
|:-----|:------|
| **파일** | `src/app/actions/inventory.ts:140-262` |
| **패턴** | 상태별로 SELECT + UPDATE + history INSERT 순차 호출 |
| **영향** | 단일 호출에 3~5회 DB 쿼리 |
| **해결** | RPC 전환 또는 batch SQL |

#### #6 — `createVoc()` 중복 체인 — voc.ts:40-156

| 항목 | 내용 |
|:-----|:------|
| **파일** | `src/app/actions/voc.ts:40-156` |
| **패턴** | 오더 확인(1) + INSERT(1) + Admin 조회(1) + 알림 INSERT(N) |
| **영향** | 1+4+2N = 4+2N회 |
| **해결** | 알림 INSERT batch 처리 |

#### #7 — `getOrderDetails()` — orders.ts:312-352

| 항목 | 내용 |
|:-----|:------|
| **파일** | `src/app/actions/orders.ts:312-352` |
| **패턴** | `supabase.from("zen_orders").select("*, packages:zen_order_packages(*, items:zen_order_items(*))")`로 이미 1회 통합되어 있음 |
| **영향** | **이미 최적화됨** — 단일 그래프QL 조인 |
| **해결** | 수정 불필요 |

> **참고**: IMP-054-BK(B_Kai)는 #1~#6 중 순서대로 batch INSERT → 그래프QL 조인 → RPC 전환 적용. 가장 효과가 큰 순서는 #2(전체 tracking → 1회) → #1(batch INSERT).

---

## IMP-055 — 인덱스 누락 4종 (B_Kai 구현 지도 필수)

### 분석 방법

- migration 파일의 CREATE INDEX 문 전수 검토
- 주요 WHERE 조건·JOIN 컬럼과 인덱스 존재 여부 교차 검증

### 누락 인덱스 상세

#### #1 — `zen_profiles(org_id)`

| 항목 | 내용 |
|:-----|:------|
| **테이블** | `public.zen_profiles` |
| **컬럼** | `org_id` |
| **이유** | `notifications.ts:71-73` — `zen_profiles` WHERE `org_id = order.shipper_id`. 조직별 사용자 조회 시 Full Scan |
| **영향 쿼리** | 알림 발송, 조직 관리, 사용자 목록 |

#### #2 — `zen_voc(order_id, org_id, status)`

| 항목 | 내용 |
|:-----|:------|
| **테이블** | `public.zen_voc` |
| **컬럼** | `order_id`, `org_id`, `status` |
| **이유** | VOC 목록 조회 시 3개 컬럼 복합 조건 |
| **영향 쿼리** | `getVocList()`, Admin VOC 페이지 |

#### #3 — `zen_qna(org_id, status)`

| 항목 | 내용 |
|:-----|:------|
| **테이블** | `public.zen_qna` |
| **컬럼** | `org_id`, `status` |
| **이유** | QnA 목록 조회 시 조직별 + 상태별 필터 |
| **영향 쿼리** | `getQnaList()`, Admin QnA 페이지 |

#### #4 — `zen_invoices(shipper_id, status, created_at)`

| 항목 | 내용 |
|:-----|:------|
| **테이블** | `public.zen_invoices` |
| **컬럼** | `shipper_id`, `status`, `created_at` |
| **이유** | 인보이스 목록 조회 + 정산 쿼리에서 복합 조건 자주 사용 |
| **영향 쿼리** | `getSettlementOverview()`, InvoiceTable, 리포트 전체 |

### Blast Radius: LOW

- 신규 마이그레이션 파일 1개 생성 — 기존 파일 수정 없음
- 인덱스 추가로 인한 SELECT 성능 개선, INSERT/UPDATE에 미미한 오버헤드

### 권장 구현 방향

```sql
CREATE INDEX idx_zen_profiles_org_id ON public.zen_profiles(org_id);
CREATE INDEX idx_zen_voc_lookup ON public.zen_voc(order_id, org_id, status);
CREATE INDEX idx_zen_qna_lookup ON public.zen_qna(org_id, status);
CREATE INDEX idx_zen_invoices_lookup ON public.zen_invoices(shipper_id, status, created_at DESC);
```

---

## IMP-062 — SELECT * → 명시적 컬럼

### 분석 방법

- `grep -rn '\.select("*"*)' src/app/actions/*.ts` 전수 조사

### SELECT * 사용 파일 (112곳 중 주요 30곳)

| 파일 | SELECT * 횟수 | 위험도 |
|:-----|:------------:|:------:|
| `src/app/actions/master.ts` | **7** | 🟡 MEDIUM — 마스터 데이터 전체 조회 |
| `src/app/actions/member.ts` | 3 | 🟢 LOW |
| `src/app/actions/corporate.ts` | 2 | 🟢 LOW |
| `src/app/actions/tracking.ts` | **5** | 🟡 MEDIUM — tracking raw logs 포함 |
| `src/app/actions/inventory.ts` | 3 | 🟢 LOW |
| `src/app/actions/master-data.ts` | **5** | 🟡 MEDIUM |
| `src/app/actions/finance.ts` | 1 | 🟢 LOW |
| `src/app/actions/auth.ts` | 1 | 🟢 LOW |

### 우선순위

| 우선순위 | 파일 | 사유 |
|:--------:|:-----|:-----|
| **1순위** | `tracking.ts` | tracking raw logs(blob) SELECT * → 불필요한 대용량 데이터 전송 |
| **2순위** | `master.ts` | 7회 SELECT *, 조직/항공사/코드 데이터 |
| **3순위** | `master-data.ts` | 5회 SELECT *, ports/airlines/codes |
| **4순위** | 나머지 | 필요 시 명시적 컬럼 지정 |

### Blast Radius: HIGH (112곳, 대규모 단순 작업)

### 권장 구현 방향

1. **위험 쿼리 우선**: `tracking.ts`의 `select("*")` 5곳 — raw_logs는 JSON blob 포함
2. **정형 데이터**: `master.ts`·`master-data.ts` — 필요한 컬럼만 명시
3. **대규모 작업 특성**: 112곳 수동 교체는 누락 위험 높음 → 스크립트(`scripts/fix-select-star.ts`) 작성 권장

---

## 종합 Blast Radius 요약

| IMP | Risk | 직접 영향 | 핵심 전략 |
|:---:|:----:|:---------|:---------|
| IMP-020 | **LOW** | `feature-flags.ts` | `unstable_cache()` 1줄 추가 |
| IMP-021 | **MEDIUM** | `middleware.ts` | IMP-020 선행 시 2회 DB 절감 |
| IMP-022 | **LOW** | `NaviSidebar.tsx` | 아이콘 dynamic import |
| **IMP-054** | **HIGH** | **7곳** | **#2 tracking.ts N+1 최우선** → #1 batch INSERT |
| **IMP-055** | **LOW** | **4종 인덱스** | 신규 migration 1개 |
| IMP-062 | **HIGH** | **112곳** | 스크립트 기반 대규모 교체 |

### B_Kai/Riley 구현 지도

```
B_Kai 전용:
  IMP-054-BK: #2 tracking.ts:188-206 → 그래프QL 조인 (가장 큰 효과)
              #1 notifications.ts:91-117 → batch INSERT
  IMP-055-BK: 4종 인덱스 마이그레이션 파일 생성

Riley 전용:
  IMP-020: feature-flags.ts unstable_cache() 1줄
  IMP-021: middleware.ts (IMP-020 선행 필요)
  IMP-022: NaviSidebar dynamic import
  IMP-062: SELECT* 교체 (112곳, 스크립트 권장)
```

---

[D_Kai (OpenCode) | 2026-05-16 | 순수 분석 — 코드 수정 없음]
