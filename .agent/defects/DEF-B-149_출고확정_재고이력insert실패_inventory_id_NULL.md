# DEF-B-149: 출고확정(confirmOutbound) 시 재고이력 insert 실패 — inventory_id NULL 제약위반 (조용한 실패, 3주 이상 재발)

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | Edward 지시로 금일 원격 Vercel UPS 출고 오류 조사 중, Aiden이 `get_runtime_errors`로 확인 |
| **긴급도** | High (사용자에게는 노출되지 않는 조용한 실패이며 2026-09-09부터 매 출고확정마다 재발 중 — 재고 이력/추적 데이터가 계속 유실되고 있을 가능성) |
| **발견일** | 2026-09-30 (최초 발생은 2026-09-09로 추정) |

## 현상

2026-09-30 17:08:42 KST(UTC 08:08:42), 오더 ZEN-2026-000019 출고확정 처리 중 아래 오류 발생:

```
confirmOutbound history insert error: {"code":"23502","message":"null value in column \"inventory_id\" of relation \"zen_inventory_history\" violates not-null constraint"}
```

동일 오류가 Vercel 로그 기준 **2026-09-09부터 2026-09-30까지 매번 재발**(count 기준 최소 1회/조회기간, 조회 윈도우가 24h라 실제 누적 건수는 더 많을 것으로 추정). **사용자 화면에는 전혀 노출되지 않음** — 출고확정 자체는 정상 완료된 것으로 보임.

## 원인

[`src/app/actions/operations/warehouse.ts:126-184`](../../src/app/actions/operations/warehouse.ts#L126-L184) `confirmOutbound()`:

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

if (historyError) {
  logger.error("confirmOutbound history insert error:", historyError);
}
```

`zen_inventory_history` 테이블의 `inventory_id` 컬럼이 NOT NULL 제약인데, insert 페이로드에 `inventory_id` 필드 자체가 누락되어 있음(출고 대상 재고 레코드의 `inventory_id`를 안 채우고 `reference_id`(오더 ID)만 채움 — 스키마 요구사항과 실제 insert 코드가 불일치). 이 오류가 `logger.error`로 로깅만 되고 **함수는 이 실패와 무관하게 `return { success: true, ... }`를 반환**해 상위 UI/호출자에게 실패가 전혀 전달되지 않음 — GOV_COMMON.md "실패 관측성 의무"상 로깅 자체는 되고 있으나, 반환값에 실패가 반영되지 않아 사용자·운영자 모두 인지 못 하는 상태.

## 영향 범위

- 출고 시점의 재고 변동 이력(`zen_inventory_history`)이 매번 누락되고 있어, 재고 추적/감사(audit trail) 데이터가 부정확할 수 있음
- 출고확정 자체(오더 상태 RELEASED 전환)는 정상이므로 배송 프로세스에는 영향 없음 — 데이터 무결성/재고 리포트 정확성 문제로 국한

## 권장 조치 (DoD)

- [ ] insert 페이로드에 `inventory_id` 채우기 — 어느 재고 레코드를 참조해야 하는지 확인(패키지별 `inventory_id` 매핑 필요, `packages`/`zen_order_packages` 조회 로직과 연계 검토)
- [ ] 컬럼이 정말 오더 단위가 아닌 재고품목 단위 이력이 맞는지 스키마 설계 의도 재확인 — 현재 코드처럼 오더 전체를 한 건으로 기록하는 게 맞다면 스키마의 NOT NULL 제약을 완화하거나 설계를 변경
- [ ] 수정 후 최근 3주간(2026-09-09~09-30) 누락된 출고 이력 백필(backfill) 필요 여부 검토
- [ ] `historyError` 발생 시 `success:true`를 그대로 반환하지 않도록 — 최소한 경고성 필드(예: `historyWarning`)를 반환값에 포함해 향후 동일 패턴 재발 시 조기 발견 가능하게 개선
- [ ] 회귀 테스트 추가

## 파일 소유권 확인

`git log --follow -- src/app/actions/operations/warehouse.ts` — Baker(10)/Dave(1)/Mike(2) 등 Team B 주도(일부 D_Kai/B_Kai Team A 커밋 혼재하나 소수) → **Team B 담당**
