-- DEF-124: pickup_location을 구조화된 주소 필드로 확장
-- Issue #778: 픽업 장소 입력을 AddressInput 컴포넌트로 전환

-- 기존 pickup_location 컬럼 유지 (하위 호환 — 기존 데이터 보존)

ALTER TABLE public.zen_orders
  ADD COLUMN IF NOT EXISTS pickup_country_code   TEXT DEFAULT 'KR',
  ADD COLUMN IF NOT EXISTS pickup_state_province TEXT,
  ADD COLUMN IF NOT EXISTS pickup_city           TEXT,
  ADD COLUMN IF NOT EXISTS pickup_address        TEXT,
  ADD COLUMN IF NOT EXISTS pickup_address_detail TEXT,
  ADD COLUMN IF NOT EXISTS pickup_zipcode        TEXT;
