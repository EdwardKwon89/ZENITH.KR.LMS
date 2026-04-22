-- [WBS 2.2] 마스터 오더 및 창고 운영 기초 스키마
-- 작성일: 2026-04-21
-- 수행주체: CTO Agent / 감사주체: GEN CEO

-- 1. 마스터 오더 번호 생성을 위한 시퀀스
CREATE SEQUENCE IF NOT EXISTS master_order_no_seq START 1;

-- 2. 마스터 오더 본체 테이블
CREATE TABLE IF NOT EXISTS public.zen_master_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_no TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'PACKED', 'RELEASED', 'DEPARTED', 'ARRIVED', 'COMPLETED', 'CANCELLED')),
    
    -- 계측 및 정산 기초 데이터
    total_house_count INTEGER DEFAULT 0,
    total_gross_weight NUMERIC(12, 3) DEFAULT 0,
    total_volume NUMERIC(12, 4) DEFAULT 0,
    
    -- 운송 정보 (마스터 단위)
    carrier_id UUID REFERENCES public.zen_organizations(id),
    vessel_flight_no TEXT,
    etd TIMESTAMPTZ,
    eta TIMESTAMPTZ,
    origin_port_id UUID REFERENCES public.zen_ports(id),
    dest_port_id UUID REFERENCES public.zen_ports(id),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    remarks TEXT
);

-- 3. 기존 오더 테이블에 마스터 연결 컬럼 및 가드 컬럼 추가
ALTER TABLE public.zen_orders 
ADD COLUMN IF NOT EXISTS master_order_id UUID REFERENCES public.zen_master_orders(id) ON DELETE SET NULL;

-- 4. 마스터 오더 번호 자동 생성 함수 (M-YYMMDD-NNNN)
CREATE OR REPLACE FUNCTION generate_master_order_no() 
RETURNS TEXT AS $$
DECLARE
    seq_val INT;
    date_part TEXT;
BEGIN
    seq_val := nextval('master_order_no_seq');
    date_part := to_char(CURRENT_DATE, 'YYMMDD');
    RETURN 'M' || date_part || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 5. RLS 설정 (기존 거버넌스 정책 계승)
ALTER TABLE public.zen_master_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to master orders"
ON public.zen_master_orders FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. 트리거: 마스터 오더 업데이트 시 updated_at 갱신
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_zen_master_orders_modtime
BEFORE UPDATE ON public.zen_master_orders
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp_column();

COMMENT ON TABLE public.zen_master_orders IS '지능형 물류 플랫폼 마스터 오더(Master Order) 관리 테이블';
COMMENT ON COLUMN public.zen_master_orders.master_no IS '마스터 오더 번호 (예: M260421-0001)';
