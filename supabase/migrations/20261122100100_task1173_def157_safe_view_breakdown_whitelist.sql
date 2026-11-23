-- ============================================================================
-- TASK-1173 / DEF-157 마무리 (Issue #1466, DEF-160)
-- zen_order_rate_snapshots_safe 뷰의 metadata.platform.breakdown 화이트리스트화
--
-- 목적:
--   TASK-1168(20261122100000)의 안전 뷰는 metadata.platform 의 판매 키를 명시적으로 나열하지만
--   'breakdown' 은 하위 키 필터 없이 그대로 복사했다. breakdown 과 그 중첩 객체
--   (product·zone·otherChargeItems)도 허용 키 목록으로만 구성하도록 정렬한다.
--
-- 범위:
--   - 뷰 정의만 교체(CREATE OR REPLACE) — 컬럼 목록·타입·권한 불변, 데이터 변경 없음.
--   - 앱 코드 변경 없음. 기존 소비 경로가 읽는 판매 키·중량 키·레거시 판매 키는 유지한다.
--   - 기반 테이블 SELECT 정책 교체(DEF-157 잔여)는 이 마이그레이션 범위 밖.
--
-- 허용 키(breakdown):
--   baseSellingPrice, fuelSurchargeSellingAmount, surgeFeeSellingAmount, otherChargesSellingTotal,
--   billingWeightKg, chargeableWeightKg, actualWeightKg, volumetricWeightKg,
--   레거시 판매 키: baseFreight, fuelSurcharge, surgeFee, extraCharges
--   product{product_code, product_name, cargo_type}, zone{zone_code, zone_name},
--   otherChargeItems[{chargeCode, chargeName, sellingBase, unit}]
--
-- 롤백 SQL (이전 정의 복원 — breakdown 을 통째로 복사하던 TASK-1168 정의):
--   CREATE OR REPLACE VIEW public.zen_order_rate_snapshots_safe AS
--   SELECT s.id, s.order_id, s.rate_card_id, s.applied_unit_price, s.applied_currency, s.applied_rule,
--     s.snapshot_at, s.is_manual, s.override_reason, s.version_no, s.priority,
--     CASE WHEN s.metadata ? 'platform' AND jsonb_typeof(s.metadata -> 'platform') = 'object' THEN
--       jsonb_build_object('platform', jsonb_strip_nulls(jsonb_build_object(
--         'totalSellingPrice', s.metadata -> 'platform' -> 'totalSellingPrice',
--         'baseSellingPrice', s.metadata -> 'platform' -> 'baseSellingPrice',
--         'fuelSurchargeSellingAmount', s.metadata -> 'platform' -> 'fuelSurchargeSellingAmount',
--         'surgeFeeSellingAmount', s.metadata -> 'platform' -> 'surgeFeeSellingAmount',
--         'otherChargesSellingTotal', s.metadata -> 'platform' -> 'otherChargesSellingTotal',
--         'currency', s.metadata -> 'platform' -> 'currency',
--         'billingWeightKg', s.metadata -> 'platform' -> 'billingWeightKg',
--         'chargeableWeightKg', s.metadata -> 'platform' -> 'chargeableWeightKg',
--         'breakdown', s.metadata -> 'platform' -> 'breakdown')))
--     ELSE '{}'::jsonb END AS metadata
--   FROM public.zen_order_rate_snapshots AS s
--   WHERE EXISTS (SELECT 1 FROM public.zen_profiles AS p WHERE p.id = auth.uid()
--       AND p.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text]))
--     OR EXISTS (SELECT 1 FROM public.zen_orders AS o WHERE o.id = s.order_id
--       AND (public.is_org_member(auth.uid(), o.shipper_id)
--         OR o.agency_org_id = (SELECT p.org_id FROM public.zen_profiles AS p WHERE p.id = auth.uid())));
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
            'breakdown',
            CASE
              WHEN jsonb_typeof(bd.b) = 'object' THEN
                jsonb_strip_nulls(
                  jsonb_build_object(
                    'baseSellingPrice', bd.b -> 'baseSellingPrice',
                    'fuelSurchargeSellingAmount', bd.b -> 'fuelSurchargeSellingAmount',
                    'surgeFeeSellingAmount', bd.b -> 'surgeFeeSellingAmount',
                    'otherChargesSellingTotal', bd.b -> 'otherChargesSellingTotal',
                    'billingWeightKg', bd.b -> 'billingWeightKg',
                    'chargeableWeightKg', bd.b -> 'chargeableWeightKg',
                    'actualWeightKg', bd.b -> 'actualWeightKg',
                    'volumetricWeightKg', bd.b -> 'volumetricWeightKg',
                    'baseFreight', bd.b -> 'baseFreight',
                    'fuelSurcharge', bd.b -> 'fuelSurcharge',
                    'surgeFee', bd.b -> 'surgeFee',
                    'extraCharges', bd.b -> 'extraCharges',
                    'product',
                    CASE
                      WHEN jsonb_typeof(bd.b -> 'product') = 'object' THEN
                        jsonb_build_object(
                          'product_code', bd.b -> 'product' -> 'product_code',
                          'product_name', bd.b -> 'product' -> 'product_name',
                          'cargo_type', bd.b -> 'product' -> 'cargo_type'
                        )
                    END,
                    'zone',
                    CASE
                      WHEN jsonb_typeof(bd.b -> 'zone') = 'object' THEN
                        jsonb_build_object(
                          'zone_code', bd.b -> 'zone' -> 'zone_code',
                          'zone_name', bd.b -> 'zone' -> 'zone_name'
                        )
                    END,
                    'otherChargeItems',
                    CASE
                      WHEN jsonb_typeof(bd.b -> 'otherChargeItems') = 'array' THEN
                        (
                          SELECT jsonb_agg(
                            jsonb_build_object(
                              'chargeCode', e -> 'chargeCode',
                              'chargeName', e -> 'chargeName',
                              'sellingBase', e -> 'sellingBase',
                              'unit', e -> 'unit'
                            )
                          )
                          FROM jsonb_array_elements(bd.b -> 'otherChargeItems') AS e
                          WHERE jsonb_typeof(e) = 'object'
                        )
                    END
                  )
                )
            END
          )
        )
      )
    ELSE '{}'::jsonb
  END AS metadata
FROM public.zen_order_rate_snapshots AS s
CROSS JOIN LATERAL (SELECT s.metadata -> 'platform' -> 'breakdown' AS b) AS bd
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
