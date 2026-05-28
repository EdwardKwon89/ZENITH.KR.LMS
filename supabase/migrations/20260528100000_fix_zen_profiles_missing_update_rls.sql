-- zen_profiles UPDATE RLS 정책 복구
-- [배경] 20260507110000_fix_rls_recursion.sql 마이그레이션에서 재귀 방지를 위해
--        기존 SELECT/UPDATE 정책을 모두 삭제하고 auth.jwt() 기반 SELECT 정책만 재생성했으나
--        UPDATE 정책을 누락하여 관리자의 회원 상태/등급 변경이 무성 실패하는 버그 발생.
-- [영향] changeMemberStatus, changeMemberGrade, updateMyProfile, withdrawUser 전체 실패
-- [조치] auth.jwt() 기반 UPDATE 정책 2건 추가

BEGIN;

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.zen_profiles;
DROP POLICY IF EXISTS "Users can update own zen_profile" ON public.zen_profiles;

-- 관리자는 모든 프로필 수정 가능 (상태·등급·이름 등)
CREATE POLICY "Admins can update all profiles"
  ON public.zen_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
  );

-- 사용자는 자신의 프로필만 수정 가능 (이름 변경, 회원 탈퇴 등)
CREATE POLICY "Users can update own zen_profile"
  ON public.zen_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMIT;
