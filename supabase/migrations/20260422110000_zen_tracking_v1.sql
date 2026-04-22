-- [WBS 3.1] 지능형 트래킹 인프라 구축 마이그레이션
-- 작성일: 2026-04-22
-- 작성자: Execution Agent (ZEN CEO 총괄)

-- 1. 트래킹 설정 관리 테이블
CREATE TABLE IF NOT EXISTS public.zen_tracking_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.zen_orders(id) ON DELETE CASCADE,
    tracking_no TEXT UNIQUE,
    provider_type TEXT NOT NULL CHECK (provider_type IN ('VIRTUAL', 'MANUAL', 'API')),
    provider_name TEXT, -- 예: 'FEDEX', 'DHL', 'ZSim(Virtual)'
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 트래킹 이벤트 노드 테이블
CREATE TABLE IF NOT EXISTS public.zen_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_config_id UUID REFERENCES public.zen_tracking_configs(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.zen_orders(id) ON DELETE CASCADE,
    event_code TEXT NOT NULL, -- 예: 'PICKUP', 'DEPARTED', 'ARRIVED', 'DELIVERED'
    event_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    description TEXT,
    source_type TEXT DEFAULT 'SYSTEM', -- 'SYSTEM', 'ADMIN', 'EXTERNAL_API'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 시뮬레이션 시나리오 템플릿 테이블
CREATE TABLE IF NOT EXISTS public.zen_tracking_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_mode TEXT NOT NULL CHECK (transport_mode IN ('AIR', 'SEA', 'LAND')),
    order_status TEXT NOT NULL, -- 트리거가 될 오더 상태
    sequence_no INTEGER NOT NULL,
    event_code TEXT NOT NULL,
    relative_minutes INTEGER NOT NULL, -- 상태 변경 시점 대비 과거/미래 시간 차이 (CEO 지침: 과거 기록용)
    location_template TEXT,
    description_template TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 인덱스 생성
CREATE INDEX idx_tracking_config_order ON public.zen_tracking_configs(order_id);
CREATE INDEX idx_tracking_events_order ON public.zen_tracking_events(order_id);
CREATE INDEX idx_tracking_events_time ON public.zen_tracking_events(event_time);

-- 5. 기초 시나리오 시드 데이터 (AIR 기준 예시)
INSERT INTO public.zen_tracking_scenarios (transport_mode, order_status, sequence_no, event_code, relative_minutes, location_template, description_template)
VALUES 
('AIR', 'RELEASED', 1, 'BOOKED', -120, 'System', 'Air freight booking confirmed'),
('AIR', 'RELEASED', 2, 'PICKED_UP', -60, 'Origin Warehouse', 'Cargo picked up from shipper'),
('AIR', 'RELEASED', 3, 'TERMINAL_IN', -10, 'Incheon Airport (ICN)', 'Cargo arrived at airport terminal'),
('AIR', 'DELIVERED', 4, 'ARRIVED', -30, 'Los Angeles (LAX)', 'Cargo arrived at destination airport'),
('AIR', 'DELIVERED', 5, 'DELIVERED', 0, 'Recipient', 'Final delivery completed'),
-- SEA 시나리오 추가
('SEA', 'RELEASED', 1, 'BOOKED', -240, 'System', 'Sea freight booking confirmed'),
('SEA', 'RELEASED', 2, 'PICKED_UP', -120, 'Container Yard', 'Container picked up'),
('SEA', 'RELEASED', 3, 'TERMINAL_IN', -30, 'Busan Port (PTP)', 'Container gated in at terminal'),
('SEA', 'DELIVERED', 4, 'ARRIVED', -60, 'Long Beach Port (LGP)', 'Vessel arrived at destination port'),
('SEA', 'DELIVERED', 5, 'DELIVERED', 0, 'Recipient', 'Container delivered to consignee');

-- 6. RLS 설정
ALTER TABLE public.zen_tracking_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tracking of their own orders" ON public.zen_tracking_configs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_orders o 
            WHERE o.id = zen_tracking_configs.order_id 
            AND (o.shipper_id = auth.uid() OR o.shipper_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()))
        )
    );

CREATE POLICY "Admins have full access to tracking configs" ON public.zen_tracking_configs
    USING (EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Users can view relevant tracking events" ON public.zen_tracking_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_orders o 
            WHERE o.id = zen_tracking_events.order_id 
            AND (o.shipper_id = auth.uid() OR o.shipper_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()))
        )
    );

CREATE POLICY "Admins can manage tracking events" ON public.zen_tracking_events
    USING (EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role = 'ADMIN'));
