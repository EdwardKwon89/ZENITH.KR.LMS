-- public.zen_orders 테이블에 transport_mode (운송수단) 컬럼 추가
ALTER TABLE public.zen_orders 
ADD COLUMN IF NOT EXISTS transport_mode TEXT DEFAULT 'AIR';

-- 마스터 코드와 정렬을 위해 코멘트 추가
COMMENT ON COLUMN public.zen_orders.transport_mode IS '운송 수단 (AIR: 항공, SEA: 해상, EXP: 특송, LAND: 육상)';

-- 인덱스 추가 (필요 시 조항/필터링 최적화)
CREATE INDEX IF NOT EXISTS idx_zen_orders_transport_mode ON public.zen_orders(transport_mode);
