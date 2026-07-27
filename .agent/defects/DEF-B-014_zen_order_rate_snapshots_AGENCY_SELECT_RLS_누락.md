# DEF-B-014: `zen_order_rate_snapshots` AGENCY SELECT RLS 누락 — 예상운임이 AGENCY 계정에 항상 빈 값으로 표시됨

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-27 |
| **보고자** | jungjs (Jaison) — `/ko/warehouse/inbound`을 `agency@zenith.kr`로 실사용 중 지적 |
| **긴급도** | High |
| **우선순위** | P1 |
| **관련 선행 작업** | TASK-B-220 / PR#878 (Issue #877, DEF-B-013) |

## 현상

TASK-B-220(PR#878, 병합 완료)에서 구현한 "예상운임 상시 표시" 기능이 `agency@zenith.kr`로 로그인 시 항상 빈 값(`-`)으로만 표시됨. `ZEN-2026-000001` 오더는 실제로 `zen_order_rate_snapshots`에 유효한 값(`1,852,880 KRW`)이 존재하는데도 화면에 반영되지 않음.

## 원인 (실측 검증 완료)

1. ADMIN 계정으로 REST API 직접 조회 → 정상 반환:
   ```
   [{"applied_unit_price":1852880.00,"applied_currency":"KRW"}]
   ```
2. 동일 쿼리를 `agency@zenith.kr`(AGENCY 역할) 토큰으로 재현 → **빈 배열**:
   ```
   []
   ```
3. `zen_order_rate_snapshots`의 기존 SELECT 정책(`org_members_can_view_rate_snapshots`)은 `is_org_member(auth.uid(), o.shipper_id)`만 체크 — 이 함수는 `zen_profiles.org_id = p_org_id`(정확한 소속 조직 일치)만 확인하고, **AGENCY가 대행 관리하는 화주(shipper) 오더에 대한 `zen_orders.agency_org_id` 매칭 로직이 전혀 없음**.
4. 실제 데이터 확인: 해당 오더의 `agency_org_id`(`dc0f1c0c-...`)는 `agency@zenith.kr` 프로필의 `org_id`와 정확히 일치함 — 즉 정책만 있었다면 정상 조회됐을 상황.

이 패턴은 이번 세션에서만 **7번째** 반복 발생(DEF-114/116/117/120/126/B-002/B-010에 이어) — `zen_order_rate_snapshots` 테이블이 이번에 새로 노출된 사례.

## 조치안 (Jaison 확정 설계)

`zen_order_packages`의 기존 AGENCY SELECT 정책과 동일 패턴으로 마이그레이션 추가:

```sql
CREATE POLICY "Agency can view shipper order rate snapshots"
ON public.zen_order_rate_snapshots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM zen_orders
    WHERE zen_orders.id = zen_order_rate_snapshots.order_id
      AND zen_orders.agency_org_id = (
        SELECT zen_profiles.org_id FROM zen_profiles WHERE zen_profiles.id = auth.uid()
      )
  )
);
```

상세 구현 지시: `.agent/tasks/TASK-B-221_...md`

## 관련 파일
- 신규 마이그레이션: `supabase/migrations/2026072*_defb014_rate_snapshots_agency_select_rls.sql`
- 관련 코드: `src/app/actions/operations/orders.ts` (`getOrderByBarcodeOrNo`, TASK-B-220 신규 코드)
