# DEF-114: `ROLE_PERMISSIONS`에 AGENCY 항목 누락 — 창고관리 기능 전체가 AGENCY 역할에서 500 에러

| 항목 | 내용 |
|:----|:----|
| **발견 경위** | 사용자(JSJung, agency@zenith.kr 세션)가 "입고확정 처리" 시 500 에러 실사용 보고 |
| **긴급도** | **즉시(Critical)** |
| **발견자** | Jaison |
| **발견일** | 2026-07-22 |

## 현상

`agency@zenith.kr`(AGENCY 역할)로 로그인한 상태에서 "입고확정" 버튼 클릭 시 500 에러 발생. 로컬 dev 서버 로그:

```
⨯ Error: AGENCY 역할은 WAREHOUSED 상태로 변경할 권한이 없습니다.
    at updateOrderStatus (src/app/actions/operations/orders.ts:395:11)
  ...
 POST /ko/warehouse/inbound 500 in 587ms
  └─ ƒ confirmInbound("303f3ee1-74b9-4828-8f76-4106bde4fd01", "NORMAL", "") ...
```

## 근본 원인

`src/lib/logistics/status-machine.ts`의 `canChangeStatus()`는 2단계 검증을 수행한다:
1. `TRANSITION_RULES` — 상태 전이 자체가 유효한지 (여기는 통과)
2. `ROLE_PERMISSIONS[role]` — 해당 역할이 그 target 상태로 변경할 권한이 있는지

`ROLE_PERMISSIONS`(`status-machine.ts:35-40`)에는 `OPERATOR`/`CARRIER`/`CORPORATE`/`INDIVIDUAL` 항목만 있고 **`USER_ROLES.AGENCY` 항목이 아예 없다.** `Partial<Record<UserRole, OrderStatus[]>>`이므로 없는 키는 `undefined` → `allowedByRole = []` → `allowedByRole.includes(target)`이 항상 `false` → **AGENCY 역할은 `updateOrderStatus()`를 통한 모든 상태 변경이 무조건 실패한다**(ADMIN/MANAGER/ZENITH_SUPER_ADMIN은 1번 검증에서 전부 우회하므로 이 버그의 영향을 받지 않음 — `canChangeStatus():50-53`).

## 영향 범위 (전부 재현 확인 가능한 코드 경로, `WAREHOUSE_ROLES`에 AGENCY 포함되어 있어 UI 접근 자체는 되지만 실행 시 전부 500):

| 액션 | 파일:라인 | target 상태 |
|:-----|:---------|:-----------|
| `confirmInbound` (입고확정) | `orders.ts:655` | WAREHOUSED |
| `confirmOutbound` (출고확정) | `warehouse.ts:158` | RELEASED |
| `confirmPickup` (픽업완료) | `warehouse.ts:228` | SCHEDULED |
| `cancelPickup` (픽업취소) | `warehouse.ts:242` | REGISTERED |
| `confirmUpsRegistration` (UPS접수) | `warehouse.ts:382` | PACKED |
| `undoUpsRegistration` (UPS등록취소) | `warehouse.ts:418` | WAREHOUSED |
| `confirmDeparture` (출고확정처리) | `warehouse.ts:485` | IN_TRANSIT |
| `undoOutbound` (출고취소) | `warehouse.ts:513` | PACKED |
| `cancelInbound` (입고취소) | `orders.ts` 내 `getHeldPreviousStatus` 패턴 | REGISTERED 또는 SCHEDULED |

**즉 Issue #635(Task A~D)로 이번 스프린트에 구현한 창고관리 기능 전체가, 정작 그 기능의 주 사용 대상인 AGENCY 역할에서는 UI는 뜨지만 액션 실행 시 전부 500으로 막혀있는 상태.** `WAREHOUSE_ROLES` 상수 자체엔 AGENCY가 명시적으로 포함되어 있어(기능을 쓰게 하려는 의도가 명확함) 설계 의도와 실제 동작이 불일치한다.

## 참고 — PR#646(Task C) 리뷰 시 발견했던 관련 정황

PR#646 검토 당시 Baker가 `ROLE_PERMISSIONS[OPERATOR]`에 `WAREHOUSED/PACKED/RELEASED/IN_TRANSIT`를 추가한 것을 발견했으나, `OPERATOR`는애초 `WAREHOUSE_ROLES`에 포함되지 않아 실질적 효과가 없는 변경이라 "블로커 아님, 의도 확인 차 남겨둠" 정도로만 코멘트했었다(승인 코멘트 참조). 지금 보면 **원래 필요했던 건 `AGENCY` 항목 추가였는데 `OPERATOR`로 잘못 넣은 것으로 추정** — 이번 수정 시 그 부분도 함께 정리 필요.

## 임시 조치

없음 (AGENCY 역할 사용자는 창고관리 기능 전체를 사용할 수 없는 상태로 방치 중 — 즉시 수정 필요).

## 목표 구현

`ROLE_PERMISSIONS`에 `[USER_ROLES.AGENCY]` 항목 추가. 위 표의 9개 target 상태(`REGISTERED, SCHEDULED, WAREHOUSED, PACKED, RELEASED, IN_TRANSIT`)를 포함해야 함. `WAREHOUSE_ROLES` 게이트가 이미 조직 스코프(AGENCY는 본인 소속 화주만)를 각 액션 내부에서 별도로 검증하고 있으므로, `ROLE_PERMISSIONS[AGENCY]`는 "상태값 화이트리스트" 역할만 하면 됨(추가 조직 스코프 로직 불필요, 이미 각 액션에 있음).

PR#646에서 잘못 추가된 `ROLE_PERMISSIONS[OPERATOR]`의 확장분(`WAREHOUSED/PACKED/RELEASED/IN_TRANSIT`)을 유지할지 원복할지는 담당자 판단 — OPERATOR가 실제로 이 기능을 써야 할 의도가 있었는지 불명확하므로 배정 시 함께 확인 요청.

## 관련 파일

- `src/lib/logistics/status-machine.ts` (35-40행 `ROLE_PERMISSIONS`)
- `src/app/actions/operations/warehouse.ts`
- `src/app/actions/operations/orders.ts`
- `tests/unit/logistics/status-machine.test.ts` (AGENCY 케이스 회귀 테스트 추가 필요)

## 예상 공수

Low (0.5일 이내 — 권한 목록 추가 + 회귀 테스트 + AGENCY 역할로 9개 액션 전부 실제 동작 확인)

## 우선순위

**P1 — 즉시**: 최근 스프린트(Issue #635 A~D) 전체 기능이 실사용 역할(AGENCY)에서 동작 불능 상태

---

## 추가 발견 (2026-07-22, Jaison) — PR#656만으로는 불충분, 별도 RLS 레벨 결함 확인

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

**테스트 데이터 상태**: 진단 과정에서 `303f3ee1-...` 오더를 service_role로 WAREHOUSED까지 전이시켰다가 REGISTERED로 되돌려놓음 — 재검증 시 그대로 사용 가능.
