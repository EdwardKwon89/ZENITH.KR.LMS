# Phase A CRITICAL 사전 GitNexus 분석

> **수행**: D_Kai (OpenCode) | **검증**: Aiden (Claude)
> **분석 대상**: IMP-035 / IMP-026 / IMP-041
> **분석일**: 2026-05-15 | **유형**: 순수 분석 (코드 수정 없음)

---

## IMP-035 — SECURITY DEFINER 함수 권한 검증

### 분석 방법

- `gitnexus_query({query: "SECURITY DEFINER"})` — migration 파일 55개 매치
- `gitnexus_query({query: "get_my_role"})` — 호출 체인 추적
- `gitnexus_context({name: "requireAdmin"})` — 가드 함수 영향도
- migration SQL 전수 검증 (CREATE FUNCTION + LANGUAGE 구문 크로스 체크)

### SECURITY DEFINER 함수 인벤토리

| 함수명 | 최초 정의 파일 | 권한 검증 | 위험도 |
|:-------|:--------------|:---------:|:------:|
| `approve_organization(UUID)` | `20260418002000_expand_identity_auth.sql` | ❌ **주석만** (simplified) | **CRITICAL** |
| `reject_organization(UUID, text)` | `20260419010000_advanced_approval_workflow.sql` | ❌ 없음 | **CRITICAL** |
| `request_organization_supplement(UUID, text)` | `20260419010000_advanced_approval_workflow.sql` | ❌ 없음 | **CRITICAL** |
| `calculate_order_costs(UUID)` | `20260422020000_zen_finance_core.sql` | ❌ 없음 | **HIGH** |
| `fn_get_best_matching_rate(...)` | `20260420065504_rebuild_rate_matching_engine_final.sql` | ❌ 없음 | **MEDIUM** |
| `fn_trigger_capture_order_rate()` | `20260428235219_remote_schema.sql` | ❌ 없음 | **MEDIUM** |
| `handle_new_user()` | `20260418002000_expand_identity_auth.sql` | ⚠️ 트리거 전용 | **LOW** |
| `get_my_role()` | `20260428151000_fix_lint_errors.sql` | ✅ RLS 우회용 (의도적) | **LOW** |
| `get_next_order_sequence(text, text)` | `20260422140000_fix_missing_rpcs.sql` | ❌ 없음 | **LOW** |
| `get_orders_aggregation(uuid[])` | `20260422140000_fix_missing_rpcs.sql` | ❌ 없음 | **LOW** |
| `rls_auto_enable()` | `20260428235219_remote_schema.sql` | ⚠️ 시스템 함수 | **LOW** |
| `handle_updated_at()` | `00000000000000_core_functions.sql` | ⚠️ 트리거 전용 | **LOW** |

> **총 SECURITY DEFINER 사용**: ~55개 migration 매치 / 약 12개 고유 함수

### Blast Radius

**CRITICAL 3종 (`approve_organization`, `reject_organization`, `request_organization_supplement`)**:

- `approve_organization()` 호출자: `organizations-client.tsx`의 `handleApprove()` — ADMIN 화면
- `reject_organization()` 호출자: `handleReject()` — ADMIN 화면
- `request_organization_supplement()` 호출자: `handleRequestSupplement()` — ADMIN 화면
- 공통 문제: 함수 본문에 `-- [1] Security check (simplified)` 주석만 있고 실제 `auth.jwt()` 또는 `get_my_role()` 호출 없음
- SECURITY DEFINER로 실행 시 postgres 권한으로 RLS 완전 우회

**`calculate_order_costs()`**: 
- 호출자: `fn_trigger_capture_order_rate()` (트리거), `finance.ts` (서버 액션)
- SECURITY DEFINER 불필요 (일반 트리거 함수로 충분)

### Riley 구현 시 주의사항

1. **CRITICAL 3종 우선 처리**: `approve_organization()` / `reject_organization()` / `request_organization_supplement()` — SECURITY INVOKER 전환 또는 `get_my_role()` 기반 권한 검증 추가
2. **`get_my_role()` 재사용**: `20260428151000_fix_lint_errors.sql`에 이미 정의된 헬퍼 — 새 함수에도 동일 패턴 적용
3. **`calculate_order_costs()`**: SECURITY DEFINER 불필요 — INVOKER 전환만으로 안전
4. **주의**: `SECURITY INVOKER` 전환 시 기존 호출자(트리거)가 올바른 권한으로 실행되는지 검증 필요

