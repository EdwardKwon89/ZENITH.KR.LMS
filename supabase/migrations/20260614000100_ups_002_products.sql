-- Phase 7 UPS 특송: 제품 코드 테이블 + 초기 시드 4종
-- TASK-138 IMP-110

-- 1. zen_ups_products
CREATE TABLE public.zen_ups_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code    VARCHAR(20) NOT NULL UNIQUE,
  sub_code        VARCHAR(20),
  product_name    TEXT NOT NULL,
  cargo_type      VARCHAR(10) NOT NULL CHECK (cargo_type IN ('DOC','NON_DOC','BOTH')),
  ddu_available   BOOLEAN DEFAULT FALSE,
  ddp_available   BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE public.zen_ups_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ups_products_admin_all"
  ON public.zen_ups_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "ups_products_authenticated_select"
  ON public.zen_ups_products FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- 3. 인덱스
CREATE INDEX idx_ups_products_active ON public.zen_ups_products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_ups_products_cargo_type ON public.zen_ups_products(cargo_type);

-- 4. 초기 시드: UPS 4대 제품
INSERT INTO public.zen_ups_products
  (product_code, sub_code, product_name, cargo_type, ddu_available, ddp_available, sort_order)
VALUES
  ('WW_EXPRESS_DOC',   'WWE_D', 'UPS WorldWide Express (서류)',    'DOC',     FALSE, TRUE,  1),
  ('WW_EXPRESS_NONDOC','WWE_N', 'UPS WorldWide Express (비서류)',  'NON_DOC', FALSE, TRUE,  2),
  ('WW_SAVER_DOC',     'WWS_D', 'UPS WorldWide Express Saver (서류)',    'DOC',     FALSE, TRUE,  3),
  ('WW_SAVER_NONDOC',  'WWS_N', 'UPS WorldWide Express Saver (비서류)',  'NON_DOC', FALSE, TRUE,  4),
  ('WW_EXPEDITED',     'WWEX',  'UPS WorldWide Express Expedited','BOTH',    TRUE,  TRUE,  5),
  ('WW_FLIGHT',        'WWFL',  'UPS WorldWide Express Flight',    'BOTH',    FALSE, TRUE,  6);
