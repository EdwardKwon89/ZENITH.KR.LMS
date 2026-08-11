-- 20260811070000_iss1075_zen_order_items_rls_insert_missing.sql
-- TASK-B-286 (Issue #1075 / DEF-B-056, Critical): zen_order_items INSERT RLS 정책 누락
--
-- 배경: zen_order_items에는 SELECT 정책만 있고 INSERT/UPDATE/DELETE 정책이 전혀 없음
--       (zen_order_packages와 비대칭). updateOrder()가 저장 시마다 패키지+아이템을
--       delete+reinsert하는데:
--         1. deleteItemsByOrderId() — items DELETE 정책 부재로 0행(no-op)
--         2. deletePackagesByOrderId() — packages는 정상 DELETE → ON DELETE CASCADE로
--            기존 아이템까지 삭제됨 (캐스케이드는 items 정책과 무관하게 동작)
--         3. 신규 패키지 INSERT 성공(새 id)
--         4. 신규 아이템 INSERT — items INSERT 정책 부재로 RLS 위반, 그러나
--            orderRepo.insertItems() 반환 error를 updateOrder()가 확인하지 않아 조용히 실패
--       결과: 오더 수정 저장 시마다 아이템 전량 소실 (ZEN-2026-000008 실제 피해)
--
-- 수정: zen_order_packages의 기존 RLS 정책 패턴을 그대로 zen_order_items에 적용.
--       GRANT는 DEF-B-053(20260811050000)에서 authenticated/service_role 모두 이미 부여 —
--       여기서는 RLS 정책만 추가한다.

-- =====================================================
-- INSERT
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert order items" ON public.zen_order_items;
CREATE POLICY "Admins can insert order items"
ON public.zen_order_items FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
);

DROP POLICY IF EXISTS "Members can insert items for own organization orders" ON public.zen_order_items;
CREATE POLICY "Members can insert items for own organization orders"
ON public.zen_order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_items.order_id
    AND is_org_member(auth.uid(), zen_orders.shipper_id)
  )
);

-- =====================================================
-- UPDATE
-- =====================================================

DROP POLICY IF EXISTS "Admins can update order items" ON public.zen_order_items;
CREATE POLICY "Admins can update order items"
ON public.zen_order_items FOR UPDATE
TO authenticated
USING (
  get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
)
WITH CHECK (
  get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
);

DROP POLICY IF EXISTS "Members can update items for own organization orders" ON public.zen_order_items;
CREATE POLICY "Members can update items for own organization orders"
ON public.zen_order_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_items.order_id
    AND is_org_member(auth.uid(), zen_orders.shipper_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_items.order_id
    AND is_org_member(auth.uid(), zen_orders.shipper_id)
  )
);

DROP POLICY IF EXISTS "Agency can update shipper order items" ON public.zen_order_items;
CREATE POLICY "Agency can update shipper order items"
ON public.zen_order_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_items.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_items.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);

-- =====================================================
-- DELETE
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete order items" ON public.zen_order_items;
CREATE POLICY "Admins can delete order items"
ON public.zen_order_items FOR DELETE
TO authenticated
USING (
  get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
);

DROP POLICY IF EXISTS "Members can delete items for own organization orders" ON public.zen_order_items;
CREATE POLICY "Members can delete items for own organization orders"
ON public.zen_order_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_items.order_id
    AND is_org_member(auth.uid(), zen_orders.shipper_id)
  )
);
