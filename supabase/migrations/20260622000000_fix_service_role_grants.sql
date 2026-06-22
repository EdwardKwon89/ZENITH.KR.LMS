-- TASK-B-017: CI service_role GRANT 누락 일괄 수정
-- DEF-071 (zen_rate_cards) + DEF-072 (zen_orders / zen_tracking_configs / zen_tracking_raw_logs)
-- 참조: .agent/defects/DEF-071_zen_rate_cards_service_role_grant_누락.md
--       .agent/defects/DEF-072_tracking_business_qa_service_role_grant_누락.md

-- [1차 대상] Aiden PR#73 분석 기준 4개 테이블
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_rate_cards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_tracking_configs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_tracking_raw_logs TO service_role;

-- [2차 대상] CI 재실행 후 추가 확인 — zen_orders INSERT 트리거(tr_capture_order_rate_snapshot)가
-- fn_trigger_capture_order_rate → fn_get_best_matching_rate 호출 시 접근하는 테이블
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_carriers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_order_rate_snapshots TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_order_costs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_transport_pricing_policies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_tracking_events TO service_role;

-- [3차 대상] CI 2차 실행 후 추가 확인
-- zen_ports: SettlementEngine PostgREST JOIN (origin_port:zen_ports!origin_port_id) + beforeAll 포트 조회
-- zen_organizations: beforeAll testShipperId/testCarrierId 조회 — GRANT 없으면 null → rate card 매칭 실패
-- zen_order_packages: TC-POLICY-07 패키지 INSERT (weight=80/cbm=0.3 → applied_weight_cost=240/applied_cbm_cost=60 검증)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_ports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_order_packages TO service_role;
