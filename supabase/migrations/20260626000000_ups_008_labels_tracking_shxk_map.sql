-- Phase 8: zen_ups_labels + zen_ups_tracking_events + zen_ups_shxk_country_map
-- An-13 v2.1 설계 확정 (2026-06-26) · Issue #121 Aiden 승인
-- TASK-B-027 Baker §1

-- 1. zen_ups_labels: UPS 레이블 발급 이력
CREATE TABLE public.zen_ups_labels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  package_id       UUID NOT NULL REFERENCES public.zen_order_packages(id) ON DELETE CASCADE,
  reference_no     TEXT NOT NULL,
  tracking_number  TEXT NOT NULL,
  label_format     VARCHAR(10) NOT NULL CHECK (label_format IN ('PDF','ZPL','GIF')),
  storage_path     TEXT NOT NULL,
  file_size_bytes  INTEGER,
  generated_at     TIMESTAMPTZ DEFAULT NOW(),
  generated_by     UUID REFERENCES public.zen_profiles(id),
  is_voided        BOOLEAN DEFAULT FALSE,
  voided_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ups_labels_order_id ON public.zen_ups_labels(order_id);
CREATE INDEX idx_ups_labels_tracking  ON public.zen_ups_labels(tracking_number);
CREATE INDEX idx_ups_labels_package   ON public.zen_ups_labels(package_id);
CREATE UNIQUE INDEX idx_ups_labels_reference ON public.zen_ups_labels(reference_no);

ALTER TABLE public.zen_ups_labels ENABLE ROW LEVEL SECURITY;

-- 2. zen_ups_tracking_events: UPS 트래킹 이벤트
CREATE TABLE public.zen_ups_tracking_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  label_id         UUID REFERENCES public.zen_ups_labels(id),
  tracking_number  TEXT NOT NULL,
  event_code       VARCHAR(10) NOT NULL,
  event_desc       TEXT,
  event_type       VARCHAR(5),
  event_date       DATE NOT NULL,
  event_time       TIME,
  location_city    TEXT,
  location_country VARCHAR(3),
  gmt_offset       VARCHAR(6),
  raw_response     JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ups_tracking_order ON public.zen_ups_tracking_events(order_id);
CREATE INDEX idx_ups_tracking_no    ON public.zen_ups_tracking_events(tracking_number);
CREATE INDEX idx_ups_tracking_code  ON public.zen_ups_tracking_events(event_code);
CREATE INDEX idx_ups_tracking_date  ON public.zen_ups_tracking_events(event_date);

ALTER TABLE public.zen_ups_tracking_events ENABLE ROW LEVEL SECURITY;

-- 3. zen_ups_shxk_country_map: shxk.rtb56.com shipping_method 매핑
CREATE TABLE public.zen_ups_shxk_country_map (
  product_code  VARCHAR(20) NOT NULL REFERENCES public.zen_ups_products(product_code),
  country_code  VARCHAR(3)  NOT NULL,  -- ISO 3166-1 alpha-3 (KOR, USA, VNM...)
  incoterms     VARCHAR(3)  NOT NULL CHECK (incoterms IN ('DDU', 'DDP')),
  shxk_code     VARCHAR(20) NOT NULL,
  PRIMARY KEY (product_code, country_code, incoterms)
);

-- KOR 초기 시드 12행 (An-13 v2.1 확정)
INSERT INTO public.zen_ups_shxk_country_map (product_code, country_code, incoterms, shxk_code) VALUES
  ('WW_EXPRESS_DOC',   'KOR', 'DDU', 'KRUPSEXP'),
  ('WW_EXPRESS_DOC',   'KOR', 'DDP', 'PK0033'),
  ('WW_EXPRESS_NONDOC','KOR', 'DDU', 'KRUPSEXP'),
  ('WW_EXPRESS_NONDOC','KOR', 'DDP', 'PK0033'),
  ('WW_EXPEDITED',     'KOR', 'DDU', 'KRUPSWE'),
  ('WW_EXPEDITED',     'KOR', 'DDP', 'PK0034'),
  ('WW_SAVER_DOC',     'KOR', 'DDU', 'FXUPS'),
  ('WW_SAVER_DOC',     'KOR', 'DDP', 'PK0035'),
  ('WW_SAVER_NONDOC',  'KOR', 'DDU', 'FXUPS'),
  ('WW_SAVER_NONDOC',  'KOR', 'DDP', 'PK0035'),
  ('WW_FLIGHT',        'KOR', 'DDU', 'KRUPSWWEF'),
  ('WW_FLIGHT',        'KOR', 'DDP', 'PK0032');

-- 4. ddu_available 전체 TRUE (Phase 7 DDU 제한 해제)
UPDATE public.zen_ups_products
  SET ddu_available = TRUE
  WHERE ddu_available = FALSE;
