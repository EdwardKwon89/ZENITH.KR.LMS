-- IMP-146 TASK-179: zen_ups_zone_countries product_family + direction 컬럼 추가
-- An-14 §12-1 #3
-- 기존 UNIQUE(country_code) → UNIQUE(country_code, product_family, direction)

-- 1. 신규 컬럼 추가 (기존 데이터는 NULL → 이후 UPDATE로 채움)
ALTER TABLE public.zen_ups_zone_countries
  ADD COLUMN product_family VARCHAR(20) CHECK (product_family IN ('EXPRESS','SAVER','EXPEDITED','FREIGHT')),
  ADD COLUMN direction VARCHAR(6) CHECK (direction IN ('EXPORT','IMPORT'));

-- 2. 기존 시드 데이터(product_family='EXPRESS', direction='EXPORT'로 초기화 — 하위호환)
UPDATE public.zen_ups_zone_countries
SET product_family = 'EXPRESS', direction = 'EXPORT'
WHERE product_family IS NULL AND direction IS NULL;

-- 3. NOT NULL 제약 조건 추가 (데이터 채움 후)
ALTER TABLE public.zen_ups_zone_countries
  ALTER COLUMN product_family SET NOT NULL,
  ALTER COLUMN direction SET NOT NULL;

-- 4. 기존 UNIQUE(country_code) 제거 → 신규 복합 UNIQUE로 대체
ALTER TABLE public.zen_ups_zone_countries
  DROP CONSTRAINT IF EXISTS zen_ups_zone_countries_country_code_key,
  DROP CONSTRAINT IF EXISTS ups_zone_countries_unique_country_code;

-- 5. 신규 복합 UNIQUE (country_code, product_family, direction) + 인덱스
ALTER TABLE public.zen_ups_zone_countries
  ADD CONSTRAINT ups_zone_countries_unique_composite UNIQUE (country_code, product_family, direction);

-- 6. 인덱스 갱신 (기존 country_code 단일 인덱스는 유지 — 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_ups_zone_countries_product_family
  ON public.zen_ups_zone_countries(product_family);
CREATE INDEX IF NOT EXISTS idx_ups_zone_countries_direction
  ON public.zen_ups_zone_countries(direction);
