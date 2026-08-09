BEGIN;
-- 급증긴급 수수료(Surge Emergency Fee) 전면 재적재 — docs/80_RawData/20260609 SNTL 자료/분석자료/surge_fees_by_country.csv
--
-- 배경: 최초 시드(20260715140000_iss491_ups_surge_fees_seed.sql)는 ~20개국만 alpha-3 코드
--   (CHN/JPN/DEU/ARE 등)로 등록했으나, 실제 조회 코드(freight.ts:158→resolveZoneByCountry)는
--   alpha-2(zen_ups_zone_countries.country_code와 동일 규격)를 사용 — 이 불일치는 이미
--   Issue #534(20260716020000_iss534_surge_fees_alpha2_fix.sql)에서 발견·수정되어 alpha-2로
--   정정 완료된 상태였음(전용 회귀테스트 tests/unit/ups/surge-fee-alpha2.test.ts 확인).
--   다만 그 수정은 국가코드만 alpha-2로 바꿨을 뿐, 국가별로 제각각이던 통화(RMB/JPY/TWD 등)는
--   그대로 남아있었음 — 계산 로직(pricing-engine.ts applySurgeFee)은 환율 변환 없이 저장값을
--   그대로 KRW처럼 곱하므로, alpha-2 코드가 매치되는 국가라도 KRW 아닌 통화는 금액이 부정확했을
--   것으로 추정(2026-08-09 Jaison 확인).
--
-- 이번 CSV는 alpha-2 코드 커버리지를 20개국→250개국으로 확장하고 전부 KRW 단일 통화로 통일해
-- 위 잔존 통화 문제를 해소하며, 최신 수수료 수치(예: 유럽 4220원→720원)로 갱신함.
-- selling_rate_per_kg/cost_rate_per_kg: JSJung 확인(2026-08-09) — 이 파일은 판매가/원가 구분이
--   있는 자료가 아니라 부가요금(수수료) 자체 정보 → 마진 없는 pass-through로 두 컬럼에 동일값 반영.
--
-- 조치: 기존 zen_ups_surge_fees 전량(형식이 근본적으로 맞지 않아 부분 유지 의미 없음) 삭제 후 재적재.

DELETE FROM public.zen_ups_surge_fees;

INSERT INTO public.zen_ups_surge_fees
  (destination_country_code, selling_rate_per_kg, cost_rate_per_kg, currency, effective_from, effective_until, is_active)
