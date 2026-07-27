-- Issue #554: zen_organizations에 영문 주소 필드 추가
-- Mike (Team B) TASK-B-149

ALTER TABLE public.zen_organizations
  ADD COLUMN IF NOT EXISTS address_english text,
  ADD COLUMN IF NOT EXISTS address_detail_english text;

COMMENT ON COLUMN public.zen_organizations.address_english IS '영문 도로명주소 (다음/카카오 API 자동 제공 roadAddressEnglish)';
COMMENT ON COLUMN public.zen_organizations.address_detail_english IS '영문 상세주소 (수동 입력)';
