# Phase F 사전 GitNexus 분석

> **수행**: D_Kai (OpenCode) | **검증**: Aiden (Claude)
> **분석 대상**: IMP-012 / IMP-017 / IMP-023 / IMP-024 / IMP-029 / IMP-049 / IMP-060 / IMP-061 / IMP-063
> **분석일**: 2026-05-16 | **유형**: 순수 분석 (코드 수정 없음)

---

## IMP-012 — Master/Admin 코드 중복 — 공통 컴포넌트 추출

### 분석 방법

- `diff` 명령으로 master/codes-codes-client.tsx vs admin/codes-codes-client.tsx 비교
- `grep`으로 master.ts 내 `payload: any` 패턴 분석

### 현황

**두 파일 MD5 완전 일치** — `diff` 출력 0줄. 동일 UI가 `/master/codes/`와 `/admin/codes/` 두 경로에 중복 존재.

| 파일 | 경로 | 라인 수 |
|:-----|:-----|:-------:|
| `codes-client.tsx` (admin) | `src/app/[locale]/(dashboard)/admin/codes/codes-client.tsx` | ~250 (추정) |
| `codes-client.tsx` (master) | `src/app/[locale]/(dashboard)/master/codes/codes-client.tsx` | ~250 (추정) |

서버 액션 중복 (`master.ts` vs `master-data.ts`):

| 함수 | master.ts | master-data.ts |
|:-----|:---------|:--------------|
| `getPorts()` | L50-60 (`zen_ports`) | — |
| `upsertPort(payload: any)` | L65-78 (`payload: any`) | — |
| `getNations()` | L83-93 (`zen_nations`) | — |
| `getOrganizations()` | L98-108 (`zen_organizations`) | — |
| `getAirlines()` | L113-125 (`zen_organizations`) | — |
| `getCodeGroups()` | L128-136 (`common_code_groups`) | — |
| `getCommonCodes()` | L142-153 (`common_codes`) | — |
| `getCommonCodesByGroup()` | L160-172 (`common_codes`) | L138-140 (`common_codes`) |
| `upsertCommonCode(payload: any)` | L177-190 (`payload: any`) | L121-136 (구체적 타입) |
| `deleteCommonCode()` | L215-228 | L145-157 |

### Blast Radius: LOW

- codes-client.tsx 2개 → 1개 공통 + 2개 wrapper로 축소
- master.ts `payload: any` → Zod 스키마로 교체 (IMP-067 연계)
- 단일 파일 리팩토링, 서비스 로직 변경 없음

### 수정 대상

1. **`admin/codes/codes-client.tsx`** — 공통 컴포넌트로 추출
2. **`master/codes/codes-client.tsx`** — 공통 컴포넌트 호출로 전환
3. **`master.ts`** — `upsertPort(payload: any)` L65-L78, `upsertCommonCode(payload: any)` L177-L190 타입 지정

### 리스크

- 두 UI 파일이 이후 개별 수정되었다면 diff 무효 — `git log --follow`로 분기 이력 확인 필요
- 서버 액션은 함수 시그니처 통일 시 기존 호출자(caller) 영향 없음
- `revalidatePath` 경로 상이 (admin vs master) — wrapper에서 각각 처리

### 구현 가이드

1. `src/components/admin/CommonCodeManager.tsx` 신규 생성 — codes-client.tsx 본체를 이관
2. admin/codes-client.tsx → `import { CommonCodeManager } from '@/components/admin/CommonCodeManager'`
3. master/codes-client.tsx → 동일 import + `revalidatePath`만 `/master/codes`로 오버라이드
4. master.ts `upsertPort`, `upsertCommonCode` → `payload`에 Zod 스키마 적용 (IMP-067과 통합)

---

## IMP-017 — Error Boundary 4개 추가

### 분석 방법

- Glob search `**/error.tsx` → 1개만 존재 확인
- `src/app/[locale]/(dashboard)/error.tsx` 소스 분석

### 현황

**현재 Error Boundary 현황**:

| 경로 | 파일 | 상태 |
|:-----|:-----|:----:|
| `(dashboard)/error.tsx` | `/src/app/[locale]/(dashboard)/error.tsx` | ✅ 존재 |
| `(auth)/error.tsx` | — | ❌ 없음 |
| `admin/error.tsx` | — | ❌ 없음 |
| `master/error.tsx` | — | ❌ 없음 |
| `orders/[orderId]/error.tsx` | — | ❌ 없음 |

