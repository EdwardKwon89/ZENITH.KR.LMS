# TASK-118 — [P6-SPR-06] Order 목록 역할별 격리

| 항목 | 내용 |
|:---|:---|
| Task ID | TASK-118 |
| Phase | Phase 6 / SPR-06 |
| 생성일 | 2026-06-06 |
| 발령자 | Aiden (Claude, ZEN_CEO) |
| 담당 Agent | D_Kai (OpenCode) |
| 우선순위 | P2 |
| 전제조건 | TASK-113 ✅ |
| 관련 IMP | IMP-102 |
| 관련 설계 | [An-11 §5.3](../../docs/02_Analysis/An_11_Phase6_신규서비스역할모델_설계.md) |
| 상태 | 🔔 검토 요청 |

---

## 목표

`zen_orders` RLS 정책을 확장하여 CUSTOMS_BROKER / DELIVERY_AGENT 역할이 자신에게 배정된 Order만 조회할 수 있도록 한다. 기존 화주/운송사/ADMIN 격리는 유지.

---

## 배경 및 결정 경위

- 고객 리뷰: "통관사는 자신에게 요청된 Order 목록만 조회한다. 배송사는 자신에게 요청된 Order 목록만 조회한다."
- `zen_order_services.provider_id = 본인 org_id` 조건으로 필터

---

## 구현 명세

### 1. Migration: zen_orders RLS 정책 업데이트

**파일**: `20260606040000_p6_orders_rls_role_isolation.sql`

```sql
-- 기존 RLS 정책 DROP 후 재생성
-- CUSTOMS_BROKER / DELIVERY_AGENT → zen_order_services에서 본인 org가 provider인 order만
CREATE POLICY "orders_select_service_providers"
  ON zen_orders FOR SELECT
  USING (
    (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN', 'MANAGER')
    OR shipper_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid
    OR carrier_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid
    OR id IN (
      SELECT order_id FROM zen_order_services
      WHERE provider_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid
    )
  );
```

### 2. `/orders/assigned` 페이지

CARRIER / CUSTOMS_BROKER / DELIVERY_AGENT 전용 할당 오더 목록:
- 서비스 유형별 탭 (운송/통관/배송)
- 오더 번호, 화주명, 서비스 유형, 상태, 배정일

### 3. 기존 Order 목록 (`/orders`) 영향 확인

기존 ADMIN / 화주 조회 RLS 회귀 없음 검증

---

## DoD (Definition of Done)

- [x] zen_orders RLS 업데이트 Migration 생성 확인
- [x] CUSTOMS_BROKER: 본인 org가 provider인 order만 조회 확인 (via RLS policy)
- [x] DELIVERY_AGENT: 본인 org가 provider인 order만 조회 확인 (via RLS policy)
- [x] 화주(CORPORATE/INDIVIDUAL): 본인 shipper_id order만 조회 확인 (기존 유지)
- [x] ADMIN/MANAGER: 전체 order 조회 확인 (기존 유지)
- [x] `/orders/assigned` 할당 오더 목록 페이지 동작 확인
- [x] NaviSidebar: CUSTOMS_BROKER·DELIVERY_AGENT 오더 메뉴 표시 확인
- [x] R-09: `LIVE_REGRESSION_TEST_MAP.md`에 TC-P6-ORDERS-01~05 신규 추가
- [x] 회귀 테스트 전체 PASS (기존 order RLS 회귀 없음) 259/259
- [x] 코드 커밋 → task file 🔔 → ACTIVE_TASK.md 갱신 → DoD 검증 → 문서 커밋 (R-17 순서 엄수)

---

## [작업 결과]

| 검증 항목 | 결과 |
|:---------|:----:|
| Migration | `supabase/migrations/20260606040000_p6_orders_rls_service_providers.sql` — zen_orders SELECT policy 추가 |
| Server Action | `src/app/actions/operations/assigned-orders.ts` — getAssignedOrders() with category filter |
| UI Page | `src/app/[locale]/(dashboard)/orders/assigned/page.tsx` + `assigned-orders-client.tsx` |
| NaviSidebar | `src/components/layout/NaviSidebar.tsx` — top-level 할당 오더 menu + `ClipboardList` icon |
| i18n | `messages/{ko,en,ja,zh}.json` — `orders_assigned` 키 4개국어 추가 |
| Test | `tests/unit/orders/assigned-orders.test.ts` — TC-P6-ORDERS-01~05 5 tests PASS |
| 회귀 테스트 | 259/259 PASS (52 test files, 기존 254 + 신규 5) |
| TC Map | `LIVE_REGRESSION_TEST_MAP.md` — 254→259 갱신 + TC-P6-ORDERS-01~05 |

### 구현 상세

| 항목 | 설명 |
|:----|:-----|
| **RLS 정책** | `Service providers can view assigned orders` — `zen_order_services.provider_id = 본인 org_id` 조건으로 zen_orders SELECT 허용. 기존 5개 정책과 OR 조합. |
| **getAssignedOrders()** | CARRIER/CUSTOMS_BROKER/DELIVERY_AGENT 전용. zen_order_services JOIN으로 본인 org가 provider인 order만 조회. TRANSPORT/CUSTOMS/DELIVERY 카테고리 필터 지원. |
| **UI 탭** | 전체/운송/통관/배송 4개 탭. 서비스 유형별 필터링. 오더 번호·화주·서비스 유형·상태·배정일 표시. |
| **권한 차단** | CORPORATE/INDIVIDUAL/ADMIN 외 역할은 getAssignedOrders 호출 시 에러 반환. |

### RLS 정책 확인

기존 zen_orders RLS 정책 5개:
1. `Admins can view all orders` — ADMIN/MANAGER/ZENITH_SUPER_ADMIN (SELECT)
2. `Members can view own organization orders` — is_org_member(shipper_id) (SELECT)
3. `Admins can manage all orders` — ADMIN/MANAGER/ZENITH_SUPER_ADMIN (ALL)
4. `Members can insert own organization orders` — shipper_id org 멤버 (INSERT)
5. `Org members can update order route` — route_option_id UPDATE

신규 추가:
6. `Service providers can view assigned orders` — zen_order_services.provider_id (SELECT)

화주/ADMIN RLS 기존 유지 확인 완료.

---

## [Aiden 검토]

*(Aiden 전속)*
