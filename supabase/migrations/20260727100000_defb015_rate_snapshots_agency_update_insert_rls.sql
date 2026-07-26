-- 20260727100000_defb015_rate_snapshots_agency_update_insert_rls.sql
-- DEF-B-015: zen_order_rate_snapshots AGENCY UPDATE/INSERT RLS 추가 (TASK-B-222)
--
-- 원인: DEF-B-014(TASK-B-221)에서 SELECT RLS만 추가하고 UPDATE/INSERT 누락
-- 결과: agency@zenith.kr로 입고처리 화면에서 중량/부피를 변경해도
--       예상운임 재계산이 RLS에 의해 조용히 차단됨(0행 영향, 에러 없음)
-- 수정: AGENCY 역할이 본인 소속 오더의 rate snapshot을 UPDATE/INSERT할 수 있도록 정책 추가

-- 1. UPDATE: AGENCY가 본인 소속 오더의 rate snapshot 갱신
DROP POLICY IF EXISTS "Agency can update shipper order rate snapshots" ON public.zen_order_rate_snapshots;

CREATE POLICY "Agency can update shipper order rate snapshots"
ON public.zen_order_rate_snapshots
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_rate_snapshots.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_rate_snapshots.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);

-- 2. INSERT: AGENCY가 본인 소속 오더의 rate snapshot 신규 생성
DROP POLICY IF EXISTS "Agency can insert shipper order rate snapshots" ON public.zen_order_rate_snapshots;

CREATE POLICY "Agency can insert shipper order rate snapshots"
ON public.zen_order_rate_snapshots
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_rate_snapshots.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);

-- GRANT: authenticated 역할에 기본 권한 확인 (CI/신규 배포 환경 대응)
-- DEF-B-014에서 이미 추가됨: GRANT SELECT, INSERT, UPDATE ON public.zen_order_rate_snapshots TO authenticated;
-- 중복 방지를 위해 GRANT는 생략
