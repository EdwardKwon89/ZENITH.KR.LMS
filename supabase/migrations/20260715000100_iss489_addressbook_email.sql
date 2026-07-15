-- TASK-B-129 / Issue #489 관련: zen_address_book에 recipient_email 컬럼 추가
ALTER TABLE zen_address_book
  ADD COLUMN IF NOT EXISTS recipient_email TEXT;
