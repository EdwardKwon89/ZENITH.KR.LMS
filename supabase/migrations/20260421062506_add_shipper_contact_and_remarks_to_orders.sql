-- public.zen_orders 테이블에 송하인 정보 및 비고란 컬럼 추가
ALTER TABLE public.zen_orders 
ADD COLUMN IF NOT EXISTS shipper_contact_name TEXT,
ADD COLUMN IF NOT EXISTS shipper_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- 컬럼 설명 주석 추가
COMMENT ON COLUMN public.zen_orders.shipper_contact_name IS '송하인(화주) 측 실제 담당자 성명';
COMMENT ON COLUMN public.zen_orders.shipper_contact_phone IS '송하인(화주) 측 실제 담당자 연락처';
COMMENT ON COLUMN public.zen_orders.description IS '오더 관련 비고 및 특이사항';
;
