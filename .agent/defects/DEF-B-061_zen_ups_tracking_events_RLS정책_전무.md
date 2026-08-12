# DEF-B-061 (High) — `zen_ups_tracking_events` RLS 정책 전무로 UPS 트래킹 이벤트 화면 항상 빈 목록

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-08-12 |
| **발견 경위** | JSJung이 TASK-B-290 검증을 위해 ZEN-2026-000001에 실제 트래킹 이벤트 14건을 저장하고 오더상세 `/ups-detail` 화면에서 확인하려 했으나 "UPS 트래킹 이벤트가 없습니다"만 표출 → Jaison 원인 확정 |
| **긴급도** | High |
| **영향 범위** | `zen_ups_tracking_events` 테이블 전체 — 이 테이블을 조회하는 모든 화면/기능(오더상세 트래킹 이벤트 목록 등)이 어떤 사용자·역할로도 항상 빈 결과만 반환 |

## 근본 원인 (확정 완료)

`zen_ups_tracking_events`는 RLS가 ENABLE되어 있으나([20260626000000_ups_008_labels_tracking_shxk_map.sql:52](../../supabase/migrations/20260626000000_ups_008_labels_tracking_shxk_map.sql#L52)) SELECT를 포함한 어떤 정책도 정의된 적이 없음. 직접 확인:

```sql
select tablename, policyname, cmd, roles::text from pg_policies where tablename = 'zen_ups_tracking_events';
-- 0 rows
```

GRANT도 `service_role`에만 있고([20260707020000_def096_ups_agency_service_role_grants.sql:21](../../supabase/migrations/20260707020000_def096_ups_agency_service_role_grants.sql#L21)) `authenticated`에는 전혀 부여된 적이 없음.

`getUpsTrackingEvents()`([tracking.ts:269-285](../../src/app/actions/operations/tracking.ts#L269-L285))는 `validateUserAction()`으로 얻은 **일반 로그인 사용자 RLS 적용 클라이언트**로 조회 — RLS ENABLE + 정책 0건 = PostgreSQL 기본 거부(default-deny)로 어떤 역할이든 무조건 0건 반환. 실측: 관리자 권한(RLS 우회, service_role)으로 직접 INSERT한 14건이 DB엔 존재하지만(`select count(*)` service_role 기준 14) 화면에선 절대 표시되지 않음.

같은 트래킹 도메인 테이블과 비교(둘 다 정상):
- `zen_tracking_configs`: Admin ALL + "Users can view tracking of their own zen_orders"(SELECT) + "Agency can view tracking configs for shipper orders"(SELECT) 3종 정책 존재
- `zen_ups_labels`: `ups_labels_admin_policy`/`ups_labels_admin_all`(ALL) + `ups_labels_member_select_policy`/`ups_labels_authenticated_select`/`Agency can view shipper ups labels`(SELECT) 등 다수 정책 존재

`zen_ups_tracking_events`만 이 패턴에서 완전히 빠져 있음.

**선행 예견 이력**: Issue #1056(TASK-B-278) 완료 보고 시 "동일 RLS 패턴 7개 테이블(스냅샷/트래킹/정산/라벨문서 등) — 별도 DEF 채번 예정"으로 이미 언급됐던 항목 중 하나가 이번에 실제로 발현.

## 재현 절차

1. `zen_ups_tracking_events`에 임의 오더의 트래킹 이벤트를 service_role(관리자 권한)으로 INSERT
2. 해당 오더 소유 화주/에이전시/관리자 계정 어느 것으로 로그인해도 `/orders/[orderId]/ups-detail` 화면에서 "UPS 트래킹 이벤트가 없습니다" 표출
3. `pg_policies`에서 `zen_ups_tracking_events` 조회 시 0건 확인

## 수정 방향

`zen_tracking_configs` 정책 패턴([20260522002000_fix_rls_cascade_drop_profiles.sql:127-147](../../supabase/migrations/20260522002000_fix_rls_cascade_drop_profiles.sql#L127-L147), [20260723060000_def120_tracking_configs_agency_rls.sql](../../supabase/migrations/20260723060000_def120_tracking_configs_agency_rls.sql))을 `zen_ups_tracking_events`에 동일 적용:

```sql
GRANT SELECT ON public.zen_ups_tracking_events TO authenticated;

CREATE POLICY "Admins have full access to ups tracking events" ON public.zen_ups_tracking_events
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
);

CREATE POLICY "Users can view ups tracking events of their own zen_orders" ON public.zen_ups_tracking_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders o
    WHERE o.id = zen_ups_tracking_events.order_id
    AND (o.shipper_id = auth.uid()
         OR o.shipper_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()))
  )
);

CREATE POLICY "Agency can view ups tracking events for shipper orders" ON public.zen_ups_tracking_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_tracking_events.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);
```

과설계 금지 — 위 GRANT 1줄 + 정책 3개 외 추가 확장 금지.
