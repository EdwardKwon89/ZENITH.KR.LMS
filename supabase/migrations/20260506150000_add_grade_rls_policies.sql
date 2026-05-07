-- E2E-09 테스트 환경을 위한 RLS 정책 추가
-- [목적] zen_profiles, grade_master, grade_promotion_request 테이블의 RLS 정책 부재로 인한
--        grade 페이지 접근 차단 문제 해결 (로컬 테스트 환경 기준)

-- ============================================================
-- 1. zen_profiles 테이블 RLS 정책
-- ============================================================
-- 자기 자신의 프로필 조회 허용 (authenticated 사용자)
DROP POLICY IF EXISTS "Users can view own zen_profile" ON public.zen_profiles;
CREATE POLICY "Users can view own zen_profile"
  ON public.zen_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 관리자는 모든 프로필 조회 가능 (무한 재귀 방지를 위해 JWT 메타데이터 사용)
DROP POLICY IF EXISTS "Admins can view all zen_profiles" ON public.zen_profiles;
CREATE POLICY "Admins can view all zen_profiles"
  ON public.zen_profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ZENITH_SUPER_ADMIN'
  );

-- ============================================================
-- 2. grade_master 테이블 RLS 정책
-- ============================================================
-- 모든 인증 사용자가 등급 정보 조회 가능 (공개 마스터 데이터)
DROP POLICY IF EXISTS "Authenticated users can view grade master" ON public.grade_master;
CREATE POLICY "Authenticated users can view grade master"
  ON public.grade_master
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 3. grade_promotion_request 테이블 RLS 정책
-- ============================================================
-- 자기 자신의 승급 신청 조회/생성 허용
DROP POLICY IF EXISTS "Users can view own promotion requests" ON public.grade_promotion_request;
CREATE POLICY "Users can view own promotion requests"
  ON public.grade_promotion_request
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own promotion requests" ON public.grade_promotion_request;
CREATE POLICY "Users can create own promotion requests"
  ON public.grade_promotion_request
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 관리자는 모든 승급 신청 조회/수정 가능 (JWT 메타데이터 사용)
DROP POLICY IF EXISTS "Admins can view all promotion requests" ON public.grade_promotion_request;
CREATE POLICY "Admins can view all promotion requests"
  ON public.grade_promotion_request
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ZENITH_SUPER_ADMIN'
  );

DROP POLICY IF EXISTS "Admins can update promotion requests" ON public.grade_promotion_request;
CREATE POLICY "Admins can update promotion requests"
  ON public.grade_promotion_request
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ZENITH_SUPER_ADMIN'
  );
