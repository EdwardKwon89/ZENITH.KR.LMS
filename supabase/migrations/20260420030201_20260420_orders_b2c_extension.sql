-- 1. zen_orders 테이블 확장
ALTER TABLE public.zen_orders 
ADD COLUMN recipient_pccc TEXT,
ADD COLUMN recipient_contact TEXT,
ADD COLUMN recipient_email TEXT,
ADD COLUMN order_type TEXT DEFAULT 'B2B' CHECK (order_type IN ('B2B', 'B2C_ECOM', 'B2C_EXPRESS')),
ADD COLUMN delivery_notes TEXT;

-- 2. zen_order_items 테이블 신설
CREATE TABLE public.zen_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
    sku_code TEXT,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(15, 2),
    currency TEXT DEFAULT 'USD',
    weight NUMERIC(15, 3), -- kg 단위
    volume NUMERIC(15, 4), -- CBM 단위
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. 검색 성능 향상을 위한 인덱스 설정
CREATE INDEX idx_zen_orders_order_no ON public.zen_orders(order_no);
CREATE INDEX idx_zen_order_items_order_id ON public.zen_order_items(order_id);

-- 4. RLS(Row Level Security) 설정
ALTER TABLE public.zen_order_items ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 자신의 오더에 속한 아이템을 볼 수 있도록 정책 설정 (초기 단계는 단순 허용)
CREATE POLICY "Users can view items of accessible orders" ON public.zen_order_items
    FOR SELECT USING (true); -- 추후 zen_orders의 RLS와 연동 필요

COMMENT ON TABLE public.zen_order_items IS '복수 아이템을 관리하는 오더 상세 테이블 (B2C 대응)';
;
