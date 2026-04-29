-- zen_notices 테이블에 is_important 컬럼 추가
ALTER TABLE zen_notices ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT false;
