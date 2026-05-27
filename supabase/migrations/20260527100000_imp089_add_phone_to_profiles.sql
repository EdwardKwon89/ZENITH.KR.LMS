-- IMP-089: ID 찾기 개인/법인 분리 — 전화번호 컬럼 추가
ALTER TABLE public.zen_profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

COMMENT ON COLUMN public.zen_profiles.phone_number IS '회원 전화번호 — ID 찾기 개인 본인 확인 힌트용';
