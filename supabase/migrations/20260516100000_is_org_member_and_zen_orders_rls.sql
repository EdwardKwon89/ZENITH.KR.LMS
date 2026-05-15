-- Migration: IMP-026-RL RLS 비즈니스 규칙 통합
-- Description: is_org_member 헬퍼 함수 추가 및 zen_orders RLS 정책 강화

BEGIN;

-- 1. is_org_member: RLS 정책 재사용을 위한 헬퍼 (SECURITY DEFINER로 무한 재귀 방지)
CREATE OR REPLACE FUNCTION public.is_org_member(p_user_id uuid, p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE id = p_user_id AND org_id = p_org_id AND status = 'ACTIVE'
  );
$$;

-- 2. 기존 zen_orders 정책 정리
DROP POLICY IF EXISTS "Allow authenticated full access to master zen_orders" ON public.zen_orders;
DROP POLICY IF EXISTS "Shippers can view their own zen_orders" ON public.zen_orders;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.zen_orders;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.zen_orders;

-- 3. 신규 zen_orders RLS 정책 (SELECT)

-- 3.1 플랫폼 관리자 (ADMIN, MANAGER, ZENITH_SUPER_ADMIN): 전체 조회 허용
CREATE POLICY "Admins can view all orders" ON public.zen_orders
FOR SELECT TO authenticated
USING (public.get_my_role() IN ('ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'));

-- 3.2 파트너 및 화주 (PARTNER, SHIPPER): 본인 조직의 오더만 조회 허용
CREATE POLICY "Members can view own organization orders" ON public.zen_orders
FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), org_id) OR public.is_org_member(auth.uid(), shipper_id));

-- 4. 신규 zen_orders RLS 정책 (INSERT/UPDATE/DELETE)

-- 4.1 플랫폼 관리자: 전체 제어 허용
CREATE POLICY "Admins can manage all orders" ON public.zen_orders
FOR ALL TO authenticated
USING (public.get_my_role() IN ('ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'))
WITH CHECK (public.get_my_role() IN ('ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'));

-- 4.2 파트너 및 화주: 본인 조직의 오더에 대해서만 생성/수정 허용 (추가적인 비즈니스 규칙은 서버 액션에서 처리)
CREATE POLICY "Members can insert own organization orders" ON public.zen_orders
FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(auth.uid(), org_id) OR public.is_org_member(auth.uid(), shipper_id));

COMMIT;