기존 `error.tsx` 패턴 (`(dashboard)/error.tsx:1-37`):
- `"use client"` + `Sentry.captureException()` + `logClientError()` + `ZenErrorView`
- 총 37줄, 단순하고 일관된 구조

### Blast Radius: LOW

- 신규 파일 4개 생성만 필요 — 기존 파일 수정 없음
- `ZenErrorView` 이미 존재 (`src/components/ui/ZenErrorView.tsx`)
- 37줄 boilerplate 복사 + 경로별 재검증 경로만 커스터마이징

### 수정 대상

| # | 신규 파일 | 중복 패턴 |
|:-:|:---------|:----------|
| 1 | `src/app/[locale]/(auth)/error.tsx` | `(dashboard)/error.tsx`와 동일 |
| 2 | `src/app/[locale]/(dashboard)/admin/error.tsx` | 동일 |
| 3 | `src/app/[locale]/(dashboard)/master/error.tsx` | 동일 |
| 4 | `src/app/[locale]/(dashboard)/orders/[orderId]/error.tsx` | 동일 |

### 리스크: LOW

- Error Boundary는 Next.js `error.tsx` 컨벤션만 따르면 OK
- `ZenErrorView` props 변경 시 4개 파일 동기화 필요

### 구현 가이드

```typescript
// 신규 error.tsx boilerplate (각 경로 1개씩)
"use client";
import React, { useEffect } from 'react';
import * as Sentry from "@sentry/nextjs";
import { ZenErrorView } from '@/components/ui/ZenErrorView';
import { logClientError } from '@/app/actions/monitoring';

export default function SegmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
    logClientError({ message: error.message, stack: error.stack, url: window.location.href, severity: "ERROR", error_type: "CLIENT" });
    console.error("Segment Runtime Error:", error);
  }, [error]);

  return <ZenErrorView error={error} reset={reset} />;
}
```

---

## IMP-023 — i18n 번역 키 타입 안정성

### 분석 방법

- `src/i18n/routing.ts` — `defineRouting` 설정 확인
- messages/ 디렉토리 구조 확인
- `useTranslations()` 호출 패턴 분석

### 현황

**현재 설정**:
- `src/i18n/routing.ts:4-9` — `defineRouting`으로 `['ko', 'en', 'zh', 'ja']` 4개 로케일 정의
- `createNavigation(routing)` — Link, redirect, usePathname, useRouter, getPathname 생성
- **타입 안전성**: `next-intl` v3.x는 `createNavigation()`에서 `AppPathnames` 제네릭을 통해 타입 안전 제공 가능하나 미적용
- **번역 키**: `useTranslations('key')` 호출 시 문자열만 허용 — 존재하지 않는 키도 컴파일 통과

