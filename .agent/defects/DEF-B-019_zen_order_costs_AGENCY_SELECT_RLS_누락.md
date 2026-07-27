# DEF-B-019: `zen_order_costs` AGENCY SELECT RLS 누락 — `/admin/ups-actual-charges` 예상청구액 AGENCY 계정에 0으로 표출

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-27 |
| **보고자** | jungjs (Jaison) — `/ko/admin/ups-actual-charges`를 AGENCY 계정으로 사용 중 지적 |
| **긴급도** | High |
| **우선순위** | P1 |
| **관련 Issue** | [#901](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/901) |

## 현상

`/admin/ups-actual-charges`에서 AGENCY 계정으로 오더(`ZEN-2026-000001`) 조회 시 "예상 청구액(Estimated)"이 항상 **0**으로 표시됨. 같은 오더를 ADMIN 계정으로 조회하면 정상적으로 `526,236.81 KRW`가 표시됨(스크린샷 비교 확인).

## 원인 (실측 검증 완료)

`getUpsChargeReconciliation()`(`src/app/actions/finance/ups-actual-charges.ts:248`)가 예상비용 합산을 위해 `zen_order_costs`를 SELECT하는데, 이 테이블의 RLS 정책은:

```
Shippers can view their order costs (SELECT) — shipper org 소속 또는 ADMIN만 허용
Admins can manage order costs (ALL) — ADMIN/SUPER_ADMIN만
```

**AGENCY(`agency_org_id`) 매칭 SELECT 정책이 전혀 없음.** GRANT는 정상(authenticated에 SELECT 등 부여돼 있음 — RLS만 문제).

실측 재현(REST API, AGENCY 토큰으로 직접 SELECT):
```bash
curl ".../zen_order_costs?order_id=eq.<ZEN-2026-000001>&select=cost_type,unit_price,quantity" \
  -H "Authorization: Bearer <agency@zenith.kr 토큰>"
# → [] (빈 배열, 에러 없음 — RLS가 조용히 필터링)
```
→ `getUpsChargeReconciliation()`의 `estimated` 합산이 0으로 귀결됨. 같은 원인으로 이슈 #2(예상청구액 세부 항목 미표출)도 항목 자체를 못 읽어오니 영향을 받으나, 세부 항목 UI는 별도 결정 대기 중(2번 항목은 방향 결정 보류).

## 조치안 (Jaison 확정 설계)

기존 `zen_order_packages`/`zen_order_rate_snapshots` 등에 적용한 것과 동일한 `agency_org_id` 매칭 패턴으로 SELECT 정책 추가:

```sql
CREATE POLICY "Agency can view shipper order costs"
ON public.zen_order_costs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM zen_orders
    WHERE zen_orders.id = zen_order_costs.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
  )
);
```

기존 "Shippers can view their order costs"·"Admins can manage order costs" 정책은 건드리지 않음(RLS는 OR 결합).

## 관련 Task
- `TASK-B-225` (배정)

## 관련 파일
- `src/app/actions/finance/ups-actual-charges.ts` (`getUpsChargeReconciliation()`)
