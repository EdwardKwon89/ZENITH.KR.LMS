-- 1. zen_orders 테이블 배송 정보 필드 확장
ALTER TABLE public.zen_orders 
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS recipient_address TEXT,
ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
ADD COLUMN IF NOT EXISTS recipient_zipcode TEXT;

-- 2. zen_order_packages (패킹 단위) 테이블 신규 생성
CREATE TABLE IF NOT EXISTS public.zen_order_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
    packing_unit TEXT NOT NULL, -- BOX, PLT, CRT, WOOD, BAG 등
    packing_count INTEGER DEFAULT 1,
    length NUMERIC, -- cm
    width NUMERIC,  -- cm
    height NUMERIC, -- cm
    gross_weight NUMERIC, -- kg
    volume NUMERIC, -- CBM
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. zen_order_items 테이블 계층 구조 및 HS Code 필드 확장
ALTER TABLE public.zen_order_items 
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.zen_order_packages(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS hs_code TEXT,
ADD COLUMN IF NOT EXISTS item_packing_unit TEXT;

-- 4. 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_zen_order_packages_order_id ON public.zen_order_packages(order_id);
CREATE INDEX IF NOT EXISTS idx_zen_order_items_package_id ON public.zen_order_items(package_id);

-- 5. RLS(Row Level Security) 정책 적용 (필요 시 기존 정책 복제 유도)
ALTER TABLE public.zen_order_packages ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.zen_order_packages TO postgres, service_role, authenticated;
;
