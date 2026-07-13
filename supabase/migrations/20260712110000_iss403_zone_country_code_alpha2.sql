-- Issue #403: zen_ups_zone_countries.country_code 3자리(ISO alpha-3) → 2자리(ISO alpha-2) 변환
-- 모든 국가코드 사용처(AddressInput, zen_ports, Intl.DisplayNames)가 2자리이므로 통일

UPDATE public.zen_ups_zone_countries SET country_code =
  CASE country_code
    WHEN 'CHN' THEN 'CN' WHEN 'JPN' THEN 'JP' WHEN 'TWN' THEN 'TW' WHEN 'HKG' THEN 'HK'
    WHEN 'SGP' THEN 'SG' WHEN 'MYS' THEN 'MY' WHEN 'THA' THEN 'TH' WHEN 'VNM' THEN 'VN'
    WHEN 'PHL' THEN 'PH' WHEN 'IDN' THEN 'ID' WHEN 'BRN' THEN 'BN'
    WHEN 'AUS' THEN 'AU' WHEN 'NZL' THEN 'NZ'
    WHEN 'ARE' THEN 'AE' WHEN 'SAU' THEN 'SA' WHEN 'QAT' THEN 'QA' WHEN 'KWT' THEN 'KW'
    WHEN 'ISR' THEN 'IL' WHEN 'TUR' THEN 'TR' WHEN 'IND' THEN 'IN'
    WHEN 'DEU' THEN 'DE' WHEN 'GBR' THEN 'GB' WHEN 'FRA' THEN 'FR'
    WHEN 'ITA' THEN 'IT' WHEN 'ESP' THEN 'ES' WHEN 'NLD' THEN 'NL'
    WHEN 'BEL' THEN 'BE' WHEN 'CHE' THEN 'CH'
    WHEN 'SWE' THEN 'SE' WHEN 'NOR' THEN 'NO' WHEN 'FIN' THEN 'FI'
    WHEN 'DNK' THEN 'DK' WHEN 'POL' THEN 'PL' WHEN 'CZE' THEN 'CZ' WHEN 'AUT' THEN 'AT'
    WHEN 'USA' THEN 'US' WHEN 'CAN' THEN 'CA'
    WHEN 'MEX' THEN 'MX' WHEN 'BRA' THEN 'BR' WHEN 'ARG' THEN 'AR'
    WHEN 'CHL' THEN 'CL' WHEN 'COL' THEN 'CO'
    WHEN 'ZAF' THEN 'ZA' WHEN 'NGA' THEN 'NG' WHEN 'KEN' THEN 'KE' WHEN 'EGY' THEN 'EG'
    ELSE country_code
  END
WHERE country_code IS NOT NULL;
