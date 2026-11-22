-- ============================================================================
-- TASK-1168 / DEF-157 (Issue #1406): zen_order_rate_snapshots 안전 뷰 생성 (1/2)
--
-- 목적:
--   화주/대리점 도달 경로에서 원가·수수료 컬럼(carrier_cost_amount, platform_fee_amount),
--   내부 산출 비용(applied_weight_cost, applied_cbm_cost), 요율 구간 원본(tiers_snapshot),
--   및 metadata 내부 원가 키(*Cost*)를 제외한 화이트리스트 안전 뷰를 제공한다.
--
-- 주의:
--   - Additive 마이그레이션(뷰 신규 생성)만 포함.
--   - base table SELECT 정책 축소(2/2)는 Team B 호출처 전환 완료 후 별도 Task에서 수행한다.
--
-- 롤백 SQL:
--   REVOKE ALL ON public.zen_order_rate_snapshots_safe FROM authenticated;
--   DROP VIEW IF EXISTS public.zen_order_rate_snapshots_safe;
--   NOTIFY pgrst, 'reload schema';
-- ============================================================================

CREATE OR REPLACE VIEW public.zen_order_rate_snapshots_safe AS
SELECT
  s.id,
  s.order_id,
  s.rate_card_id,
  s.applied_unit_price,
  s.applied_currency,
  s.applied_rule,
  s.snapshot_at,
  s.is_manual,
  s.override_reason,
  s.version_no,
  s.priority,
  CASE
    WHEN s.metadata ? 'platform' AND jsonb_typeof(s.metadata -> 'platform') = 'object' THEN
      jsonb_build_object(
        'platform',
        jsonb_strip_nulls(
          jsonb_build_object(
            'totalSellingPrice', s.metadata -> 'platform' -> 'totalSellingPrice',
            'baseSellingPrice', s.metadata -> 'platform' -> 'baseSellingPrice',
            'fuelSurchargeSellingAmount', s.metadata -> 'platform' -> 'fuelSurchargeSellingAmount',
            'surgeFeeSellingAmount', s.metadata -> 'platform' -> 'surgeFeeSellingAmount',
            'otherChargesSellingTotal', s.metadata -> 'platform' -> 'otherChargesSellingTotal',
            'currency', s.metadata -> 'platform' -> 'currency',
            'billingWeightKg', s.metadata -> 'platform' -> 'billingWeightKg',
            'chargeableWeightKg', s.metadata -> 'platform' -> 'chargeableWeightKg',
            'breakdown', s.metadata -> 'platform' -> 'breakdown'
          )
        )
      )
    ELSE '{}'::jsonb
  END AS metadata
FROM public.zen_order_rate_snapshots AS s
WHERE
  EXISTS (
    SELECT 1
    FROM public.zen_profiles AS p
    WHERE p.id = auth.uid()
      AND p.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text])
  )
  OR EXISTS (
    SELECT 1
    FROM public.zen_orders AS o
    WHERE o.id = s.order_id
      AND (
        public.is_org_member(auth.uid(), o.shipper_id)
        OR o.agency_org_id = (
          SELECT p.org_id
          FROM public.zen_profiles AS p
          WHERE p.id = auth.uid()
        )
      )
  );

REVOKE ALL ON public.zen_order_rate_snapshots_safe FROM PUBLIC;
REVOKE ALL ON public.zen_order_rate_snapshots_safe FROM anon;
REVOKE ALL ON public.zen_order_rate_snapshots_safe FROM authenticated;
GRANT SELECT ON public.zen_order_rate_snapshots_safe TO authenticated;

NOTIFY pgrst, 'reload schema';
