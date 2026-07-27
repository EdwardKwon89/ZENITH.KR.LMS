# DEF-127: `/orders/[orderId]/ups-detail` 화면 예상운임이 항상 0으로 표시됨 (Team A 소유 파일 — Aiden 배정 필요)

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-27 |
| **보고자** | jungjs (Jaison, Team B) — `http://localhost:3000/ko/orders/2ae0abae-a365-4a5f-a18b-92736fe9340f/ups-detail` 실사용 중 지적 |
| **긴급도** | High |
| **우선순위** | P1 |
| **비고** | **본 결함은 Team B 소유 파일이 아닌 Team A 소유 파일(`tisa.ts`, TASK-209/Gemini 작업물)에서 발생 — R-19 파일 소유권 원칙에 따라 Team B가 직접 수정하지 않고 Aiden에게 보고만 함(R-18)** |

## 현상

`/ko/orders/[orderId]/ups-detail` 화면(UPS 오더 상세)의 "운임 및 화물 구성" 카드에서 예상운임(`totalFreight`)이 실제 값과 무관하게 **항상 0**으로 표시됨. DB에는 정상적인 값(예: `ZEN-2026-000001`의 `zen_order_rate_snapshots.applied_unit_price = 526,236.81 KRW`, `metadata.platform.totalSellingPrice` 동일값)이 실제로 존재함.

## 원인 (코드 추적 완료)

1. `src/app/actions/operations/tisa.ts`(D_Kai 작성, TISA 다중 캐리어 정산 시스템)의 `getOrderRateSnapshot()`이 반환하는 `TisaSnapshotResult` 인터페이스에 **`metadata` 필드가 아예 없음**(`baseAmount`, `totalFreight` 등 자체 계산된 값만 반환 — `zen_order_rate_snapshots.metadata` 원본 JSON은 select도, 반환 객체에도 포함 안 됨).

2. `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`(Gemini/Riley 작성, TASK-209/Issue #794)에서:
   ```tsx
   <UpsOrderBreakdownCard
     ...
     snapshotMeta={(snapshot as any)?.metadata}   // ← snapshot에 metadata 필드 자체가 없어 항상 undefined
   />
   ```

3. `src/components/ups/UpsOrderBreakdownCard.tsx`(같은 TASK-209 작업물)에서:
   ```tsx
   const platformMeta = snapshotMeta?.platform;               // undefined
   const breakdown = platformMeta?.breakdown || {};            // {}
   const baseFreight = Number(breakdown.baseFreight || ... || 0);   // 0
   const totalFreight = Number(platformMeta?.totalSellingPrice || (baseFreight + fuelSurcharge + surgeFee + extraCharges));
   // = Number(undefined || 0) = 0
   ```

→ `snapshotMeta`가 항상 `undefined`이므로 breakdown 카드의 모든 하위 항목과 `totalFreight`가 0으로 귀결됨. **TASK-209에서 `getOrderRateSnapshot()`이 원본 metadata를 반환한다고 잘못 가정**하고 UI를 만든 것이 근본 원인.

## 조치안 (설계는 Aiden/Team A 확정 필요 — 참고용 제안)

`getOrderRateSnapshot()`(tisa.ts)의 select 쿼리에 `metadata` 컬럼 추가 + `TisaSnapshotResult`에 `metadata?: Record<string, unknown>` 필드 추가 + 반환 객체에 `metadata: snapshot.metadata` 포함하면 해결될 것으로 보임(간단한 수정). 다만 `tisa.ts`는 UPS 외 다른 운송수단(AIR/SEA/LAND)의 다중 캐리어 정산에도 쓰이는 공용 함수라, metadata 스키마가 캐리어마다 다를 수 있어 Team A 판단으로 영향범위 확인 후 확정 필요.

## 관련 파일 (모두 Team A 소유)
- `src/app/actions/operations/tisa.ts` — `getOrderRateSnapshot()`
- `src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`
- `src/components/ups/UpsOrderBreakdownCard.tsx`

## 관련 Task
- 미배정 — Aiden 확인 후 Team A 소속 Task로 발령 필요
