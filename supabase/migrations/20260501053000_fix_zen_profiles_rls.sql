-- zen_profiles 테이블 RLS 정책 수정 (Aiden 피드백 반영: 재귀 방지 설계)
-- 1. 재귀 우회용 SECURITY DEFINER 헬퍼 함수 생성 (RLS 미적용 상태에서 역할 조회)
-- 2. zen_profiles 테이블 정책을 해당 함수를 사용하도록 수정

-- ① 헬퍼 함수 생성
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE
AS $$ 
  SELECT role FROM public.zen_profiles WHERE id = auth.uid();
$$;

-- ② 기존 정책 정리
DROP POLICY IF EXISTS "Users can view their own profile" ON public.zen_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.zen_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.zen_profiles;

-- ③ SELECT: 본인 OR 관리자 (재귀 없음)
CREATE POLICY "Users can view their own profile"
ON public.zen_profiles FOR SELECT 
TO authenticated
USING (
  auth.uid() = id 
  OR public.get_my_role() IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
);

-- ④ UPDATE: 관리자만 (재귀 없음)
CREATE POLICY "Admins can update all profiles"
ON public.zen_profiles FOR UPDATE 
TO authenticated
USING (public.get_my_role() IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
WITH CHECK (public.get_my_role() IN ('ADMIN', 'ZENITH_SUPER_ADMIN'));

-- ⑤ INSERT/DELETE 정책 (필요 시 추가)
CREATE POLICY "Admins can insert profiles"
ON public.zen_profiles FOR INSERT 
TO authenticated
WITH CHECK (public.get_my_role() IN ('ADMIN', 'ZENITH_SUPER_ADMIN'));

CREATE POLICY "Admins can delete profiles"
ON public.zen_profiles FOR DELETE 
TO authenticated
USING (public.get_my_role() IN ('ADMIN', 'ZENITH_SUPER_ADMIN'));
