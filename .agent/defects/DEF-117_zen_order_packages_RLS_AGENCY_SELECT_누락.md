# DEF-117: `zen_order_packages` SELECT RLS에 AGENCY 커버리지 없음 — UPS접수 여전히 침묵 실패

| 항목 | 내용 |
|:----|:----|
| **발견 경위** | DEF-116(PR#668) 병합 후에도 JSJung "달라진게 없어" 재보고 → 재조사 |
| **긴급도** | 즉시(Critical) |
| **발견자** | Jaison |
| **발견일** | 2026-07-22 |

## 현상

DEF-116(`checkLabelPermission`에 AGENCY 추가) 병합 후에도 `agency@zenith.kr`로 "UPS 등록 확정" 클릭 시 여전히 아무 변화 없음 — 오더 상태·`order_status_history`·`zen_ups_labels`·`zen_shxk_api_logs` 전부 무기록, 서버 로그도 무기록(`checkLabelPermission` 거부 시 추가된 `logger.warn`도 안 찍힘 — 즉 이번엔 그 체크는 통과했다는 뜻).

## 근본 원인

`registerUpsOrder()` → `lookupOrderPackages()`(`ups-labels.ts:31`)가 아래 쿼리로 패키지를 조회:
```ts
const { data: pkgs } = await supabase
  .from('zen_order_packages')
  .select('*, items:zen_order_items(*)')
  .eq('order_id', orderId)...
if (!pkgs || pkgs.length === 0) return { ..., error: 'Order has no packages' };
```
`agency@zenith.kr` 실제 세션으로 동일 쿼리를 직접 재현한 결과 **빈 배열(`[]`)이 반환됨**(HTTP 200, RLS가 조용히 필터링) — 실제로는 패키지가 1건 존재함(`service_role`로 조회 시 확인됨). 그 결과 `lookupOrderPackages`가 `'Order has no packages'` 에러를 반환하고, `registerUpsOrder`가 SHXK를 호출하기도 전에 조용히 실패 — 예외 없음, DB 기록 없음, 로그 없음(DEF-116과 동일한 "침묵 실패" 패턴이지만 원인은 완전히 다른 레이어).

`zen_order_packages`의 SELECT 정책(`supabase/migrations/20260529130000_fix_zen_order_packages_rls.sql`):
```sql
CREATE POLICY "Members can view own organization packages"
ON public.zen_order_packages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_packages.order_id
    AND is_org_member(auth.uid(), zen_orders.shipper_id)
  )
);
```
`is_org_member(auth.uid(), shipper_id)`는 **호출자 본인의 org_id가 shipper_id와 같은지**만 확인 — AGENCY(`agency@zenith.kr`, org_id=대리점 자신의 org)는 관리하는 화주(shipper, 별도 org)와 `zen_agency_shippers`로 연결되어 있을 뿐 org_id가 다르므로 항상 불일치. **DEF-114에서 `zen_orders` 테이블에 발견했던 것과 정확히 동일한 아키텍처 패턴의 결함이 `zen_order_packages`에도 그대로 있음** — `zen_orders`는 그때 `agency_org_id` 컬럼 기반 별도 정책(`agency_shipper_select_own_orders`)으로 이미 우회 경로가 있었지만, `zen_order_packages`에는 그런 정책이 아예 없음.

## 패턴 경고 — 3번째 반복

- DEF-114: `zen_orders` UPDATE RLS에 AGENCY 없음
- DEF-116: `checkLabelPermission()`(앱 레벨)에 AGENCY 없음
- **DEF-117(이번): `zen_order_packages` SELECT RLS에 AGENCY 없음**

같은 "AGENCY는 `is_org_member`(자기 org_id=shipper org_id) 패턴에 안 걸림" 문제가 테이블마다 개별적으로 반복 발견되고 있음. **이번 수정 시 `zen_order_packages` 하나만 고치지 말고, `is_org_member`를 사용하는 다른 정책들(특히 이 UPS접수/출고처리 플로우가 건드리는 테이블: `zen_order_items`, `zen_route_options`, `zen_order_routes` 등)도 함께 grep해서 동일 패턴이 더 있는지 전수 확인 요청.** (`zen_order_items`는 이번 조사에서 직접 확인한 결과 전체 공개형 정책이라 문제 없음 — 나머지는 미확인)

## 재현

테스트 오더 `303f3ee1-74b9-4828-8f76-4106bde4fd01`(`ZEN-2026-000001`)로 `agency@zenith.kr` 세션 직접 재현:
```
GET /rest/v1/zen_order_packages?order_id=eq.303f3ee1-...&select=*,items:zen_order_items(*)
→ [] (실제로는 1건 존재, service_role로는 조회됨)
```

## 임시 조치

없음 — 즉시 수정 필요.

## 목표 구현

`zen_order_packages`에 AGENCY 전용 SELECT 정책 추가(`zen_orders`의 `agency_org_id` 기반 패턴 참고, 또는 `zen_order_packages.order_id`로 `zen_orders.agency_org_id`를 조인해 확인):
```sql
-- 방향 제시용 예시, 그대로 적용 금지
CREATE POLICY "agency_select_order_packages" ON public.zen_order_packages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_packages.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);
```
UPDATE/INSERT/DELETE도 필요한지(`markAllPackagesIssued`가 UPDATE 함, `undoOutbound`/`voidUpsLabel` 경로의 `unlockAllPackagesIntlRef`도 UPDATE) 함께 점검 요청 — 이번 조사는 SELECT만 확인했음.

## 관련 파일

- `supabase/migrations/20260529130000_fix_zen_order_packages_rls.sql`
- `supabase/migrations/20260628141500_fix_zen_order_packages_rls_update.sql` (UPDATE/DELETE 정책, AGENCY 커버 여부 별도 확인 필요)
- `src/app/actions/operations/ups-labels.ts` (`lookupOrderPackages`, 31행)

## 예상 공수

Low~Medium (0.5~1일 — `is_org_member` 패턴 전수 조사 포함 시)

## 우선순위

**P1 — 즉시**: DEF-116으로 "해결"된 줄 알았던 AGENCY UPS접수가 실제로는 여전히 100% 실패 중