---

## IMP-026 — RLS 비즈니스 규칙 통합

### 분석 방법

- `gitnexus_impact({target: "orders"})` — 업스트림 호출자
- `gitnexus_query({query: "RLS policy orders"})` — 기존 RLS 정책 현황
- migration SQL의 CREATE POLICY 구문 전수 분석

### 현행 RLS 정책 현황 (orders 관련)

| 정책 | 대상 테이블 | 역할 기반 | 비즈니스 규칙 |
|:-----|:----------|:---------:|:------------:|
| Shippers can view their own zen_orders | `zen_orders` | ✅ | ❌ UID 단순 비교 |
| Allow authenticated full access to master zen_orders | `zen_orders` (master) | ❌ **전체 허용** | ❌ 없음 |
| Admins can update orders | `zen_orders` | ✅ role = 'ADMIN' | ❌ 없음 |
| Users can create VOCs for own organization zen_orders | `zen_voc` | ❌ | ⚠️ org_id 기반 |
| Users can view tracking of their own zen_orders | `zen_tracking_configs` | ❌ | ⚠️ UID 기반 |
| Users can view route options for their org's zen_orders | `zen_route_options` | ❌ | ⚠️ org_id 기반 |
| Users can manage route options for their org's zen_orders | `zen_route_options` | ❌ | ⚠️ org_id 기반 |
| Users can view order routes for their org's zen_orders | `zen_order_routes` | ❌ | ⚠️ org_id 기반 |
| Users can manage order routes for their org's zen_orders | `zen_order_routes` | ❌ | ⚠️ org_id 기반 |

### Blast Radius: HIGH

**직접 영향 파일**:
- `src/app/actions/orders.ts` — `createOrder()`, `getOrderDetails()`, `updateOrder()`, `updateOrderStatus()` 등 10+개 액션
- `src/app/actions/finance.ts` — `getSettlementOverview()`, `getWeeklyRevenueChart()`
- `src/app/actions/master.ts` — `getOrganizations()`, `getAirlines()`
- `src/middleware.ts` — 세션/인증 검증
- `src/app/[locale]/(dashboard)/layout.tsx` — `DashboardGroupLayout`

**영향 받는 실행 흐름**:
- 프로세스 117개 중 20+개가 `createClient()` → orders 테이블 접근
- `OnSubmit → CreateClient` (주문 생성)
- `HandleUpdateStatus → CreateClient` (상태 변경)
- `SettlementPage → CreateClient` (정산 조회)
- `FinanceDashboardPage → CreateClient` (재무 대시보드)

### 위험 분석

1. **"Allow authenticated full access to master zen_orders"** — 모든 인증 사용자가 마스터 오더에 전체 권한. 이는 RLS 우회와 동일
2. **역할 문자열 하드코딩**: `role = 'ADMIN'` 문자열 직접 비교 — `USER_ROLES` 상수 미사용
3. **비즈니스 규칙 부재**: 조직 멤버십(`org_id`) 기반 필터링이 앱 코드(서버 액션)에만 존재, DB 레벨 RLS에는 미반영

### Riley 구현 시 주의사항

1. **최우선**: "Allow authenticated full access to master zen_orders" 정책 수정 — 조직 멤버십 + 역할 검증 추가
2. **문자열 → 상수**: `'ADMIN'`, `'MANAGER'` 하드코딩 → SQL 함수 `get_user_role()` 등으로 추상화
3. **영향도 큰 파일**: `orders.ts` 수정 시 회귀 테스트 전면 필요 (22개+ RLS 정책, 117개 프로세스)
4. **SQL 함수화 후보**: `is_org_member(user_id, org_id)`, `can_access_order(user_id, order_id)` — RLS 정책에서 재사용 가능

---

## IMP-041 — Storage 정책 조직 멤버십 검증

### 분석 방법

- `gitnexus_query({query: "storage policy"})` — Storage 정책 심볼
- `gitnexus_query({query: "organization membership"})` — 조직 멤버십 로직
- `gitnexus_context({name: "createClient"})` — Supabase 클라이언트 호출 체인
- migration SQL의 Storage 정책(CREATE POLICY) 전수 분석

### Storage 버킷 및 정책 현황

#### `business_docs` 버킷 (비공개)

