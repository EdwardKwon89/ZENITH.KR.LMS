-- Issue #180: zen_organizations 주소 컬럼 추가
-- Agency 화주 등록 시 국내/국외 주소 입력 지원

ALTER TABLE public.zen_organizations
  ADD COLUMN IF NOT EXISTS country_code    VARCHAR(2)   DEFAULT 'KR',
  ADD COLUMN IF NOT EXISTS state_province  TEXT,
  ADD COLUMN IF NOT EXISTS city            TEXT,
  ADD COLUMN IF NOT EXISTS address         TEXT,
  ADD COLUMN IF NOT EXISTS address_detail  TEXT,
  ADD COLUMN IF NOT EXISTS zipcode         VARCHAR(20);
