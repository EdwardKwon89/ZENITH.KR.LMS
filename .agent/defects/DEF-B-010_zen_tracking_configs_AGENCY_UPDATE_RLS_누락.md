# DEF-B-010: `zen_tracking_configs` AGENCY UPDATE RLS 누락 — DEF-123 tracking_no 동기화 침묵 실패 (6번째 재발)

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) — 실사용 중 UPS 등록 후 tracking_no 미반영 신고 → 원인 조사 |
| **긴급도** | High |
| **우선순위** | P1 |

## 현상 (실측 확인)

`agency@zenith.kr` 세션으로 UPS 오더(`ZEN-2026-000001`) 등록(PACKED 전환) 수행 → `zen_ups_labels`에는 실제 운송장번호(`1ZJ443D30439798553`)가 정상 저장됐으나, `zen_tracking_configs.tracking_no`는 갱신되지 않고 그대로 비어있음.

## 원인 (실측 확인)

`registerUpsOrder()`(`src/app/actions/operations/ups-labels.ts:329-338`, DEF-123/TASK-B-195 로직)가 UPS 등록 성공 시 아래 UPDATE를 실행:
```ts
await supabase.from('zen_tracking_configs')
  .update({ tracking_no: orderResult.trackingNo, updated_at: new Date().toISOString() })
  .eq('order_id', order.id);
```
`zen_tracking_configs`의 현재 RLS 정책:
| 정책 | 명령 | 대상 |
|:-----|:-----|:-----|
| Admins have full access to tracking configs | `ALL` | ADMIN/MANAGER/ZENITH_SUPER_ADMIN |
| Agency can view tracking configs for shipper orders | `SELECT`만 | AGENCY |
| Users can view tracking of their own zen_orders | `SELECT`만 | Shipper org member |

**AGENCY 역할에 UPDATE 정책이 전혀 없음.** `authenticated` 역할의 테이블 레벨 GRANT는 UPDATE 포함 정상(확인 완료) — 순수 RLS 정책 누락.

REST 직접 재현:
```
# agency@zenith.kr 세션으로 동일 UPDATE 시도
PATCH /zen_tracking_configs?order_id=eq.2ae0abae-... {"tracking_no":"1ZJ443D30439798553"}
→ HTTP 200, 응답 본문 [] (0건 갱신 — RLS가 조용히 필터링, 에러 없음)

# admin@zenith.kr 세션으로 동일 요청 (대조군)
→ HTTP 200, 1건 정상 갱신
```

DEF-114(`zen_orders`)/DEF-116(`checkLabelPermission`)/DEF-117(`zen_order_packages`/`zen_ups_labels`)/DEF-120(`zen_tracking_configs` SELECT)/DEF-126/DEF-B-002(`zen_invoices`)에 이은 **AGENCY `is_org_member`/RLS 커버리지 누락 패턴의 6번째 재발**입니다.

## 영향 범위

AGENCY 역할이 UPS 등록을 수행하는 모든 케이스에서 `zen_tracking_configs.tracking_no`가 실제 운송장번호로 갱신되지 않음 → `/tracking` 대시보드, 오더 상세 화면의 Tracking Number 컬럼이 계속 비어있거나 예전 값에 머무름. 에러가 없어 사용자/개발자 모두 인지하기 어려운 침묵 실패.

## 조치안 (Jaison 확정 설계)

기존 SELECT 정책과 동일한 `agency_org_id` 매칭 조건으로 UPDATE 정책 신규 추가(신규 마이그레이션):
```sql
CREATE POLICY "Agency can update tracking configs for shipper orders"
ON public.zen_tracking_configs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_tracking_configs.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_tracking_configs.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);
```

## 관련 Task
- `TASK-B-216` (배정 예정)

## 관련 파일
- `src/app/actions/operations/ups-labels.ts:294-355` (`registerUpsOrder`, 변경 불필요 — RLS만 정정)
- 원본 SELECT 정책 마이그레이션: `supabase/migrations/20260723060000_def120_tracking_configs_agency_rls.sql`
