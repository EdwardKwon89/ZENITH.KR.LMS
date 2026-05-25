-- IMP-088: 개인정보 활용동의 컬럼 추가
-- 개인정보보호법 제15조 준수 — 정보주체 동의 시각 기록

ALTER TABLE public.zen_profiles
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_consent_at   TIMESTAMPTZ;

COMMENT ON COLUMN public.zen_profiles.privacy_consent_at IS '개인정보 수집·이용 동의 시각 (KST)';
COMMENT ON COLUMN public.zen_profiles.terms_consent_at IS '서비스 이용약관 동의 시각 (KST)';
