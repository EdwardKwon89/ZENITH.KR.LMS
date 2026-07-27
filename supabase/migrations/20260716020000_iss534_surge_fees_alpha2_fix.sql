-- Issue #534: UPS 급증 긴급 수수료 국가코드 alpha-3→alpha-2 통일
-- zen_ups_surge_fees.destination_country_code를 alpha-3(JPN, USA 등)에서 alpha-2(JP, US 등)로 변환
-- freight.ts의 .eq('destination_country_code', input.destCountryCode)가 alpha-2로 조회하므로 DB 데이터를 맞춤

UPDATE public.zen_ups_surge_fees
SET destination_country_code = CASE destination_country_code
  WHEN 'CHN' THEN 'CN'
  WHEN 'JPN' THEN 'JP'
  WHEN 'TWN' THEN 'TW'
  WHEN 'HKG' THEN 'HK'
  WHEN 'SGP' THEN 'SG'
  WHEN 'MYS' THEN 'MY'
  WHEN 'THA' THEN 'TH'
  WHEN 'VNM' THEN 'VN'
  WHEN 'PHL' THEN 'PH'
  WHEN 'IDN' THEN 'ID'
  WHEN 'AUS' THEN 'AU'
  WHEN 'IND' THEN 'IN'
  WHEN 'ARE' THEN 'AE'
  WHEN 'DEU' THEN 'DE'
  WHEN 'GBR' THEN 'GB'
  WHEN 'FRA' THEN 'FR'
  WHEN 'ITA' THEN 'IT'
  WHEN 'ESP' THEN 'ES'
  WHEN 'NLD' THEN 'NL'
  WHEN 'BEL' THEN 'BE'
  WHEN 'CHE' THEN 'CH'
  WHEN 'SWE' THEN 'SE'
  WHEN 'NOR' THEN 'NO'
  WHEN 'FIN' THEN 'FI'
  WHEN 'DNK' THEN 'DK'
  WHEN 'POL' THEN 'PL'
  WHEN 'CZE' THEN 'CZ'
  WHEN 'AUT' THEN 'AT'
  WHEN 'USA' THEN 'US'
  WHEN 'CAN' THEN 'CA'
  ELSE destination_country_code
END
WHERE LENGTH(destination_country_code) = 3;

COMMENT ON COLUMN public.zen_ups_surge_fees.destination_country_code IS 'ISO 3166-1 alpha-2 도착국 코드 (zen_ups_zone_countries.country_code와 동일 규격)';
