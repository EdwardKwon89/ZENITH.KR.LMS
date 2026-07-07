-- DEF-096: Phase 7 UPS/Agency 테이블 service_role GRANT 전량 누락 수정
-- 참조: .agent/defects/DEF-096_ups_agency_service_role_grant_전량누락.md
-- 패턴: DEF-071(zen_rate_cards)/DEF-072(zen_orders 등) 재발 — 신규 마이그레이션이 매번 GRANT 누락
--
-- RLS는 활성화되어 있으나 테이블 레벨 GRANT가 없어 service_role(RLS bypass 권한 보유)도
-- 신선한 `supabase db reset` 환경(CI)에서는 "permission denied" 발생. 이미 GRANT가 존재하는
-- 장기 운영 로컬 인스턴스에서는 재현되지 않음 — CI 로그(PR Checks)로 확인.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_agency_other_charges TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_agency_pricing_policies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_agency_rate_overrides TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_agency_shippers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ups_base_rates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ups_flight_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ups_freight_minimums TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ups_fuel_surcharges TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ups_labels TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ups_other_charges TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ups_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ups_shxk_country_map TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ups_tracking_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ups_weight_tier_rates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ups_zone_countries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ups_zones TO service_role;
