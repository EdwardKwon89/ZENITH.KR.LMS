-- IMP-109: BASE_CURRENCY 시스템 파라미터 추가
-- 기준 통화 설정 (기본값: KRW)

INSERT INTO zen_system_params (key, category, value_text, value_numeric, value_jsonb, description)
VALUES ('BASE_CURRENCY', 'FINANCE', 'KRW', NULL, NULL, '기준 통화 코드 (KRW / USD)')
ON CONFLICT (key) DO NOTHING;
