# DEF-B-015: `zen_order_rate_snapshots` AGENCY UPDATE/INSERT RLS 누락 — 입고처리 중량/부피 변경 시 예상운임 재계산이 조용히 실패

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-27 |
| **보고자** | jungjs (Jaison) — `/ko/warehouse/inbound`을 `agency@zenith.kr`로 실사용 중 지적 |
| **긴급도** | High |
| **우선순위** | P1 |
| **관련 선행 작업** | DEF-B-014 / TASK-B-221 / Issue #879 (SELECT만 수정, 이번 건 원인 제공) |

## 현상

`agency@zenith.kr`로 `/ko/warehouse/inbound`에서 UPS 오더의 중량/크기를 반복 변경 후 "측정값 저장"을 눌러도, 화면·DB 상의 예상운임(`zen_order_rate_snapshots.applied_unit_price`)이 **전혀 갱신되지 않음**. 서버 로그에는 `saveInboundMeasurements` 호출이 정상적으로 4회 찍혀있고(중량 5.89→6.89→7.89→8.89kg), `zen_order_packages.gross_weight`는 실제로 8.89로 정상 반영됐으나, `zen_order_rate_snapshots`는 과거(55kg 테스트, ADMIN 계정으로 수행) 값 `1,852,880 KRW`에 그대로 고정됨. 에러 로그는 전혀 없음(조용한 실패).

## 원인 (실측 검증 완료)

`zen_order_rate_snapshots`의 UPDATE/INSERT RLS 정책을 확인한 결과:

```sql
-- UPDATE 정책 (org_members_can_update_rate_snapshots)
USING/WITH CHECK: is_org_member(auth.uid(), o.shipper_id)   -- SHIPPER 소속만 허용

-- INSERT 정책 (org_members_can_insert_rate_snapshots)
WITH CHECK: is_org_member(auth.uid(), o.shipper_id)         -- SHIPPER 소속만 허용
```

**AGENCY(`agency_org_id`) 매칭 조건이 UPDATE/INSERT 어느 쪽에도 없음** — DEF-B-014(TASK-B-221)에서 **SELECT 정책만** 추가하고 UPDATE/INSERT는 스코프에서 빠뜨렸음(제가 DEF-B-014를 "예상운임이 화면에 안 보인다"는 조회 문제로만 스코핑한 것이 원인 — 제 책임).

실측 재현(REST API, AGENCY 토큰으로 직접 UPDATE 시도):
```bash
curl -X PATCH ".../zen_order_rate_snapshots?order_id=eq.<ZEN-2026-000001>" \
  -H "Authorization: Bearer <agency@zenith.kr 토큰>" \
  -d '{"applied_unit_price": 999999}'
# → 응답: [] (0행 영향, 에러 없음 — RLS가 조용히 필터링)
```
→ 이후 DB 값 재확인 결과 변경 없음(`1852880.00` 그대로). **PostgreSQL RLS는 UPDATE 대상 행이 USING 조건을 만족하지 않으면 에러 없이 0행 처리** — `applyPackageMeasurements()`의 `.update(...)`/`.insert(...)` 호출이 `error`를 확인하지 않는 코드 구조(`src/app/actions/operations/orders.ts` 약 813~830행)와 결합해 완전히 조용한 실패가 됨.

참고: 세션 초반 성공했던 "55kg → 1,852,880" 재계산은 스크린샷상 "Tenant Admin" 계정(ADMIN 역할, `Super admins have full access` ALL 정책으로 무제한 허용)으로 수행된 것이라 문제가 드러나지 않았음.

## 조치안 (Jaison 확정 설계)

`zen_order_packages`/DEF-B-014의 SELECT 정책과 동일한 `agency_org_id` 패턴으로 UPDATE·INSERT 정책 추가:

```sql
CREATE POLICY "Agency can update shipper order rate snapshots"
ON public.zen_order_rate_snapshots
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM zen_orders
    WHERE zen_orders.id = zen_order_rate_snapshots.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM zen_orders
    WHERE zen_orders.id = zen_order_rate_snapshots.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Agency can insert shipper order rate snapshots"
ON public.zen_order_rate_snapshots
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM zen_orders
    WHERE zen_orders.id = zen_order_rate_snapshots.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
  )
);
```

GRANT는 DEF-B-014에서 이미 `SELECT, INSERT, UPDATE`를 `authenticated`에 부여해뒀으므로 추가 GRANT는 불필요(재확인만 할 것).

## 관련 Task
- `TASK-B-222` (배정)

## 관련 파일
- `supabase/migrations/` 신규 마이그레이션
- `src/app/actions/operations/orders.ts` — `applyPackageMeasurements()` (약 725~865행)
