-- TASK-B-017: CI service_role GRANT 누락 일괄 수정
-- DEF-071 (zen_rate_cards) + DEF-072 (zen_orders / zen_tracking_configs / zen_tracking_raw_logs)
-- 참조: .agent/defects/DEF-071_zen_rate_cards_service_role_grant_누락.md
--       .agent/defects/DEF-072_tracking_business_qa_service_role_grant_누락.md

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_rate_cards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_tracking_configs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_tracking_raw_logs TO service_role;
