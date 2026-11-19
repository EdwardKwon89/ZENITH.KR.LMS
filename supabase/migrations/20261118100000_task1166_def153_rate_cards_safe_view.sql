-- =============================================================================
-- TASK-1166 / DEF-153 (Issue #1386) — 1/2 : 안전 뷰 신설
--
-- zen_rate_cards 의 원가·마진 컬럼(carrier_cost, margin_rate, platform_fee_rate)
-- 을 제외한 조회용 뷰를 추가한다.
--
-- 배포 순서: 이 파일(뷰) → 앱 코드 전환 → 다음 파일(정책 교체).
--   뷰는 추가 전용(additive)이므로 먼저 적용해도 기존 동작에 영향이 없다.
-- 원격 적용 금지(로컬/CI 검증 전용). 롤백 SQL은 파일 하단 참조.
-- =============================================================================

-- DEFINER(기본값) 뷰로 둔다. base 테이블 SELECT 정책에서 화주 계열을 제외하면
-- security_invoker 뷰로는 행이 보이지 않으므로, 뷰 정의 내부의 역할
-- 화이트리스트로 행 범위를 고정한다.
-- NOTE: PostgreSQL 은 뷰에 search_path reloption 을 허용하지 않는다
--       (ALTER VIEW ... SET (search_path = public) → unrecognized parameter).
--       대신 뷰 정의의 모든 객체 참조를 스키마 한정(public.*)으로 고정했다.
CREATE OR REPLACE VIEW public.zen_rate_cards_safe AS
SELECT
  rc.id,
  rc.carrier_id,
  rc.transport_mode,
  rc.currency,
  rc.tiers,
  rc.valid_from,
  rc.valid_until,
  rc.is_active,
  rc.created_at,
  rc.origin_port_id,
  rc.dest_port_id
FROM public.zen_rate_cards AS rc
WHERE EXISTS (
  SELECT 1
  FROM public.zen_profiles AS p
  WHERE p.id = auth.uid()
    AND p.role = ANY (
      ARRAY['ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER', 'SHIPPER', 'CORPORATE', 'INDIVIDUAL', 'CARRIER']
    )
);

COMMENT ON VIEW public.zen_rate_cards_safe IS
  'TASK-1166/DEF-153: 원가·마진 컬럼을 제외한 요율 카드 조회용 뷰. 역할 화이트리스트로 행 범위 고정.';

-- Supabase 기본 권한(ALTER DEFAULT PRIVILEGES)이 anon/authenticated 에 ALL 을 부여하므로
-- 두 롤 모두 회수한 뒤 SELECT 만 명시 부여한다.
REVOKE ALL ON public.zen_rate_cards_safe FROM PUBLIC;
REVOKE ALL ON public.zen_rate_cards_safe FROM anon;
REVOKE ALL ON public.zen_rate_cards_safe FROM authenticated;
GRANT SELECT ON public.zen_rate_cards_safe TO authenticated;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- 롤백 SQL (수동 실행용 — 자동 적용되지 않는다)
-- =============================================================================
-- DROP VIEW IF EXISTS public.zen_rate_cards_safe;
-- NOTIFY pgrst, 'reload schema';
-- =============================================================================
