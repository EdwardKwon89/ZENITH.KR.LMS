-- TASK-B-117 / Issue #440: zen_address_book에 recipient_address_detail 컬럼 추가
ALTER TABLE public.zen_address_book
  ADD COLUMN IF NOT EXISTS recipient_address_detail TEXT;

COMMENT ON COLUMN public.zen_address_book.recipient_address_detail IS '상세주소 (건물명, 호수 등)';
