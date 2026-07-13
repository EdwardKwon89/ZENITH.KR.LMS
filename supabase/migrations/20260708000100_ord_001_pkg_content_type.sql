-- TASK-B-076 REQ-03: zen_order_packages에 content_type 컬럼 추가
-- Issue #258

ALTER TABLE public.zen_order_packages
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'GENERAL'
    CHECK (content_type IN ('GENERAL', 'DOC', 'NONDOC'));

COMMENT ON COLUMN public.zen_order_packages.content_type
  IS '화물 유형: GENERAL=일반, DOC=서류(UPS), NONDOC=일반화물(UPS). DOC 선택 시 치수 입력 불필요.';
