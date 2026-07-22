# DEF-114: ROLE_PERMISSIONS에 AGENCY 누락 — 창고관리 기능 전체 500 에러

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-22 |
| **보고자** | jungjs (Jaison) |
| **긴급도** | Critical |
| **우선순위** | P1 |
| **연결 이슈** | [#655](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/655) |

## 현상

`agency@zenith.kr`(AGENCY 역할)로 창고관리 기능(입고확정, 출고확정, 픽업완료 등) 실행 시 500 에러 발생.

```
Error: AGENCY 역할은 WAREHOUSED 상태로 변경할 권한이 없습니다.
    at updateOrderStatus (src/app/actions/operations/orders.ts:395:11)
```

## 근본 원인

`src/lib/logistics/status-machine.ts`의 `ROLE_PERMISSIONS`에 `USER_ROLES.AGENCY` 항목이 없음.

- `canChangeStatus()`는 `ROLE_PERMISSIONS[role]` 조회 → AGENCY 미등록 → `undefined` → `[]` (빈 배열)
- 모든 상태 변경이 `!allowedByRole.includes(target)` 통과 실패 → 권한 없음 오류

## 영향 범위

AGENCY 역할에서 다음 전액션 차단:

| 기능 | target 상태 |
|:-----|:-----------|
| confirmInbound (입고확정) | WAREHOUSED |
| confirmOutbound (출고확정) | RELEASED |
| confirmPickup (픽업완료) | SCHEDULED |
| cancelPickup (픽업취소) | REGISTERED |
| confirmUpsRegistration (UPS접수) | PACKED |
| undoUpsRegistration (UPS등록취소) | WAREHOUSED |
| confirmDeparture (출고확정처리) | IN_TRANSIT |
| undoOutbound (출고취소) | PACKED |
| cancelInbound (입고취소) | REGISTERED/SCHEDULED |

## 조치

`ROLE_PERMISSIONS`에 AGENCY 항목 추가 (6개 상태 권한):

```typescript
[USER_ROLES.AGENCY]: [
  OrderStatus.REGISTERED,
  OrderStatus.SCHEDULED,
  OrderStatus.WAREHOUSED,
  OrderStatus.PACKED,
  OrderStatus.RELEASED,
  OrderStatus.IN_TRANSIT,
],
```

DELIVERED, CANCELED, CLAIMED 등은 AGENCY 권한 범위 밖으로 제외.

## OPERATOR 권한 관련 검토

**판단: 현행 유지 (추가 권한 부여하지 않음)**

### 배경
PR#646(Baker, TASK-B-170)에서 `ROLE_PERMISSIONS[OPERATOR]`에 WAREHOUSED/PACKED/RELEASED/IN_TRANSIT를 추가했었음.

### 분석
1. **OPERATOR는 `WAREHOUSE_ROLES`에 포함되지 않음** — `src/app/actions/operations/warehouse.ts:12`에서 `WAREHOUSE_ROLES = [ADMIN, MANAGER, ZENITH_SUPER_ADMIN, AGENCY]`로 정의되어 있으며 OPERATOR는 제외됨
2. **실효성 없음**: OPERATOR에 아무리 많은 전이 권한을 부여해도 `WAREHOUSE_ROLES.includes(profile.role)` 게이트에서 차단되어 warehouse 서버 액션에 접근할 수 없음
3. **현행 유지 사유**: OPERATOR의 기존 권한(SCHEDULED/HELD/CANCELED/CLAIMED)은 운영/지원 업무에 적합하며, 창고 업무(WAREHOUSED/PACKED/RELEASED/IN_TRANSIT)는 warehouse 역할(ADMIN/MANAGER/AGENCY)의 책임이므로 분리 유지

### 결론
- PR#646의 OPERATOR 확장은 미병합 상태(PR 반려)로 현재 코드에 반영되지 않음
- AGENCY에 창고 상태 권한을 추가하는 것으로 충분 — OPERATOR는 현행 유지

## 테스트

### 단위 테스트 (status-machine)
- TC-AG-T1~TC-AG-T9: AGENCY 역할 권한 검증 9개 케이스 추가
  - T1~T6: 허용 검증 (REGISTERED/SCHEDULED/WAREHOUSED/PACKED/RELEASED/IN_TRANSIT)
  - T7~T9: 거부 검증 (DELIVERED/CANCELED/CLAIMED)
- status-machine: 31/31 PASS

### 통합 테스트 (server action chain)
- TC-AG-INT-01: AGENCY confirmPickup → updateOrderStatus(SCHEDULED) 정상 호출 ✅
- TC-AG-INT-02: AGENCY cancelPickup → updateOrderStatus(REGISTERED) 정상 호출 ✅
- TC-AG-INT-03: AGENCY cancelInbound → WAREHOUSED→SCHEDULED 복구 정상 ✅
- warehouse (ups-pickup-inbound): 17/17 PASS

### TypeScript
- 0 error (e2e pre-existing errors만 존재)

### DB RLS 레이어 추가 발견 (2차)
Application 레벨(ROLE_PERMISSIONS) 수정만으로는 `update_order_status_atomic` RPC
(SECURITY INVOKER)의 `SELECT ... FOR UPDATE` 락이 DB RLS에서 차단되어,
AGENCY가 창고 액션을 실행할 수 없었음.

#### 추가 조치: DB 마이그레이션
- **`zen_orders`**: AGENCY UPDATE RLS 정책 신규 (`Agency can update shipper orders`)
  - 조건: `get_my_role() = 'AGENCY' AND agency_org_id = profile.org_id`
- **`zen_inventory_history`**: INSERT 정책에 AGENCY 역할 추가
  - 기존 `ADMIN/ZENITH_SUPER_ADMIN/MANAGER/MEMBER/PARTNER`에 `AGENCY` 추가

### 실사용 RPC 검증 결과
- `agency@zenith.kr` 로그인 → `update_order_status_atomic` RPC 직접 호출 → **204 성공** ✅
- 테스트 오더 `303f3ee1-...`(`ZEN-2026-000001`) → REGISTERED → WAREHOUSED 전이 성공 후 REGISTERED로 복구 완료
- 더 이상 "Order not found" 또는 500 에러 발생하지 않음

## 변경 파일

| 파일 | 변경 내용 |
|:-----|:---------|
| `src/lib/logistics/status-machine.ts` | ROLE_PERMISSIONS에 AGENCY 추가 |
| `tests/unit/logistics/status-machine.test.ts` | TC-AG-T1~T9 9종 추가 |
| `tests/unit/warehouse/ups-pickup-inbound.test.ts` | TC-AG-INT-01~03 3종 추가 (mock에 attachOperatorNames 보강) |
| `tests/setup.ts` | server-only mock 추가 |
| `tests/__mocks__/server-only.ts` | vitest alias용 빈 모듈 |
| `vitest.config.ts` | server-only alias 추가 |
| `supabase/migrations/20260722000000_def114_agency_warehouse_rls.sql` | AGENCY UPDATE RLS + inventory_history INSERT 확장 |

---

## 추가 발견 경위 (2026-07-22, Jaison) — 위 DB RLS 결함을 처음 특정한 진단 기록

PR#656(`ROLE_PERMISSIONS[AGENCY]` 추가)이 TeamB_Dev에 병합되지 않은 상태에서 JSJung이 해당 브랜치로 실사용 검증 중 **여전히 500 에러 재현**을 보고. 로컬에서 직접 원인을 추적한 결과, **애플리케이션 레벨(`ROLE_PERMISSIONS`) 수정과는 별개로 DB RLS 레벨의 두 번째 결함**이 있음을 확인.

### 재현 절차 및 근거

테스트 오더 `303f3ee1-74b9-4828-8f76-4106bde4fd01`(`ZEN-2026-000001`, `shipper_id=7e4068a7...`, `agency_org_id=48bfa40d...`, `status=REGISTERED`)로 검증:

1. **agency@zenith.kr 세션으로 plain SELECT** (`GET /rest/v1/zen_orders?id=eq...`) → **성공**, 오더 정상 조회됨
2. **agency@zenith.kr 세션으로 `update_order_status_atomic` RPC 직접 호출** (`p_prev_status=REGISTERED, p_next_status=WAREHOUSED`) → **`{"code":"P0001","message":"Order not found"}`** (HTTP 400)
3. **동일 RPC를 service_role로 호출** → **204 성공** (RPC 함수 로직 자체는 정상)

### 근본 원인 (추정, 확정은 담당자가 `pg_policies`로 재확인 필요)

`update_order_status_atomic()`(`supabase/migrations/20260520224100_imp047_atomic_transactions.sql`)은 `SECURITY INVOKER`이며 첫 문장이 `SELECT ... FROM zen_orders WHERE id = p_order_id FOR UPDATE`. PostgreSQL RLS 사양상 **`FOR UPDATE`/`FOR SHARE` 락은 SELECT 정책뿐 아니라, 해당 테이블에 UPDATE 정책이 하나라도 정의되어 있으면 그 UPDATE 정책도 함께 만족해야 함**(잠금 자체를 변경의 전조로 간주).

`zen_orders`의 현재 UPDATE 계열 정책(마이그레이션 히스토리 기준 재구성, DROP/CREATE 반복으로 실제 최신 상태는 `pg_policies` 직접 조회 권장):
- `"Admins can manage all orders"` (FOR ALL) — `role IN (ZENITH_SUPER_ADMIN, ADMIN, MANAGER)`만 허용, AGENCY 미포함
- `"Org members can update order route"` 등 일부 특수 목적 정책 존재하나 AGENCY 범위 커버 안 됨

반면 **SELECT는 성공**하는 이유: `"agency_shipper_select_own_orders"`(`20260705000002_agency_005_orders_agency_org_id.sql`) 정책이 `USING (agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid()))`로 **역할 제한 없이** 정의되어 있어(이름은 AGENCY_SHIPPER용이지만 실제로는 role 체크가 없어 AGENCY도 매치) plain SELECT는 통과함.

**즉: SELECT 정책은 (우연히) AGENCY를 커버하지만, UPDATE 정책은 AGENCY를 전혀 커버하지 않아 `FOR UPDATE` 락 단계에서 막힘.**

### 필요 조치 (PR#656에 추가 또는 후속 마이그레이션)

`zen_orders`에 AGENCY 역할용 UPDATE(또는 FOR ALL) RLS 정책 신규 추가 필요 — 기존 SELECT 정책과 동일하게 `agency_org_id = profile.org_id` 스코프로:
```sql
CREATE POLICY "agency_can_update_own_orders" ON zen_orders
FOR UPDATE
USING (
  agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
  AND (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'AGENCY'
)
WITH CHECK (
  agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
  AND (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'AGENCY'
);
```
(정확한 조건/컬럼명은 담당자가 `pg_policies`로 현재 실제 정책 목록을 먼저 확인한 뒤 설계할 것 — 위는 방향성 제시용 예시이며 그대로 적용 금지.)

또한 `order_status_history` INSERT, `zen_inventory_history` INSERT 등 같은 RPC 내에서 함께 쓰는 다른 테이블들도 AGENCY 역할의 INSERT 정책이 있는지 함께 점검 필요(이번 재현에서는 SELECT FOR UPDATE 단계에서 이미 막혀 그 이후 단계까지 도달 못했으므로 미확인 상태).

**테스트 데이터 상태**: 진단 과정에서 `303f3ee1-...` 오더를 service_role로 WAREHOUSED까지 전이시켰다가 REGISTERED로 되돌려놓음.

**(해결됨)** 위 진단을 바탕으로 Dave가 마이그레이션 `20260722000000_def114_agency_warehouse_rls.sql`을 추가해 해결 — 상세는 위 "DB RLS 레이어 추가 발견 (2차)" 섹션 참조.
