-- DEF-114: AGENCY 창고관리 RLS 정책 추가
-- Application 레벨(ROLE_PERMISSIONS) 수정만으로는
-- update_order_status_atomic RPC의 FOR UPDATE 락이 RLS에서 차단됨
-- Related: PR #656, Issue #655

-- 1. zen_orders: AGENCY UPDATE 정책 추가
--    SELECT는 agency_shipper_select_own_orders(agency_org_id 매치)로 가능하나
--    UPDATE 정책이 없어 SECURITY INVOKER RPC의 FOR UPDATE/SELECT/UPDATE 모두 실패
DROP POLICY IF EXISTS "Agency can update shipper orders" ON public.zen_orders;

CREATE POLICY "Agency can update shipper orders" ON public.zen_orders
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'AGENCY'
    AND agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    public.get_my_role() = 'AGENCY'
    AND agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  );

-- 2. zen_inventory_history: AGENCY INSERT 권한 추가
--    update_order_status_atomic RPC가 재고 이력을 INSERT할 때
--    AGENCY 역할도 허용하도록 기존 정책 확장
DROP POLICY IF EXISTS "Allow inventory history inserts" ON public.zen_inventory_history;

CREATE POLICY "Allow inventory history inserts" ON public.zen_inventory_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
        AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER', 'MEMBER', 'PARTNER', 'AGENCY')
    )
  );
