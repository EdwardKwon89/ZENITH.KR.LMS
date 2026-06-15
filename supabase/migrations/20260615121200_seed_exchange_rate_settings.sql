-- 🛡️ [ZENITH_LMS Exchange Rate settings seed]
-- Created: 2026-06-15
-- Description: 환율 설정을 관리하는 초기 데이터 시드

-- 기준 통화 (기본값: KRW)
INSERT INTO system_settings (key, value, category, label, description)
VALUES ('BASE_CURRENCY', '"KRW"', 'GENERAL', '기준 통화', '기준 통화 코드')
ON CONFLICT (key) DO NOTHING;

-- 환율 (기본값: 1.0 — 동일 통화 대비)
INSERT INTO system_settings (key, value, category, label, description)
VALUES
  ('EXCHANGE_RATE_USD', '1380.00', 'GENERAL', 'USD 환율', 'USD → KRW 환율'),
  ('EXCHANGE_RATE_CNY', '190.00', 'GENERAL', 'CNY 환율', 'CNY → KRW 환율'),
  ('EXCHANGE_RATE_JPY', '9.20',   'GENERAL', 'JPY 환율', 'JPY → KRW 환율')
ON CONFLICT (key) DO NOTHING;
