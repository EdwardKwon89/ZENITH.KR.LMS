-- UAT-02-03: 경로 최적화 RLS 정책에 CORPORATE/INDIVIDUAL 누락
-- 기존 SHIPPER 역할은 폐기되고 CORPORATE/INDIVIDUAL로 대체됨
-- CORPORATE 화주(uat02_corp_shipper)가 getRouteOptions() 호출 시
-- zen_route_network/zen_carriers/zen_rate_cards 조회가 빈 배열 반환

DROP POLICY IF EXISTS zen_route_network_select ON public.zen_route_network;
CREATE POLICY zen_route_network_select ON public.zen_route_network
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text, 'SHIPPER'::text, 'CORPORATE'::text, 'INDIVIDUAL'::text])
    )
  );

DROP POLICY IF EXISTS zen_carriers_select ON public.zen_carriers;
CREATE POLICY zen_carriers_select ON public.zen_carriers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text, 'SHIPPER'::text, 'CORPORATE'::text, 'INDIVIDUAL'::text])
    )
  );

DROP POLICY IF EXISTS zen_rate_cards_select ON public.zen_rate_cards;
CREATE POLICY zen_rate_cards_select ON public.zen_rate_cards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text, 'SHIPPER'::text, 'CORPORATE'::text, 'INDIVIDUAL'::text])
    )
  );

-- zen_route_options: RLS 활성화 + 정책 0건 → INSERT/SELECT 모두 차단
-- route optimization server action이 upsert/select 실패
DROP POLICY IF EXISTS zen_route_options_insert ON public.zen_route_options;
CREATE POLICY zen_route_options_insert ON public.zen_route_options
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS zen_route_options_select ON public.zen_route_options;
CREATE POLICY zen_route_options_select ON public.zen_route_options
  FOR SELECT
  TO authenticated
  USING (true);
