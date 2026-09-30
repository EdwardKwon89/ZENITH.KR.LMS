# DEF-B-149: 출고확정 시 `zen_inventory_history` insert 실패 — SKU 재고 모델과 오더 흐름 간 구조적 불일치 (JSJung 확정: insert 제거)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1202](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1202) |
| **발견 경위** | Edward 지시로 Aiden이 원격 Vercel UPS 출고 오류 조사 중 `get_runtime_errors`로 발견(2026-09-30) → Jaison이 스키마·타 모듈까지 추적해 근본원인 재정의(2026-10-01), JSJung 확정 |
| **긴급도** | High → **해소 방향 확정으로 조치 자체는 단순화됨**(insert 제거) |
| **발견일** | 2026-09-30 |

## 현상

`confirmOutbound()`(출고확정) 처리 시마다 아래 오류가 재발 중(로그 확인 가능 범위 2026-09-09~09-30, 매 실행마다 확인):
```
confirmOutbound history insert error: {"code":"23502","message":"null value in column \"inventory_id\" of relation \"zen_inventory_history\" violates not-null constraint"}
```
사용자 화면에는 노출되지 않는 조용한 실패 — 출고확정 자체(오더 상태 RELEASED 전환)는 정상 완료.

## 근본 원인 — Jaison 심층 분석: "누락"이 아니라 애초에 구조적으로 불가능

[`warehouse.ts confirmOutbound()` L163-174](../../src/app/actions/operations/warehouse.ts#L163-L174):
```ts
const { error: historyError } = await supabase
  .from("zen_inventory_history")
  .insert({
    org_id: orgId,
    transaction_type: "OUTBOUND" as any,
    change_qty: -totalQty,
    result_qty: 0,
    reference_id: orderId,
    remarks: `출고확정: ${order.order_no}`,
    created_by: user.id,
  });
if (historyError) { logger.error("confirmOutbound history insert error:", historyError); } // 조용히 삼킴
```

`zen_inventory_history.inventory_id`는 [`20260425115000_create_zen_inventory.sql`](../../supabase/migrations/20260425115000_create_zen_inventory.sql)에서 `NOT NULL REFERENCES public.zen_inventory(id)`로 정의된 **필수 FK**다. `zen_inventory`/`zen_inventory_history`는 [`src/app/actions/operations/inventory.ts`](../../src/app/actions/operations/inventory.ts)가 관리하는 **완전히 별개의 기능** — `/inventory` 관리자 화면에서 조직이 SKU 단위로 보유한 실물 재고(`sku_code`/`item_name`/`on_hand_qty`)를 수동 조정(`adjustInventory()`)할 때 쓰는 감사 원장(ledger) 테이블이다.

**UPS 오더는 이 SKU 재고와 전혀 연결되어 있지 않다** — 이 비즈니스는 화주의 화물을 그대로 포워딩하는 구조라, 오더 품목이 `zen_inventory`의 어떤 레코드에도 매핑되지 않는다. `confirmOutbound()`는 `zen_inventory` 레코드를 조회하거나 생성하는 로직 자체가 없어 `inventory_id`를 채울 방법이 원천적으로 없다.

**도입 시점**: `git log -S "zen_inventory_history" -- warehouse.ts` 확인 결과 최초이자 유일한 도입 커밋은 `313301a43`([OpenCode] IMP-074, TASK-070, 초기 스캐폴드 단계) — "출고 시 재고 이력도 남기자"는 취지로 추가됐으나 SKU 기반 스키마와의 연동 없이 형식만 흉내 낸 것으로 보임. 즉 **"3주+ 재발"이 아니라 도입 시점부터 단 한 번도 성공한 적이 없었을 가능성이 높다**(로그 보존 기간상 2026-09-09부터만 확인 가능했을 뿐).

## JSJung 확정 방향 (2026-10-01)

**Option 1 채택**: `confirmOutbound()`의 `zen_inventory_history` insert 시도 자체를 제거한다. SKU 재고 이력 개념이 UPS 프레이트 포워딩 오더 흐름에 맞지 않으므로, `zen_inventory` 레코드를 억지로 생성/매핑(Option 2)하는 대신 애초에 안 맞는 기능 호출을 제거하는 쪽으로 정리.

- 백필(backfill) 불필요 — 애초에 이 insert가 정상 작동한 적이 없어(위 도입 시점 분석) 복구할 "누락분" 자체가 존재하지 않음
- `/inventory` 관리자 화면(`adjustInventory()` 등 SKU 재고 수동 조정 기능) 자체는 무관하게 그대로 유지 — 이번 제거 대상은 `confirmOutbound()` 내부의 이 특정 insert 호출뿐

## 권장 조치 (DoD)

1. `confirmOutbound()`에서 `zen_inventory_history` insert 블록 제거(관련 조회 코드 `pkgsWithoutIntlRef` 등 다른 로직과 섞여 있지 않은지 확인 후 해당 블록만 정확히 제거)
2. 제거 후에도 `confirmOutbound()`의 나머지 동작(상태 전환, `revalidatePath` 등)이 영향 없는지 회귀 테스트로 확인
3. 관련 기존 테스트(있다면 `zen_inventory_history` insert를 mock/assert하는 테스트)가 있는지 확인 후 함께 정리
4. `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` 갱신
