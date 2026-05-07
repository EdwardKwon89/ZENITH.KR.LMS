-- RLS 무한 재귀 해결 마이그레이션
-- [목적] zen_profiles 테이블의 RLS 정책에서 발생하는 무한 재귀 문제를 해결하기 위해
--        기존 정책을 삭제하고 auth.jwt() 기반의 신규 정책으로 대체합니다.

BEGIN;

-- 1. 기존 문제되는 정책 삭제
DROP POLICY IF EXISTS "Users can view own zen_profile" ON public.zen_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.zen_profiles;
DROP POLICY IF EXISTS "Admins can view all zen_profiles" ON public.zen_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.zen_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.zen_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.zen_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.zen_profiles;

DROP POLICY IF EXISTS "Users can view own promotion requests" ON public.grade_promotion_request;
DROP POLICY IF EXISTS "Users can create own promotion requests" ON public.grade_promotion_request;
DROP POLICY IF EXISTS "Admins can view all promotion requests" ON public.grade_promotion_request;
DROP POLICY IF EXISTS "Admins can update promotion requests" ON public.grade_promotion_request;

-- 2. 신규 정책 생성 (auth.uid()/auth.jwt() 기반으로 무한 재귀 방지)

-- zen_profiles: 본인 프로필 조회 허용
CREATE POLICY "Users can view own zen_profile"
  ON public.zen_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- zen_profiles: 플랫폼 관리자는 전체 프로필 조회 가능
CREATE POLICY "Admins can view all zen_profiles"
  ON public.zen_profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
  );

-- grade_promotion_request: 사용자는 자신의 신청만 조회/생성 가능
CREATE POLICY "Users can view own promotion requests"
  ON public.grade_promotion_request
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own promotion requests"
  ON public.grade_promotion_request
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- grade_promotion_request: 플랫폼 관리자는 전체 조회/수정 가능
CREATE POLICY "Admins can view all promotion requests"
  ON public.grade_promotion_request
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
  );

CREATE POLICY "Admins can update promotion requests"
  ON public.grade_promotion_request
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
  );

COMMIT;
