-- 20260606030000_p6_order_services_table.sql
-- [P6-SPR-01] zen_order_services 테이블 생성 + carrier_id 마이그레이션
-- Phase 6: 신규 서비스 역할 모델 + 멀티 서비스 배정 구조 (v1.5.0)

-- §1 — zen_order_services 테이블 생성
CREATE TABLE IF NOT EXISTS public.zen_order_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES zen_orders(id) ON DELETE CASCADE,
  service_type     VARCHAR(20) NOT NULL,
  provider_id      UUID NOT NULL REFERENCES zen_organizations(id),
  rate_card_id     UUID REFERENCES public.zen_rate_cards(id),
  customs_rate_id  UUID REFERENCES public.zen_customs_rates(id),
  delivery_rate_id UUID REFERENCES public.zen_delivery_rates(id),
  quoted_cost      NUMERIC(18,2),
  currency         VARCHAR(3) DEFAULT 'USD',
  status           VARCHAR(20) DEFAULT 'REQUESTED',
  assigned_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, service_type)
);

ALTER TABLE public.zen_order_services ENABLE ROW LEVEL SECURITY;

-- 역할별 조회 격리
CREATE POLICY "order_services_select"
  ON public.zen_order_services FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
    OR provider_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    OR order_id IN (
      SELECT id FROM public.zen_orders
      WHERE shipper_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    )
  );

-- ADMIN/MANAGER + 역할별 INSERT
CREATE POLICY "order_services_insert"
  ON public.zen_order_services FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
  );

CREATE POLICY "order_services_update"
  ON public.zen_order_services FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
  );

-- §2 — carrier_id → zen_order_services 마이그레이션 (기존 오더 전체)
-- 기존 carrier_id가 있는 모든 오더를 TRANSPORT 레코드로 이관
INSERT INTO public.zen_order_services (order_id, service_type, provider_id, status, assigned_at, created_at)
SELECT
  o.id,
  CASE o.transport_mode
    WHEN 'AIR' THEN 'TRANSPORT_AIR'
    WHEN 'SEA' THEN 'TRANSPORT_SEA'
    WHEN 'LAND' THEN 'TRANSPORT_LAND'
    WHEN 'EXP' THEN 'TRANSPORT_EXP'
    ELSE 'TRANSPORT_AIR'
  END,
  o.carrier_id,
  'REQUESTED',
  o.created_at,
  o.created_at
FROM public.zen_orders o
WHERE o.carrier_id IS NOT NULL
ON CONFLICT (order_id, service_type) DO NOTHING;

-- §3 — zen_orders.carrier_id NULL 허용 유지 (컬럼 삭제는 Phase 7 이후 검토)
-- ALTER TABLE 생략 — 기존 FK 유지, 신규 오더는 carrier_id 미사용
