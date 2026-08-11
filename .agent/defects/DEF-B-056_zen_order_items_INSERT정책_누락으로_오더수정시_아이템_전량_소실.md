# DEF-B-056 (Critical) — `zen_order_items` INSERT RLS 정책 누락으로 오더 수정 저장 시 아이템 전량 소실

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-08-11 |
| **발견 경위** | JSJung — ZEN-2026-000008 오더에서 아이템 HS코드를 설정해달라고 요청 → Jaison 확인 결과 해당 오더 아이템이 0건. `zen_order_edit_log`에 방금(14:38:14) `updateOrder()`를 통한 실제 수정 이력이 남아있어 원인 추적 |
| **긴급도** | Critical |
| **영향 범위** | **TASK-B-284(WAREHOUSED 부분 수정)만의 문제가 아님** — `updateOrder()`(`src/app/actions/operations/orders.ts`)는 저장 시마다 오더의 패키지+아이템을 전량 삭제 후 재삽입하는 기존 로직(TASK-B-284 이전부터 존재)이라, **오더 수정 기능이 존재한 이래 모든 "오더 수정 저장"이 잠재적으로 아이템을 소실시켜왔을 가능성**이 있음. TASK-B-284가 WAREHOUSED 단계 수정을 처음으로 실사용 가능하게 만들면서 우연히 드러난 것일 뿐, 근본 원인은 훨씬 이전부터 존재. |

## 근본 원인 (확정)

`zen_order_items` 테이블은 RLS가 활성화되어 있으나(`relrowsecurity=true`) **정책이 SELECT 1건뿐**:

```sql
-- pg_policy 조회 결과 (2026-08-11 fresh 상태)
"Users can view items of accessible orders" | SELECT | USING (true)
```

INSERT/UPDATE/DELETE 정책이 **전혀 없음**. 대조군인 `zen_order_packages`는 SELECT/INSERT/UPDATE/DELETE 전부 조직 소속 기준(`is_org_member`)+Admin+Agency까지 정확히 갖춰져 있어, `zen_order_items`만 누락된 것이 명백한 비대칭.

`updateOrder()`가 아이템을 재삽입할 때 쓰는 클라이언트는 `validateUserAction()`이 반환하는 **사용자 세션(authenticated) 클라이언트**(service_role 아님):

```ts
// src/app/actions/operations/orders.ts
if (pkg.items && pkg.items.length > 0) {
  const itemsToInsert = pkg.items.map(item => ({ ... }));
  await orderRepo.insertItems(itemsToInsert);   // ← 반환값(error) 미확인
}
```

`insertItems()`는 내부적으로 `this.db.from('zen_order_items').insert(items)`를 호출하는데, INSERT 정책이 없는 상태에서 authenticated 롤로 실행하면 RLS 위반으로 실패한다 — **직접 재현 확인**:

```sql
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub','<real-user-uuid>','role','authenticated')::text, true);
INSERT INTO public.zen_order_items (order_id, package_id, item_name, quantity, unit_price, currency, hs_code)
VALUES (...);
-- ERROR:  new row violates row-level security policy for table "zen_order_items"
```

`updateOrder()`는 이 insert 결과의 `error`를 전혀 확인하지 않으므로, 실패가 **완전히 조용히** 삼켜지고 함수는 정상 성공(200) 응답을 반환한다.

**정확한 소실 메커니즘 (직접 재현으로 확정)**: `zen_order_items`는 DELETE 정책도 없어 `deleteItemsByOrderId()` 자체는 **0행 삭제(no-op, 에러 없음)** — 기존 아이템은 이 시점엔 그대로 남아있다. 그런데 이어지는 `deletePackagesByOrderId()`는 `zen_order_packages`의 정상적인 DELETE 정책 덕분에 **실제로 성공**하고, `zen_order_items.package_id`가 `zen_order_packages(id)`를 `ON DELETE CASCADE`로 참조하므로 **패키지 삭제의 FK 캐스케이드가 items 자체 DELETE 정책 부재와 무관하게 기존 아이템을 함께 제거**한다(직접 재현: 정책 없는 상태에서 패키지 DELETE 1건 실행 시 연결된 아이템도 1→0으로 사라짐 확인). 그 다음 신규 패키지(새 id)가 정상 삽입되고, 신규 아이템 삽입만 RLS 위반으로 조용히 실패 — 최종적으로 아이템 0건.

## 재현 절차

1. `ZEN-REPRO-001`(WAREHOUSED+UPS) 오더 + 패키지 + 아이템 1건을 직접 DB에 생성
2. 실제 dev 서버(port 3000, TeamB_Dev HEAD)에서 `james@sntl.co.kr`로 로그인 후 `/ko/orders/<id>/edit` 접속 → 폼에 아이템이 정확히 로드됨(`packages.0.items.0.item_name = 'Repro Test Item'`) 확인 — **읽기 경로는 정상**
3. `SET ROLE authenticated` + JWT claim 시뮬레이션으로 `zen_order_items` 직접 DELETE 시도 → `DELETE 0`(no-op) 확인, 아이템은 그대로 남음
4. 같은 세션에서 `zen_order_packages` 직접 DELETE 시도 → `DELETE 1`(성공) 확인 직후 연결된 아이템이 FK CASCADE로 0건이 됨을 확인
5. 별도로 동일 세션에서 `zen_order_items` 직접 INSERT 시도 → `ERROR: new row violates row-level security policy` 확인

## 수정 방향

1. **신규 마이그레이션**: `zen_order_items`에 `zen_order_packages`와 동일한 패턴(조직 소속 기준 `is_org_member(auth.uid(), zen_orders.shipper_id)` join, Admin ALL, Agency 관리 정책)으로 INSERT/UPDATE/DELETE 정책 추가.
2. **`updateOrder()` 방어 코드 추가**: `insertItems()`(및 가능하면 `insertPackage`/`deleteItemsByOrderId`/`deletePackagesByOrderId`도 함께) 반환값의 `error`를 확인해 실패 시 명시적으로 `throw` — 향후 유사한 조용한 실패가 재발해도 사용자가 즉시 알 수 있도록. **단, 이번 수정은 이미 발생한 데이터 손실 자체를 되돌리지는 못함** (ZEN-2026-000008 등 이미 소실된 아이템은 복구 불가 — 원본 데이터 없음).
3. **회귀 테스트 (필수)**: 실 DB 기반 — ①`updateOrder()`로 아이템 포함 오더 저장 시 아이템이 실제로 DB에 남아있는지 확인(현재 상태로는 FAIL해야 정상 — 되돌리기 검증의 역할을 이 자체가 수행) ②정책 제거 시 재현 ③`insertItems()` 강제 에러 시 `updateOrder()`가 throw하는지 확인.

## [후속 참고]

`deleteItemsByOrderId()`는 정책 부재로 사실상 데드코드(항상 0행) — 수정 시 items DELETE 정책도 함께 추가하면 이 무의미한 호출이 실제로 동작하게 되어 정합성이 개선된다(패키지 캐스케이드에 의존하지 않는 명시적 삭제).
