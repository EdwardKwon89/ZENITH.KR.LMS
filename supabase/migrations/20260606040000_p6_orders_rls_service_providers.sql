-- 20260606040000_p6_orders_rls_service_providers.sql
-- [P6-SPR-06] TASK-118: zen_orders RLS 서비스 제공자(provider_id) 조회 정책 추가
-- Phase 6: 신규 서비스 역할 모델 + 멀티 서비스 배정 구조 (v1.5.0)

-- CUSTOMS_BROKER / DELIVERY_AGENT / CARRIER: zen_order_services에서 본인 org가 provider인 order 조회
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'zen_orders'
    AND policyname = 'Service providers can view assigned orders'
  ) THEN
    CREATE POLICY "Service providers can view assigned orders"
      ON public.zen_orders FOR SELECT
      TO authenticated
      USING (
        id IN (
          SELECT order_id FROM public.zen_order_services
          WHERE provider_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
        )
      );
  END IF;
END
$$;
