-- TASK-B-121 / Issue #462: zen_address_book에 state_province, city, zipcode, recipient_pccc 컬럼 추가
ALTER TABLE public.zen_address_book
  ADD COLUMN IF NOT EXISTS state_province TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS zipcode TEXT,
  ADD COLUMN IF NOT EXISTS recipient_pccc TEXT;

COMMENT ON COLUMN public.zen_address_book.state_province IS '시/도';
COMMENT ON COLUMN public.zen_address_book.city IS '시/군/구';
COMMENT ON COLUMN public.zen_address_book.zipcode IS '우편번호';
COMMENT ON COLUMN public.zen_address_book.recipient_pccc IS 'PCCC (Partner Customer Code)';
