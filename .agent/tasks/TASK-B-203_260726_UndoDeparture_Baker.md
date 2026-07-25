# TASK-B-203: 출고확정처리 되돌리기 — IN_TRANSIT → RELEASED

| 항목 | 내용 |
|:-----|:------|
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 개요

사용자 요청: "IN_TRANSIT에서 RELEASED로 되돌릴 수 있는 기능이 필요함, 즉 모든 전단계로 이전될 수 있는 취소기능이 있어야 함."

현재 `zen_orders.status` 전이는 아래처럼 구성되어 있음(Jaison 조사 완료):
```
REGISTERED ──(confirmInbound)──▶ WAREHOUSED
WAREHOUSED ──(confirmUpsRegistration, "[UPS등록]")──▶ PACKED
   PACKED ──(undoUpsRegistration, "[UPS등록취소]")──▶ WAREHOUSED   ✅ 되돌리기 있음
PACKED ──(confirmOutbound, "[출고확정]")──▶ RELEASED
   RELEASED ──(undoOutbound, "[출고취소]")──▶ PACKED              ✅ 되돌리기 있음
RELEASED ──(confirmDeparture, "[출고확정처리]")──▶ IN_TRANSIT
   IN_TRANSIT ──(❌ 없음)──▶ RELEASED                              ❌ 되돌리기 없음 — 이번 Task
IN_TRANSIT ──(UPS Cron 자동, SHXK 'DL')──▶ DELIVERED
```

`confirmDeparture`(RELEASED→IN_TRANSIT)만 유일하게 되돌리기 함수가 없음. 이번 Task는 그 빈 자리를 채우는 `undoDeparture`(IN_TRANSIT→RELEASED) 신설.

## 조치안 (Jaison 진단 완료 — 기존 패턴 그대로 미러링)

`src/app/actions/operations/warehouse.ts`의 `undoOutbound`(613-635행) 패턴을 그대로 참고해 `confirmDeparture` 바로 아래에 신설:

```ts
// ─────────────────────────────────────────────
// C-5: 출고확정처리 취소 — IN_TRANSIT → RELEASED
// ─────────────────────────────────────────────

export async function undoDeparture(orderId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) throw new Error("권한이 없습니다.");

  const orderRepo = new OrderRepository(supabase);
  const { data: order } = await orderRepo.findById(orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== OrderStatus.IN_TRANSIT) {
    throw new Error("IN_TRANSIT 상태의 오더만 출고확정처리를 취소할 수 있습니다.");
  }

  if (profile.role === USER_ROLES.AGENCY) {
    const shipperIds = await getAgencyShipperIds(supabase, profile.org_id);
    if (!shipperIds || !shipperIds.includes((order as any).shipper_id)) {
      throw new Error("본인 소속 화주의 오더만 처리할 수 있습니다.");
    }
  }

  await updateOrderStatus(orderId, OrderStatus.RELEASED, "[출고확정처리 취소]");

  revalidatePath("/(dashboard)/warehouse/departure", "page");
  revalidatePath("/(dashboard)/orders", "page");

  return { success: true };
}
```

**UI 위치**: `src/components/warehouse/DepartureConfirmForm.tsx`의 "오늘의 이력" 패널(278-338행, `getTodayDepartureHistory()` 기반)에 각 행마다 "되돌리기" 버튼 추가 — `OutboundProcessForm.tsx`의 기존 `undoOutboundTarget`/확인 모달 패턴(63-64, 798-820행)을 참고해 동일하게 구현.

**주의**: `undoOutbound`는 되돌리기 시 `voidUpsLabel(orderId)`을 호출하는데, 이건 IMP-154(SHXK removeorder 실패가 조용히 삼켜지는 버그)의 영향을 받는 함수임. `undoDeparture`는 라벨을 취소하는 게 아니라 단순 상태만 되돌리는 것이므로 `voidUpsLabel` 호출은 **불필요**(라벨은 그대로 유지, 단지 오더 상태만 RELEASED로 되돌아감) — 포함하지 말 것.

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조(stale 브랜치 4회·채번 절차 누락 5회·빌드 미확인 1회 누적, 최근 TASK-B-199/200에서는 실제 컴포넌트 렌더링 기반 테스트로 양호했음 — 그 방식 유지).

## 착수 체크리스트

- [ ] `./scripts/next-task-number.sh B`로 채번 재확인
- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 브랜치 생성
- [ ] `warehouse.ts`에 `undoDeparture()` 함수 추가
- [ ] `DepartureConfirmForm.tsx` 이력 패널에 되돌리기 버튼 + 확인 모달 추가
- [ ] 실제 컴포넌트/함수 호출 기반 회귀 테스트 추가(IN_TRANSIT→RELEASED 정상 동작, 다른 상태에서 호출 시 에러 반환 검증)
- [ ] `npm run build`·`npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 로컬에서 IN_TRANSIT 오더 → 되돌리기 → RELEASED 전환 및 출고처리 화면에 재노출 확인

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋
2. task file `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔
3. `.agent/ACTIVE_TASK.md` 상태 동시 반영
4. `check-R17-DoD` 실행 후 통과 확인
5. 문서 커밋
6. PR 생성 (`feature/teamb-203-... → TeamB_Dev`)

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
