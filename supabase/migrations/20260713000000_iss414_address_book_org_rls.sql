-- Issue #414: 조직 소속 사용자 주소록 RLS 정책 재생성
-- 원 마이그레이션(20260617010000)의 조건부 생성(`zen_organization_members` 존재 검사)이
-- 해당 테이블 부재로 정책을 생성하지 못함 → 표준 org_id JWT 패턴으로 재생성

DROP POLICY IF EXISTS zen_address_book_org_member_access ON public.zen_address_book;

CREATE POLICY zen_address_book_org_member_access ON public.zen_address_book
  FOR ALL TO authenticated
  USING (org_id IS NOT NULL AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  WITH CHECK (org_id IS NOT NULL AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);