| 작업 | 정책 | 조직 검증 | 위험도 |
|:----|:-----|:--------:|:------:|
| INSERT | `bucket_id = 'business_docs'` 조건만 | ❌ **없음** | **CRITICAL** |
| SELECT (ADMIN) | `role = 'ADMIN'` 확인 | ❌ 없음 | HIGH |
| SELECT (OWNER) | `owner = auth.uid()` 확인 | ⚠️ 소유자만 | LOW |

#### `invoices` 버킷 (비공개)

| 작업 | 정책 | 조직 검증 | 위험도 |
|:----|:-----|:--------:|:------:|
| INSERT | `role IN ('ADMIN','PARTNER','ZENITH_SUPER_ADMIN','MANAGER')` | ❌ **없음** | **HIGH** |
| SELECT | invoice_no LIKE 매칭 OR role IN ('ADMIN','ZENITH_SUPER_ADMIN','MANAGER') | ⚠️ invoice_no 기반 간접 검증 | MEDIUM |

### Blast Radius: MEDIUM

**직접 영향 파일**:
- `supabase/migrations/20260418200000_storage_and_approval.sql` — `business_docs` 버킷 + 초기 정책
- `supabase/migrations/20260424130500_zen_finance_storage.sql` — `invoices` 버킷 초기 정책
- `supabase/migrations/20260425110000_fix_storage_rls_super_admin.sql` — invoices 패치
- `src/components/layout/ZenShell.tsx` — Storage 접근 컴포넌트
- `src/app/actions/organization.ts` — `approveOrganization()` (business_docs 업로드)

**영향 받는 컴포넌트**:
- `AdminOrganizationsPage` → `handleViewDocument()` (business_docs 조회)
- `OrganizationApprovalClient` → 서류 검토 (business_docs)
- `FinanceDashboardPage` → 인보이스 PDF 조회 (invoices)

### 위험 분석

1. **`business_docs` INSERT 정책**: 버킷 ID만 확인하고 조직 멤버십 검증 없음 → 가입한 조직의 서류가 아니어도 업로드 가능
2. **`invoices` INSERT 정책**: 역할만 확인하고 조직 멤버십 검증 없음 → ADMIN 역할이면 타 조직 인보이스도 업로드 가능
3. **행 부재**: `business_docs` 버킷에 UPDATE/DELETE 정책 정의 자체가 없음 (default deny지만 명시적 정책 부재)

### Riley 구현 시 주의사항

1. **`business_docs` INSERT 수정**: `zen_profiles`의 `org_id`를 조회하여 조직 멤버십 검증 조건 추가
2. **`invoices` INSERT 수정**: 동일하게 조직 멤버십 조건 추가
3. **UPDATE/DELETE 정책 신규 작성**: `business_docs` 버킷에 UPDATE/DELETE 정책 추가 (소유자 기반 또는 ADMIN 전용)
4. **`get_my_role()` 헬퍼 재사용**: SECURITY DEFINER 함수인 `get_my_role()`을 RLS 정책에서 활용 가능 (IMP-035와 연계)
5. **참고**: `is_org_member()` SQL 함수를 새로 만들어 Storage 정책과 테이블 RLS에서 공통 사용 권장

---

## 종합 Blast Radius 요약

| IMP | Risk Level | 직접 영향 파일 | 영향 프로세스 | 우선순위 |
|:---:|:----------:|:-------------:|:------------:|:--------:|
| IMP-035 | **CRITICAL** | 12개 고유 함수 / 55개 migration 매치 | 20+ 서버 액션 | Phase A 1순위 |
| IMP-026 | **HIGH** | 10+ RLS 정책 / 6개 액션 파일 | 117개 중 20+ 프로세스 | Phase A 2순위 |
| IMP-041 | **MEDIUM** | 3개 migration / 4개 컴포넌트 | 6개 실행 흐름 | Phase A 3순위 |

### 공통 주의사항 (3개 IMP 교차)

1. **`get_my_role()` 재사용**: IMP-035에서 권한 검증 헬퍼로 사용 → IMP-026 RLS 정책에서도 동일 헬퍼 활용 가능 → IMP-041 Storage 정책에도 확장
2. **회귀 범위**: SECURITY DEFINER 변경(`calculate_order_costs`)은 정산 금액 변동 가능 → `test:regression` 전면 필요
3. **마이그레이션 순서**: IMP-035(함수 권한) → IMP-026(RLS) → IMP-041(Storage) 순으로 구현할 것 (하위 함수를 상위 정책이 참조)

---

[D_Kai (OpenCode) | 2026-05-15 | 순수 분석 — 코드 수정 없음]
