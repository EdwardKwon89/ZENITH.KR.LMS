-- Issue #294: Add physical_box_count to zen_order_packages
-- packing_count → 품목(item) 개수로 확정
-- physical_box_count (신규) → 물리적 박스/포장 개수

ALTER TABLE public.zen_order_packages
  ADD COLUMN physical_box_count INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.zen_order_packages.physical_box_count IS '물리적 박스/포장 개수 (배송라벨·통관서류용)';

-- 기존 데이터: packing_count 값을 physical_box_count로 복사
UPDATE public.zen_order_packages
  SET physical_box_count = packing_count
  WHERE physical_box_count = 1 AND packing_count != 1;