**시그니처**(i18n/routing.ts):
```typescript
export const routing = defineRouting({
  locales: ['ko', 'en', 'zh', 'ja'],
  defaultLocale: 'ko'
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

### Blast Radius: MEDIUM

- `global.d.ts` 신규 생성 + 메시지 타입 생성 스크립트 필요
- `next-intl` 설정 변경 (타입 안전 pathnames 추가)
- 번역 키 누락 감사 스크립트 (`scripts/audit-i18n.ts`)는 IMP-032와 중첩

### 수정 대상

| 파일 | 작업 | 위험도 |
|:-----|:-----|:------:|
| `src/i18n/routing.ts` | `createNavigation`에 타입 파라미터 추가 | LOW |
| `src/global.d.ts` (신규) | `@/messages/ko.json` 타입 선언 | LOW |
| `messages/*.json` | 타입 생성 대상 — 수정 없음 | 없음 |

### 리스크

- 타입 안전성은 컴파일 타임에만 영향, 런타임 동작 변경 없음
- 번역 키 스키마 변경 시 모든 `useTranslations()` 호출 타입 체크 실패 — 이는 장점(조기 발견)

### 구현 가이드

1. `src/i18n/routing.ts` — `createNavigation<AppPathnames>()` 적용:
```typescript
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// AppPathnames 타입 정의 (모든 경로 + 파라미터)
type AppPathnames = {
  '/': {};
  '/orders': {};
  '/orders/[orderId]': { orderId: string };
  '/mypage/profile': {};
  '/admin/settings': {};
  // ... 모든 라우트 전수 등록
};

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation<{ locales: typeof routing.locales; pathnames: AppPathnames }>();
```

2. `src/global.d.ts` (신규) — `next-intl` 메시지 타입 선언:
```typescript
import ko from '@/messages/ko.json';
type Messages = typeof ko;
declare global {
  interface IntlMessages extends Messages {}
}
```

---

## IMP-024 — 공통 UI 컴포넌트 라이브러리화

### 분석 방법

- `src/components/domain/` 존재 여부 확인 → **없음**
- `ORDER_STATUS_META`, currency 포맷 등 반복 패턴 전수 검색
- `ZenBadge` 사용 패턴 분석

### 현황

**부재 상태**:
- `src/components/domain/` 디렉토리 없음
- `ORDER_STATUS_META` (`src/types/orders.ts:26-39`) — 상태 라벨+색상이 한글 하드코딩
- 통화 표시기, 상태 배지 등이 각 컴포넌트에서 개별 구현
- `ZenBadge` (`ZenUI.tsx:138-166`)는 존재하나 비즈니스 상태와 연결되지 않음

**ORDER_STATUS_META** (`orders.ts:26-39`):
```typescript
export const ORDER_STATUS_META = {
  [OrderStatus.REGISTERED]: { label: '접수', color: 'bg-blue-100 text-blue-800', description: '오더가 신규 등록됨' },
  // ... 10개 상태 모두 한글 하드코딩
};
```

### Blast Radius: LOW

- 신규 파일 3~5개 생성만 필요
- 기존 import 경로 변경 없거나 최소화 (`@/components/ui/ZenUI` barrel export 유지)

### 수정 대상

| 컴포넌트 | 제안 경로 | 설명 |
|:---------|:---------|:-----|
| `ZenStatusBadge` | `src/components/domain/ZenStatusBadge.tsx` | `ORDER_STATUS_META` 기반 상태 배지 |
| `CurrencyDisplay` | `src/components/domain/CurrencyDisplay.tsx` | 통화 포맷 + 환율 표시 |
| `OrganizationBadge` | `src/components/domain/OrganizationBadge.tsx` | 조직 타입+상태 배지 |
| `DateDisplay` | `src/components/domain/DateDisplay.tsx` | 로케일 기반 날짜 포맷 |

### 리스크: LOW

- 신규 파일 생성만 — 기존 코드 수정 없음
- 기존 `ORDER_STATUS_META`는 계속 유효, 새 `ZenStatusBadge`가 내부에서 참조

### 구현 가이드

1. `src/components/domain/` 디렉토리 생성
2. `ZenStatusBadge.tsx`:
```typescript
import { ORDER_STATUS_META, OrderStatus } from '@/types/orders';
import { ZenBadge } from '@/components/ui/ZenUI';

export function ZenStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return <ZenBadge className={meta.color}>{meta.label}</ZenBadge>;
}
```
3. `CurrencyDisplay.tsx` — `NumberFormat` 래퍼, locale 기반 통화 표시
4. 기존 컴포넌트의 인라인 `ORDER_STATUS_META` 호출을 `ZenStatusBadge`로 단계적 교체

---

## IMP-029 — TS 타입 안전성 (`any` 퇴출)

### 분석 방법

- `grep`으로 `src/app/actions/` 내 `: any` 전수 검색 — **35곳**
- `src/types/claims.ts`의 `ClaimDetail` 인터페이스 분석
- `src/lib/finance/settlement.ts`의 `order: any` 분석

### 현황

**35곳** `: any` 분포:

| 파일 | any 사용 횟수 | 위험도 |
|:-----|:------------:|:------:|
| `master.ts` | **5** | MEDIUM — `supabase: any`, `payload: any` |
| `finance.ts` | **5** | MEDIUM — `c: any`, `item: any`, `error: any` |
| `claims.ts` | **1** | HIGH — `updateData: any` |
| `orders.ts` | **1** | MEDIUM — `newItems: any[]` |
| `member.ts` | **2** | LOW — `catch(err: any)` 패턴 |
| `support.ts` | **5** | MEDIUM — `item: any`, `data: any`, `ans: any` |
| `notifications.ts` | **1** | LOW — `providedSupabase?: any` |
| `tracking.ts` | **1** | LOW — `catch(error: any)` |
| `inventory.ts` | **2** | MEDIUM — `updatePayload: any`, `historyPayload: any` |
| `voc.ts` | **2** | MEDIUM — `item: any`, `ans: any` |
| `dashboard.ts` | **1** | LOW — `(o: any)` |
| `rates.ts` | **3** | MEDIUM — `card: any`, `tiers: any[]`, `surcharges: any[]` |
| `schedules.ts` | **1** | MEDIUM — `payload: any` |
| `customs.ts` | **2** | MEDIUM — `item: any`, `updatePayload: any` |
| `routing.ts` | **2** | LOW — `opt: any`, `milestones: any[]` |

**핵심 타입 정의 문제** (`src/types/claims.ts:35-38`):
```typescript
export interface ClaimDetail extends Claim {
  order: any; // Detailed order info — 주석만 있고 타입 없음
  incident_fees: IncidentFee[];
}
```

**Settlement 타입 문제** (`src/lib/finance/settlement.ts:153`):
```typescript
private async calculateChargeableWeight(order: any) { ... }
```

**Order 타입 문제** (`src/types/orders.ts:62`):
```typescript
cargo_details?: any;
```

### Blast Radius: HIGH (35곳)

- 서버 액션 전반에 산재 — 각 파일의 맵핑 콜백에서 주로 사용
- `order: any` → 실제 `Database['public']['Tables']['zen_orders']['Row']` 타입으로 교체 필요
- `payload: any` → Zod 스키마 도입 필요 (IMP-067 연계)

### 수정 대상 — 우선순위

| 우선순위 | 위치 | 라인 | 현재 | 대상 타입 |
|:--------:|:-----|:----:|:-----|:---------|
| **1** | `types/claims.ts` | 36 | `order: any` | `Database['public']['Tables']['zen_orders']['Row']` |
| **2** | `types/orders.ts` | 62 | `cargo_details?: any` | `Json` 또는 구체적 인터페이스 |
| **3** | `lib/finance/settlement.ts` | 153 | `order: any` | `ZenOrderRow` 또는 Dedicated 타입 |
| **4** | `actions/rates.ts` | 12-14 | `card: any; tiers: any[]; surcharges: any[]` | `RateCardRow`, `RateSlabRow[]` 등 |
| **5** | `actions/master.ts` | 13, 35 | `supabase: any` | `SupabaseClient<Database>` |
| **6** | `actions/master.ts` | 66, 179, 197 | `payload: any` | 구체적 Zod 스키마 |
| **7** | `actions/*.ts` map | 맵핑 콜백 | `(item: any)` | 각 테이블 Row 타입 |
| **8** | `actions/*.ts` catch | 5곳 | `catch(err: any)` | `unknown` → `instanceof Error` |

### 리스크

- `any` → 구체적 타입 변경 시 기존 코드의 암묵적 속성 접근이 컴파일 에러 발생 가능
- 특히 `(item: any).xxx` 패턴을 제네릭으로 교체 시 타입 체크 실패 다수 예상
- `supabase: any`는 `createClient()` 반환 타입이 복잡하여 `SupabaseClient<Database>` 명시 필요

### 구현 가이드

1. **ClaimDetail** (`types/claims.ts:36`):
```typescript
import { Database } from './supabase';
type ZenOrder = Database['public']['Tables']['zen_orders']['Row'];
export interface ClaimDetail extends Claim {
  order: Pick<ZenOrder, 'id' | 'order_no' | 'status' | 'shipper_id' | 'origin_port_id' | 'dest_port_id'>;
  incident_fees: IncidentFee[];
}
```

2. **orders.ts** (`cargo_details?: any` → `cargo_details?: Json`):
```typescript
import { Json } from './supabase';
// ...
cargo_details?: Json;
```

3. **actions/rates.ts** 타입:
```typescript
import { Database } from '@/types/supabase';
type RateCard = Database['public']['Tables']['rate_cards']['Row'];
type RateSlab = Database['public']['Tables']['rate_slabs']['Row'];
```

4. **catch(err: any)** 5곳 → `unknown` + 타입 가드:
```typescript
catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error("[ACTION] Error:", message);
}
```

---

## IMP-049 — 이중 프로필 테이블 정리

### 분석 방법

- `gitnexus_query`로 `profiles` vs `zen_profiles` 사용 패턴 분석
- `grep`으로 `.from("profiles")` vs `.from("zen_profiles")` 전수 검색
- `getCurrentUserAffiliation()` (`master.ts:235-265`) 병합 로직 분석

### 현황

**두 테이블 공존으로 인한 복잡도**:

| 테이블 | 참조 파일 수 | 주요 사용처 |
|:-------|:-----------:|:-----------|
| `profiles` | 4 | `member.ts:82,140,316`, `support.ts:102` |
| `zen_profiles` | **13** | `member.ts:74,133,191,350`, `guards.ts:19,40,68,100`, `voc.ts:116`, `auth.ts:93`, `notifications.ts:71`, `finance-export/route.ts:28,84` |

**이중 업데이트 패턴** (`member.ts:70-91`):
1. L73-78: `zen_profiles` UPDATE
2. L81-87: `profiles` UPDATE (동기화)
```typescript
// zen_profiles 업데이트
await supabase.from("zen_profiles").update({ full_name: payload.fullName }).eq("id", user.id);
// profiles 업데이트 (동기화)
await supabase.from("profiles").update({ full_name: payload.fullName, updated_at: ... }).eq("id", user.id);
```

**크로스 테이블 조회** (`master.ts:240-250`):
```typescript
// organizations(Legacy)와 zen_organizations(Modern) 모두 조회
const [legacyRes, modernRes] = await Promise.all([
  supabase.from("organizations").select("org_name_ko, address, biz_no").eq("id", profile.org_id).single(),
  supabase.from("zen_organizations").select("name").eq("id", profile.org_id).single()
]);
```

**FK 의존성 문제** — `profiles` 테이블을 참조하는 FK:
- `grade_promotion_request.user_id` → `profiles.id`
- `zen_notifications.user_id` → `profiles.id`
- `zen_error_logs.user_id` → `profiles.id`
- `zen_faq.created_by` → `profiles.id`
- `zen_notices.created_by` → `profiles.id`
- 모든 FK가 `zen_profiles`가 아닌 `profiles`를 참조

### Blast Radius: HIGH

- **DB 마이그레이션 필요**: FK 재설정, `grade_code` 컬럼 `zen_profiles`로 이관
- **4개 파일** `profiles` → `zen_profiles` 참조 교체
- **서버 액션 4곳** 수정 (`member.ts` 3곳, `support.ts` 1곳)
- `grade_promotion_request` FK 수정 필요

### 수정 대상

| # | 파일 | 라인 | 작업 |
|:-:|:-----|:----:|:-----|
| 1 | `member.ts` | 74-87 | `updateMyProfile()` 이중 업데이트 제거 → 단일 `zen_profiles` |
| 2 | `member.ts` | 138-143 | `grade_code` `profiles` → `zen_profiles` 컬럼 추가 후 단일 조회 |
| 3 | `member.ts` | 315-318 | `reviewGradePromotion()`의 `profiles` 참조를 `zen_profiles`로 |
| 4 | `support.ts` | 102 | Admin 조회 시 `profiles` → `zen_profiles` |
| 5 | Migration 신규 | — | `profiles` FK → `zen_profiles` FK 전환, `profiles` DROP 또는 VIEW로 |
| 6 | Types | `supabase.ts` | `profiles` 테이블 타입 제거 또는 Deprecate 표시 |
| 7 | `master.ts` | 240-250 | `getCurrentUserAffiliation()` 이중 병합 → 단일 `zen_organizations` 조회 |

### 리스크: HIGH

- **DB 마이그레이션 리스크 최대**: FK 6개 재설정은 운영 DB 스키마 변경
- `profiles` DROP 시 롤백 불가 — 반드시 `zen_profiles`에 `grade_code` 컬럼 추가 후 이전
- `grade_code` 컬럼 `zen_profiles`에 없음 — `member.ts:138` 주석 확인됨
- **분석 중 발견**: `grade_promotion_request` FK가 `profiles`를 참조하므로, 이 FK를 먼저 재설정한 후 `profiles` 제거 가능

### 구현 가이드 — 단계별 접근

1. **0단계 (선행)**: `zen_profiles`에 `grade_code` 컬럼 추가 마이그레이션
2. **1단계 (안전)**: `member.ts`에서 이중 업데이트 유지 + `grade_code` 카피 로직 추가
3. **2단계 (DB)**: `grade_promotion_request` FK → `zen_profiles`, 6개 FK 전환
4. **3단계 (코드)**: `member.ts`, `support.ts`의 `profiles` 참조 → `zen_profiles` 교체
5. **4단계 (정리)**: `profiles` → VIEW로 전환, 6개월 후 DROP 고려
6. `getCurrentUserAffiliation()` — `organizations`(Legacy) 병합 로직도 같이 정리 (IMP-049와 동시 진행 권장)

---

## IMP-060 — RETURNED 상태 전이 확장

### 분석 방법

- `status-machine.ts` 전체 분석 (98줄)
- `TRANSITION_RULES`에서 `RETURNED` 키 확인
- `OrderStatus` enum 확인

### 현황

**현재 RETURNED 전이 규칙** (`status-machine.ts:29`):
```typescript
[OrderStatus.RETURNED]: [OrderStatus.WAREHOUSED, OrderStatus.CANCELED],
```
→ 이미 CANCELED가 추가되어 있음. DISPOSED만 부재.

**OrderStatus enum** (`orders.ts:8-21`):
```typescript
export enum OrderStatus {
  REGISTERED = 'REGISTERED',
  SCHEDULED = 'SCHEDULED',
  WAREHOUSED = 'WAREHOUSED',
  PACKED = 'PACKED',
  RELEASED = 'RELEASED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CLAIMED = 'CLAIMED',
  HELD = 'HELD',
  CANCELED = 'CANCELED',
  RETURNED = 'RETURNED',
  MASTERED = 'MASTERED',
  // DISPOSED 없음
}
```

**ORDER_STATUS_META** (`orders.ts:26-39`):
- RETURNED 라벨: `'반송'` — DISPOSED 항목 없음

**ROLE_PERMISSIONS** (`status-machine.ts:34-39`):
- CANCELED가 권한 목록에 포함되어 RETURNED→CANCELED는 Admin/MANAGER bypass로 동작
- DISPOSED는 모든 역할 권한에 없음 (새 enum 추가 시 권한도 추가 필요)

### Blast Radius: LOW

- 2개 파일 수정: `types/orders.ts` (enum + meta) + `status-machine.ts` (rules + permissions)
- 신규 상태 `DISPOSED` 추가 — 기존 코드에 영향 없음
- `isOrderEditable()` (`status-machine.ts:79`) — DISPOSED 추가 검토 (추가 불필요, DISPOSED는 terminal state)

### 수정 대상

| 파일 | 라인 | 작업 |
|:-----|:----:|:-----|
| `src/types/orders.ts` | 8-21 | `OrderStatus` enum에 `DISPOSED` 추가 |
| `src/types/orders.ts` | 26-39 | `ORDER_STATUS_META`에 `DISPOSED` 항목 추가 |
| `src/lib/logistics/status-machine.ts` | 29 | `RETURNED: [..., OrderStatus.DISPOSED]` 추가 |
| `src/lib/logistics/status-machine.ts` | 34-39 | ROLE_PERMISSIONS에 DISPOSED 추가 (Admin/MANAGER bypass로 자동 커버되나 명시 권장) |

### 리스크: LOW

- 단순 enum 확장 — 기존 `switch`문에서 `DISPOSED` missing 처리 필요
- DB 레벨: `zen_orders.status`가 문자열이므로 신규 값 삽입 가능 — `order_status_master` 테이블에도 DISPOSED 등록 검토

### 구현 가이드

1. `OrderStatus` enum에 `DISPOSED = 'DISPOSED'` 추가
2. `ORDER_STATUS_META`에 DISPOSED 엔트리:
```typescript
[OrderStatus.DISPOSED]: { label: '폐기', color: 'bg-neutral-100 text-neutral-800', description: '반송 화물 폐기 처리 완료' },
```
3. `TRANSITION_RULES` RETURNED 배열에 `OrderStatus.DISPOSED` 추가
4. `ROLE_PERMISSIONS.OPERATOR`에 `OrderStatus.DISPOSED` 추가 (운영자가 폐기 처리)
5. `isOrderEditable()` 비수정 상태 목록에 DISPOSED는 불필요 (terminal state)

---

## IMP-061 — PDF 경로 충돌 방지

### 분석 방법

- `finance.ts`의 `issueInvoicePdf()` (L181-264) Storage 경로 로직 분석
- `zen_invoice_pdf_history` 테이블 스키마 확인

### 현황

**현재 PDF 경로 체계** (`finance.ts:228-237`):
```typescript
const nextVersion = (count || 0) + 1;
const timestamp = Date.now();
const filePath = `${invoice.invoice_no}/v${nextVersion}_${timestamp}.pdf`;
// → 예: "INV-20260516-001/v1_1715856000000.pdf"

// Storage 업로드 (upsert: true)
await supabase.storage.from('invoices').upload(filePath, buffer, { contentType: 'application/pdf', upsert: true });
```

**이미 존재하는 방어 장치**:
- Version 기반 경로 (`v{version}_{timestamp}.pdf`)
- `zen_invoice_pdf_history` 테이블에 이력 관리
- `upsert: true`로 동일 경로 덮어쓰기 방지

**잠재적 취약점**:
1. `invoice_no`를 디렉토리명으로 사용 — 동일 `invoice_no`의 동시 요청 시 해당 디렉토리 생성 경합 가능
2. `Date.now()`는 밀리초 단위 — 동일 요청 내에서 중복 가능성 희박하나 존재
3. `upsert: true`가 충돌 시 조용히 덮어씀 — 데이터 손실로 이어질 수 있음

### Blast Radius: LOW

- `finance.ts`의 `issueInvoicePdf()` 단일 함수만 수정
- `zen_invoice_pdf_history` 스키마 변경 불필요 (이미 uuid PK 사용)

### 수정 대상

| 파일 | 라인 | 현재 | 제안 |
|:-----|:----:|:-----|:-----|
| `src/app/actions/finance.ts` | 228-237 | `${invoice_no}/v${version}_${timestamp}.pdf` | `invoices/{uuid}.pdf` + metadata.invoice_no |

### 리스크: LOW

- 기존 파일 경로 체계 변경 시 Storage URL 참조 깨질 수 있음
- `zen_invoice_pdf_history.file_path`가 기존 경로를 참조 중 — 신규 PDF만 UUID 적용, 기존 이력 호환 유지
- 재발행 시 버전 관리 유지 필요

### 구현 가이드

1. UUID 생성 라이브러리 활용 (이미 `crypto.randomUUID()` 사용 가능):
```typescript
const filePath = `invoices/${crypto.randomUUID()}.pdf`;

// metadata에 invoice_no 저장
const metadata = {
  invoice_no: invoice.invoice_no,
  version: nextVersion,
  total_amount: invoice.total_amount,
  currency: invoice.currency,
  issued_at: new Date().toISOString()
};
```

2. `zen_invoice_pdf_history` INSERT 시 metadata에 `invoice_no` 포함:
```typescript
await supabase.from('zen_invoice_pdf_history').insert({
  invoice_id: invoiceId,
  file_path: filePath,
  version: nextVersion,
  created_by: profile.id,
  metadata: metadata  // UUID + invoice_no 함께 기록
});
```

3. `upsert: false`로 변경하여 충돌 시 에러 반환:
```typescript
const { error: uploadError } = await supabase.storage.from('invoices').upload(filePath, buffer, {
  contentType: 'application/pdf',
  upsert: false  // 충돌 시 에러
});
```

---

## IMP-063 — ZenUI.tsx 7개 분할

### 분석 방법

- `ZenUI.tsx` 소스 분석 (204줄)
- 70개+ import 파일 분석

### 현황

**ZenUI.tsx 7개 컴포넌트**:

| # | 컴포넌트 | 라인 | Props | Complexity |
|:-:|:---------|:----:|:------|:----------:|
| 1 | `ZenCard` | 7-28 | `children, className, hoverEffect` | LOW — 단순 glassmorphism div |
| 2 | `ZenButton` | 34-67 | `variant, loading, children` | MEDIUM — 3 variants + loading spinner |
| 3 | `ZenAurora` | 73-89 | `children, className` | LOW — 배경 컨테이너 |
| 4 | `ZenInput` | 94-110 | `error, forwardRef` | MEDIUM — `React.forwardRef` |
| 5 | `ZenTextarea` | 115-132 | `error, forwardRef` | MEDIUM — `React.forwardRef` |
| 6 | `ZenBadge` | 138-166 | `children, variant` | LOW — 5 variants |
| 7 | `ZenSelect` | 170-203 | `value, onValueChange, options` | LOW — select wrapper |

**70개+ import 사이트**: `import { ZenCard, ZenButton, ... } from '@/components/ui/ZenUI'`

### Blast Radius: LOW

- 7개 신규 파일 생성 + 1개 barrel export 파일 수정
- 70개 import 경로는 변경 없음 (index.ts barrel export로 유지)
- 단일 파일 204줄 → 각 파일 20-40줄

### 수정 대상

| 신규 파일 | 컴포넌트 | 라인 수 (예상) |
|:----------|:---------|:--------------:|
| `src/components/ui/ZenCard.tsx` | `ZenCard` | ~25 |
| `src/components/ui/ZenButton.tsx` | `ZenButton` | ~37 |
| `src/components/ui/ZenAurora.tsx` | `ZenAurora` | ~20 |
| `src/components/ui/ZenInput.tsx` | `ZenInput` | ~22 |
| `src/components/ui/ZenTextarea.tsx` | `ZenTextarea` | ~22 |
| `src/components/ui/ZenBadge.tsx` | `ZenBadge` | ~30 |
| `src/components/ui/ZenSelect.tsx` | `ZenSelect` | ~38 |
| `src/components/ui/index.ts` | Barrel export | ~10 |

### 리스크: MEDIUM

- **모든 import 경로 변경 필요**: 70개 파일의 `from '@/components/ui/ZenUI'` → `from '@/components/ui'` (또는 개별 파일)
- IDE 리팩토링 없이 수동 변경 시 누락 위험 높음
- 기존 `ZenUI.tsx`는 re-export shim으로 유지 (점진적 마이그레이션)

### 구현 가이드

1. **단계 1 — Shim 유지** (안전): `ZenUI.tsx`를 그대로 두고 개별 파일 생성
2. **단계 2 — Index.ts 생성**:
```typescript
export { ZenCard } from './ZenCard';
export { ZenButton } from './ZenButton';
export { ZenAurora } from './ZenAurora';
export { ZenInput } from './ZenInput';
export { ZenTextarea } from './ZenTextarea';
export { ZenBadge } from './ZenBadge';
export { ZenSelect } from './ZenSelect';
```
3. **단계 3 — Import 교체 스크립트** (선택): `sed` 일괄 교체로 70개 파일 자동 변환:
```bash
# import 경로: ZenUI → index (선택 사항, ZenUI shim 유지 시 불필요)
# 개별 import로 전환 시 (권장):
# from '@/components/ui/ZenUI' → from '@/components/ui/ZenCard' 등 개별
```
4. **단계 4 — ZenUI.tsx 정리** (선택): 분할 후 ZenUI.tsx → re-export shim으로 전환
5. 각 파일별 `displayName` 설정 유지: `ZenInput.displayName = "ZenInput"` (L110), `ZenTextarea.displayName = "ZenTextarea"` (L132)

> **권장**: shim(`ZenUI.tsx` re-export)을 최소 1개월 유지 후 삭제. 70개 파일의 import 경로 변경은 회귀 테스트 전면 재실행 필요.

---

## 종합 Blast Radius 요약

| IMP | Risk | 직접 영향 | 핵심 전략 |
|:---:|:----:|:---------|:---------|
| IMP-012 | **LOW** | codes-client.tsx 2개 → 1개 | 공통 컴포넌트 추출 + 타입 교체 |
| IMP-017 | **LOW** | error.tsx 4개 신규 | boilerplate 복사 |
| IMP-023 | **MEDIUM** | routing.ts + global.d.ts | 타입 파라미터 추가 |
| IMP-024 | **LOW** | domain/ 3~5개 신규 | 신규 파일만 생성 |
| **IMP-029** | **HIGH** | **35곳 any, 3개 타입 파일** | 단계적 교체 (catch → unknown 우선) |
| **IMP-049** | **HIGH** | **4개 파일 + 6개 FK + Migration** | DB 마이그레이션 선행, 코드 순차 교체 |
| IMP-060 | **LOW** | enum + rules + meta (3개 파일) | DISPOSED 추가 |
| IMP-061 | **LOW** | finance.ts 1개 함수 | UUID 경로 + upsert:false |
| IMP-063 | **MEDIUM** | 7개 신규 + 70개 import | barrel export shim 유지하며 점진 전환 |

### 크로스-IMP 의존성

| 의존성 | 방향 | 설명 |
|:-------|:----:|:------|
| IMP-063 → IMP-024 | 선행 | ZenUI 분할이 완료되어야 domain 컴포넌트가 개별 import 가능 |
| IMP-029 → IMP-067 | 연계 | `payload: any` → Zod 교체는 IMP-029의 하위 집합이자 IMP-067의 선행 |
| IMP-049 → DB Migration | 선행 | FK 재설정 Migration이 완료되어야 코드 수정 가능 |
| IMP-060 → DB Migration | 선택 | `order_status_master`에 DISPOSED 등록 시 |
| IMP-012 ↔ IMP-063 | 독립 | 서로 다른 파일 — 병행 진행 가능 |

### 구현 순서 권장

```
1순위 (저위험, 빠른 효과):
  IMP-017: error.tsx 4개 (boilerplate)
  IMP-060: DISPOSED enum (3개 파일)

2순위 (중간 위험, 단일 파일):
  IMP-061: UUID PDF 경로 (finance.ts 1개 함수)
  IMP-023: i18n 타입 안정성 (routing.ts + global.d.ts)

3순위 (고위험, 복수 파일):
  IMP-029: any 퇴출 (35곳, 단계적)

4순위 (DB 의존, Migration 필요):
  IMP-049: 이중 프로필 정리 (DB Migration → 코드 4개 파일)

5순위 (저위험, 단순 리팩토링):
  IMP-012: 중복 codes-client (2개 파일)
  IMP-024: domain 컴포넌트 (신규 파일, IMP-063 후행)
  IMP-063: ZenUI 분할 (7개 신규 + shim 유지)
```

---

[D_Kai (OpenCode) | 2026-05-16 | 순수 분석 — 코드 수정 없음]
