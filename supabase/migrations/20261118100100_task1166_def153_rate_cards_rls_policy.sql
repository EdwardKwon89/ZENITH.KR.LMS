-- =============================================================================
-- TASK-1166 / DEF-153 (Issue #1386) — 2/2 : RLS 정책 교체
--
--   1) zen_rate_cards_select 교체
--        - 관리자: 전 행
--        - CARRIER: 자기 운송사(carrier_id) 행만
--        - 화주 계열(SHIPPER/CORPORATE/INDIVIDUAL): 제외 → zen_rate_cards_safe 사용
--   2) zen_rate_cards_public: DEFINER 뷰 → security_invoker + anon 권한 회수
--        (DROP 하지 않는 가역 조치)
--
-- 배포 순서: 20261118100000(뷰) → 앱 코드 전환 → 이 파일(정책 교체).
--   정책을 먼저 적용하면 구 코드(zen_rate_cards 직접 조회)의 화주 기능이 끊긴다.
-- 원격 적용 금지(로컬/CI 검증 전용). 롤백 SQL은 파일 하단 참조.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) base 테이블 SELECT 정책 교체
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS zen_rate_cards_select ON public.zen_rate_cards;
CREATE POLICY zen_rate_cards_select ON public.zen_rate_cards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.zen_profiles AS p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY['ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'])
    )
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'CARRIER'
      AND carrier_id IN (
        SELECT c.id
        FROM public.zen_carriers AS c
        WHERE c.org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) zen_rate_cards_public: DEFINER 뷰 → security_invoker + anon 권한 회수
-- ─────────────────────────────────────────────────────────────────────────────
ALTER VIEW public.zen_rate_cards_public SET (security_invoker = on);
REVOKE ALL ON public.zen_rate_cards_public FROM PUBLIC;
REVOKE ALL ON public.zen_rate_cards_public FROM anon;
REVOKE ALL ON public.zen_rate_cards_public FROM authenticated;
GRANT SELECT ON public.zen_rate_cards_public TO authenticated;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- 롤백 SQL (수동 실행용 — 자동 적용되지 않는다)
-- =============================================================================
-- -- 2) zen_rate_cards_public 원복
-- ALTER VIEW public.zen_rate_cards_public RESET (security_invoker);
-- GRANT ALL ON public.zen_rate_cards_public TO anon;
--
-- -- 1) SELECT 정책 원복 (20260601020000_fix_tisa_shipper_visible.sql 상태)
-- DROP POLICY IF EXISTS zen_rate_cards_select ON public.zen_rate_cards;
-- CREATE POLICY zen_rate_cards_select ON public.zen_rate_cards
--   FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.zen_profiles
--       WHERE zen_profiles.id = auth.uid()
--         AND zen_profiles.role = ANY (ARRAY['ADMIN','ZENITH_SUPER_ADMIN','MANAGER','SHIPPER','CORPORATE','INDIVIDUAL','CARRIER'])
--     )
--   );
--
-- NOTIFY pgrst, 'reload schema';
-- =============================================================================
