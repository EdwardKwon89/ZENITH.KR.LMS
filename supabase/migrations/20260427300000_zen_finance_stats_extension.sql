-- [WBS 4.5.2] 운송원가 마스터 테이블
CREATE TABLE IF NOT EXISTS public.zen_transport_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type TEXT NOT NULL CHECK (service_type IN ('AIR', 'SEA', 'CIR')),
    carrier_id UUID REFERENCES public.zen_organizations(id),
    origin_port_id UUID REFERENCES public.zen_ports(id),
    destination_port_id UUID REFERENCES public.zen_ports(id),
    weight_min NUMERIC NOT NULL DEFAULT 0,
    weight_max NUMERIC NOT NULL,
    unit_cost NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KRW',
    profit_margin NUMERIC NOT NULL DEFAULT 15.0, -- 기본 영업이익률
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [WBS 4.5.3] 운항 스케줄 테이블
CREATE TABLE IF NOT EXISTS public.zen_vessel_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type TEXT NOT NULL CHECK (service_type IN ('AIR', 'SEA')),
    carrier_id UUID REFERENCES public.zen_organizations(id),
    vessel_name TEXT,
    voyage_no TEXT,
    origin_port_id UUID REFERENCES public.zen_ports(id),
    destination_port_id UUID REFERENCES public.zen_ports(id),
    etd TIMESTAMPTZ NOT NULL,
    eta TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE public.zen_transport_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_vessel_schedules ENABLE ROW LEVEL SECURITY;

-- Admin 전용 정책 (운송원가)
CREATE POLICY "Admin full access to transport costs" ON public.zen_transport_costs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ZENITH_SUPER_ADMIN', 'ADMIN')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ZENITH_SUPER_ADMIN', 'ADMIN')));

-- 공통 조회 정책 (운항 스케줄)
CREATE POLICY "All authenticated users can view schedules" ON public.zen_vessel_schedules
    FOR SELECT TO authenticated USING (true);

-- Admin CRUD 정책 (운항 스케줄)
CREATE POLICY "Admin can manage schedules" ON public.zen_vessel_schedules
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ZENITH_SUPER_ADMIN', 'ADMIN')));

-- Indices
CREATE INDEX IF NOT EXISTS idx_trans_costs_service ON public.zen_transport_costs(service_type);
CREATE INDEX IF NOT EXISTS idx_vessel_schedules_etd ON public.zen_vessel_schedules(etd);
