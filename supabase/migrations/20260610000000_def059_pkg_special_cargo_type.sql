-- DEF-059: PKG 레벨 special_cargo_type 전환 (§1)
-- 1. zen_order_packages에 special_cargo_type 추가
-- 2. 기존 zen_orders 데이터 첫 PKG에 복사
-- 3. zen_orders.special_cargo_type DEPRECATED 표시 (컬럼 유지)

ALTER TABLE public.zen_order_packages
  ADD COLUMN IF NOT EXISTS special_cargo_type TEXT NOT NULL DEFAULT 'NONE'
  CHECK (special_cargo_type IN ('NONE','DANGEROUS','FROZEN','VALUABLE','USED'));

COMMENT ON COLUMN public.zen_order_packages.special_cargo_type IS
  'PKG 단위 특수화물 구분 (DEF-059, 2026-06-10). 이전: zen_orders.special_cargo_type (Order 레벨)';

-- 기존 zen_orders의 special_cargo_type 값을 해당 order의 첫 번째 PKG에 복사
UPDATE public.zen_order_packages AS p
SET special_cargo_type = o.special_cargo_type
FROM (
  SELECT DISTINCT ON (zen_order_packages.order_id)
    zen_order_packages.id AS pkg_id,
    zen_orders.special_cargo_type
  FROM zen_order_packages
  JOIN zen_orders ON zen_order_packages.order_id = zen_orders.id
  WHERE zen_orders.special_cargo_type != 'NONE'
  ORDER BY zen_order_packages.order_id, zen_order_packages.created_at ASC
) AS o
WHERE p.id = o.pkg_id;

COMMENT ON COLUMN public.zen_orders.special_cargo_type IS
  '[DEPRECATED] PKG 레벨로 이전됨 → zen_order_packages.special_cargo_type (DEF-059, 2026-06-10). 이 칼럼은 하위 호환성을 위해 유지되며 추후 삭제 예정.';
