-- Phase 8: zen_orders UPS 제품코드 + 인코텀즈 컬럼 추가
-- Phase 7 설계 갭 보완 — 고객 주문 시 UPS 제품 및 DDU/DDP 선택 캡처
-- TASK-B-027 IMP-138 (Issue #120 Aiden 확정 2026-06-26)

ALTER TABLE public.zen_orders
  ADD COLUMN IF NOT EXISTS ups_product_code VARCHAR(20)
    REFERENCES public.zen_ups_products(product_code),
  ADD COLUMN IF NOT EXISTS incoterms        VARCHAR(3)
    CHECK (incoterms IN ('DDU', 'DDP'));

COMMENT ON COLUMN public.zen_orders.ups_product_code
  IS 'UPS 제품 코드 (zen_ups_products.product_code FK). UPS 오더 외 NULL 허용.';

COMMENT ON COLUMN public.zen_orders.incoterms
  IS 'UPS 인코텀즈 선택: DDU(수취인 관세 부담) / DDP(발송인 관세 포함). UPS 오더 외 NULL 허용.';

CREATE INDEX IF NOT EXISTS idx_orders_ups_product_code
  ON public.zen_orders(ups_product_code)
  WHERE ups_product_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_incoterms
  ON public.zen_orders(incoterms)
  WHERE incoterms IS NOT NULL;