VALUES
  ('A2', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Azores (Portugal)
  ('AD', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Andorra
  ('AE', 4722, 4722, 'KRW', CURRENT_DATE, NULL, TRUE), -- United Arab Emirates
  ('AF', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Afghanistan
  ('AG', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Antigua and Barbuda
  ('AI', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Anguilla
  ('AL', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Albania
  ('AM', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Armenia
  ('AO', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Angola
  ('AR', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Argentina
  ('AS', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- American Samoa
  ('AT', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Austria
  ('AU', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Australia
  ('AW', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Aruba
  ('AX', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Aland Island (Finland)
  ('AZ', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Azerbaijan
  ('B1', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Buesingen (Germany)
  ('BA', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Bosnia and Herzegovina
  ('BB', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Barbados
  ('BD', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Bangladesh
  ('BE', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Belgium
  ('BF', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Burkina Faso
  ('BG', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Bulgaria
  ('BH', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Bahrain
  ('BI', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Burundi
  ('BJ', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Benin
  ('BL', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- St. Barthelemy
  ('BM', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Bermuda
  ('BN', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Brunei
  ('BO', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Bolivia
  ('BQ', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Bonaire, St. Eustatius, Saba
  ('BR', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Brazil
  ('BS', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Bahamas
  ('BT', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Bhutan
  ('BW', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Botswana
  ('BY', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Belarus/ Byelorussia
  ('BZ', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Belize
  ('C2', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Ceuta (Spain)
  ('C3', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Campione/ Lake Lugano (Italy)
  ('CA', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Canada
  ('CD', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Congo, Democratic Republic of
  ('CF', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Central African Republic
  ('CG', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Congo (Brazzaville)
  ('CH', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Switzerland
  ('CI', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Cote d''Ivoire (Ivory Coast)
  ('CK', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Cook Islands
  ('CL', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Chile
  ('CM', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Cameroon
  ('CNN', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- China Mainland (Excluding Southern China Mainland)
  ('CNS', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Southern China Mainland
  ('CO', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Colombia
  ('CR', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Costa Rica
  ('CU', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Cuba
  ('CV', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Cape Verde
  ('CW', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Curacao
  ('CY', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Cyprus
  ('CZ', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Czech Republic
  ('DE', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Germany
  ('DJ', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Djibouti
  ('DK', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Denmark
  ('DM', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Dominica
  ('DO', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Dominican Republic
  ('DZ', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Algeria
  ('EC', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Ecuador
  ('EE', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Estonia
  ('EG', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Egypt
  ('EN', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- England (United Kingdom)
  ('ER', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Eritrea
  ('ES', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Spain
  ('ET', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Ethiopia
  ('FI', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Finland
  ('FJ', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Fiji
  ('FM', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Micronesia, Federated States of
  ('FO', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Faroe Islands
  ('FR', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- France
  ('GA', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Gabon
  ('GB', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- United Kingdom
  ('GD', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Grenada
  ('GE', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Georgia
  ('GF', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- French Guiana
  ('GG', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Guernsey (Channel Islands)
  ('GH', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Ghana
  ('GI', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Gibraltar
  ('GL', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Greenland
  ('GM', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Gambia
  ('GN', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Guinea
  ('GP', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Guadeloupe
  ('GQ', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Equatorial Guinea
  ('GR', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Greece
  ('GT', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Guatemala
  ('GU', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Guam
  ('GW', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Guinea-Bissau
  ('GY', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Guyana
  ('H1', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Heligoland (Germany)
  ('HK', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Hong Kong SAR, China
  ('HN', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Honduras
  ('HR', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Croatia
  ('HT', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Haiti
  ('HU', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Hungary
  ('IC', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Canary Islands (Spain)
  ('ID', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Indonesia
  ('IE', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Ireland, Republic of
  ('IL', 4722, 4722, 'KRW', CURRENT_DATE, NULL, TRUE), -- Israel
  ('IN', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- India
  ('IQ', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Iraq
  ('IS', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Iceland
  ('IT', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Italy
  ('JE', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Jersey (Channel Islands)
  ('JM', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Jamaica
  ('JO', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Jordan
  ('JP', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Japan
  ('KE', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Kenya
  ('KG', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Kirghizia (Kyrgyzstan)
  ('KH', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Cambodia
  ('KI', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Kiribati
  ('KM', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Comoros
  ('KN', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- St. Kitts and Nevis
  ('KO', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Kosrae (Micronesia, Federated States of)
  ('KV', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Kosovo
  ('KW', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Kuwait
  ('KY', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Cayman Islands
  ('KZ', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Kazakhstan
  ('L1', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Livigno (Italy)
  ('LA', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Laos
  ('LB', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Lebanon
  ('LC', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- St. Lucia
  ('LI', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Liechtenstein
  ('LK', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Sri Lanka
  ('LR', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Liberia
  ('LS', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Lesotho
  ('LT', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Lithuania
  ('LU', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Luxembourg
  ('LV', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Latvia
  ('LY', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Libyan Arab Jamahiriya
  ('M1', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Melilla (Spain)
  ('M2', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Mount Athos (Greece)
  ('M3', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Madeira (Portugal)
  ('MA', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Morocco
  ('MC', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Monaco (France)
  ('MD', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Moldova
  ('ME', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Montenegro
  ('MG', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Madagascar
  ('MH', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Marshall Islands
  ('MK', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Macedonia (FYROM)
  ('ML', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Mali
  ('MM', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Myanmar
  ('MN', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Mongolia
  ('MO', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Macau SAR, China
  ('MP', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Northern Mariana Islands
  ('MQ', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Martinique
  ('MR', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Mauritania
  ('MS', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Montserrat
  ('MT', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Malta
  ('MU', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Mauritius
  ('MV', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Maldives
  ('MW', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Malawi
  ('MX', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Mexico
  ('MY', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Malaysia
  ('MZ', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Mozambique
  ('NA', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Namibia
  ('NB', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Northern Ireland (United Kingdom)
  ('NC', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- New Caledonia
  ('NE', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Niger
  ('NF', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Norfolk Island (Australia)
  ('NG', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Nigeria
  ('NI', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Nicaragua
  ('NL', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Netherlands (Holland)
  ('NO', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Norway
  ('NP', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Nepal
  ('NZ', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- New Zealand
  ('OM', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Oman
  ('PA', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Panama
  ('PE', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Peru
  ('PF', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- French Polynesia
  ('PG', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Papua New Guinea
  ('PH', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Philippines
  ('PK', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Pakistan
  ('PL', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Poland
  ('PO', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Ponape (Micronesia, Federated States of)
  ('PR', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Puerto Rico
  ('PT', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Portugal
  ('PW', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Palau
  ('PY', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Paraguay
  ('QA', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Qatar
  ('RE', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Reunion Island
  ('RO', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Romania
  ('RS', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Serbia
  ('RT', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Rota (Northern Mariana Islands)
  ('RU', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Russia
  ('RW', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Rwanda
  ('SA', 4220, 4220, 'KRW', CURRENT_DATE, NULL, TRUE), -- Saudi Arabia
  ('SB', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Solomon Islands
  ('SC', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Seychelles
  ('SE', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Sweden
  ('SF', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Scotland (United Kingdom)
  ('SG', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Singapore
  ('SI', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Slovenia
  ('SK', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Slovakia
  ('SL', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Sierra Leone
  ('SM', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- San Marino
  ('SN', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Senegal
  ('SP', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Saipan (Northern Mariana Islands)
  ('SR', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Suriname
  ('ST', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Sao Tome and Principe
  ('SV', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- El Salvador
  ('SW', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- St. Christopher (St. Kitts)
  ('SX', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- St. Maarten, St. Martin
  ('SZ', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Swaziland
  ('TA', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Tahiti (French Polynesia)
  ('TC', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Turks & Caicos Islands
  ('TD', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Chad
  ('TG', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Togo
  ('TH', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Thailand
  ('TI', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Tinian (Northern Mariana Islands)
  ('TJ', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Tajikistan
  ('TL', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Timor-Leste
  ('TM', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Turkmenistan
  ('TN', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Tunisia
  ('TO', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Tonga
  ('TR', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Turkey
  ('TT', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Trinidad & Tobago
  ('TU', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Truk (Micronesia, Federated States of)
  ('TV', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Tuvalu
  ('TW', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Taiwan, China
  ('TZ', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Tanzania, United Republic of
  ('UA', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Ukraine
  ('UG', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Uganda
  ('UI', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Union Islands (St. Vincent & the Grenadines)
  ('US', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- United States
  ('UV', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- St. John (U.S. Virgin Islands)
  ('UY', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Uruguay
  ('UZ', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Uzbekistan
  ('VA', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Vatican City (Italy)
  ('VC', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- St. Vincent & the Grenadines
  ('VE', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Venezuela
  ('VG', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- British Virgin Islands
  ('VI', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- U.S. Virgin Islands
  ('VL', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- St. Thomas (U.S. Virgin Islands)
  ('VN', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Vietnam
  ('VU', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Vanuatu
  ('WF', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Wallis & Futuna Islands
  ('WL', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE), -- Wales (United Kingdom)
  ('WS', 143, 143, 'KRW', CURRENT_DATE, NULL, TRUE), -- Samoa
  ('YA', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Yap (Micronesia, Federated States of)
  ('YE', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Yemen, Republic of
  ('YT', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Mayotte
  ('ZA', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- South Africa
  ('ZM', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Zambia
  ('ZW', 430, 430, 'KRW', CURRENT_DATE, NULL, TRUE), -- Zimbabwe
  ('ZZ', 720, 720, 'KRW', CURRENT_DATE, NULL, TRUE); -- Tortola (British Virgin Islands)

-- 검증
DO $$
DECLARE
  v_count INTEGER;
  v_dup   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.zen_ups_surge_fees WHERE is_active = TRUE;
  IF v_count <> 250 THEN
    RAISE EXCEPTION '급증긴급 수수료 건수 불일치: 기대 250, 실제 %', v_count;
  END IF;

  SELECT COUNT(*) INTO v_dup FROM (
    SELECT destination_country_code FROM public.zen_ups_surge_fees
    WHERE is_active = TRUE GROUP BY destination_country_code HAVING COUNT(*) > 1
  ) d;
  IF v_dup > 0 THEN
    RAISE EXCEPTION '중복 국가코드 %건 발견', v_dup;
  END IF;

  RAISE NOTICE '급증긴급 수수료 %개국 재적재 완료', v_count;
END $$;

COMMIT;
