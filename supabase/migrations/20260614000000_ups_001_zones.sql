-- Phase 7 UPS 특송: Zone 테이블 (10구간 정의 + 국가 매핑)
-- TASK-138 IMP-110

-- 1. zen_ups_zones: 지역 구간 정의
CREATE TABLE public.zen_ups_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code   VARCHAR(5) NOT NULL UNIQUE,
  zone_name   TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES public.zen_profiles(id)
);

-- 2. zen_ups_zone_countries: 구간별 국가 매핑 (ISO 3166-1 alpha-3)
CREATE TABLE public.zen_ups_zone_countries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id      UUID NOT NULL REFERENCES public.zen_ups_zones(id) ON DELETE CASCADE,
  country_code VARCHAR(3) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   UUID REFERENCES public.zen_profiles(id),
  UNIQUE(country_code)
);

-- 3. RLS
ALTER TABLE public.zen_ups_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_ups_zone_countries ENABLE ROW LEVEL SECURITY;

-- zen_ups_zones: ADMIN/MANAGER 전체, 인증 사용자 조회
CREATE POLICY "ups_zones_admin_all"
  ON public.zen_ups_zones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "ups_zones_authenticated_select"
  ON public.zen_ups_zones FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- zen_ups_zone_countries: 동일 정책
CREATE POLICY "ups_zone_countries_admin_all"
  ON public.zen_ups_zone_countries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "ups_zone_countries_authenticated_select"
  ON public.zen_ups_zone_countries FOR SELECT
  TO authenticated
  USING (true);

-- 4. 인덱스
CREATE INDEX idx_ups_zone_countries_zone_id ON public.zen_ups_zone_countries(zone_id);
CREATE INDEX idx_ups_zone_countries_country_code ON public.zen_ups_zone_countries(country_code);
CREATE INDEX idx_ups_zones_active ON public.zen_ups_zones(is_active) WHERE is_active = TRUE;
