-- BUG-TRK-RLS-01: zen_tracking_configs / zen_tracking_events RLS 참조 테이블 수정
-- 문제: RLS 정책이 zen_profiles(빈 테이블)를 참조 → profiles 테이블로 교체
-- 영향: 트래킹 대시보드 0건, 트래킹 이벤트 INSERT 불가
-- 작성일: 2026-04-26

-- 1. zen_tracking_configs: Admin 정책 교체
DROP POLICY IF EXISTS "Admins have full access to tracking configs" ON public.zen_tracking_configs;
CREATE POLICY "Admins have full access to tracking configs" ON public.zen_tracking_configs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
        )
    );

-- 2. zen_tracking_configs: 사용자 조회 정책 교체 (zen_profiles → profiles)
DROP POLICY IF EXISTS "Users can view tracking of their own orders" ON public.zen_tracking_configs;
CREATE POLICY "Users can view tracking of their own orders" ON public.zen_tracking_configs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.zen_orders o
            WHERE o.id = zen_tracking_configs.order_id
              AND (
                o.shipper_id = auth.uid()
                OR o.shipper_id IN (
                    SELECT org_id FROM public.profiles WHERE id = auth.uid()
                )
              )
        )
    );

-- 3. zen_tracking_events: Admin 정책 교체
DROP POLICY IF EXISTS "Admins can manage tracking events" ON public.zen_tracking_events;
CREATE POLICY "Admins can manage tracking events" ON public.zen_tracking_events
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
        )
    );

-- 4. zen_tracking_events: 사용자 조회 정책 교체
DROP POLICY IF EXISTS "Users can view relevant tracking events" ON public.zen_tracking_events;
CREATE POLICY "Users can view relevant tracking events" ON public.zen_tracking_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.zen_orders o
            WHERE o.id = zen_tracking_events.order_id
              AND (
                o.shipper_id = auth.uid()
                OR o.shipper_id IN (
                    SELECT org_id FROM public.profiles WHERE id = auth.uid()
                )
              )
        )
    );

-- 5. zen_tracking_raw_logs: Admin SELECT 정책 교체 (Super admin 포함)
DROP POLICY IF EXISTS "Admins have full access to tracking raw logs" ON public.zen_tracking_raw_logs;
DROP POLICY IF EXISTS "Super admins have full access to tracking raw logs" ON public.zen_tracking_raw_logs;
CREATE POLICY "Admins have full access to tracking raw logs" ON public.zen_tracking_raw_logs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
        )
    );
