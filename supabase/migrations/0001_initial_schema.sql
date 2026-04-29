-- 1. 기초 테이블: 조직 및 프로필 (Multitype 지원)
CREATE TABLE zen_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PLATFORM', 'SHIPPER', 'CARRIER')),
    metadata JSONB DEFAULT '{}'::jsonb, -- 사업자번호, 부피지수 등 유연한 데이터 저장
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE zen_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    org_id UUID REFERENCES zen_organizations(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 2. 물류 마스터 데이터: 항구/공항 정보
CREATE TABLE zen_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- IATA/UNLOCODE (e.g., ICN, PUS, LAX)
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('AIR', 'SEA', 'LAND')),
    country_code CHAR(2),
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 3. 계약 및 요율 관리 (Multimodal Support)
CREATE TABLE zen_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipper_id UUID REFERENCES zen_organizations(id), -- 화주
    carrier_id UUID REFERENCES zen_organizations(id), -- 물류사/플랫폼
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    terms_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE zen_rate_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES zen_organizations(id), -- carrier_id 역할
    contract_id UUID REFERENCES zen_contracts(id),
    origin_id UUID REFERENCES zen_ports(id),
    destination_id UUID REFERENCES zen_ports(id),
    origin_code TEXT, -- IATA/UNLOCODE (e.g., ICN, LAX)
    dest_code TEXT,   -- IATA/UNLOCODE
    mode TEXT NOT NULL CHECK (mode IN ('AIR', 'SEA', 'LAND')),
    unit_type TEXT NOT NULL CHECK (unit_type IN ('KG', 'CBM', 'LOT', 'FCL_20', 'FCL_40', 'LCL')),
    weight_tier_min NUMERIC DEFAULT 0,
    rate_price NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 4. 운항/배차 스케줄 정보
CREATE TABLE zen_transport_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode TEXT NOT NULL CHECK (mode IN ('AIR', 'SEA', 'LAND')),
    carrier_id UUID REFERENCES zen_organizations(id),
    vessel_flight_no TEXT, -- 항공편명, 선박명, 차량번호
    origin_port_id UUID REFERENCES zen_ports(id),
    destination_port_id UUID REFERENCES zen_ports(id),
    etd TIMESTAMPTZ, -- 출발예정
    eta TIMESTAMPTZ, -- 도착예정
    schedule_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 5. 오더 관리 (계약 및 스케줄 배정 연계)
CREATE TABLE zen_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no TEXT UNIQUE NOT NULL,
    shipper_id UUID REFERENCES zen_organizations(id),
    contract_id UUID REFERENCES zen_contracts(id), -- 계약 기반 요율 산정용
    schedule_id UUID REFERENCES zen_transport_schedules(id), -- 사후 배정 가능 (NULL 허용)
    status TEXT DEFAULT 'REGISTERED',
    cargo_details JSONB NOT NULL, -- 품명, 중량, Dim 등
    estimated_cost NUMERIC,
    actual_cost NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 6. 보안 설정 (RLS)
ALTER TABLE zen_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE zen_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE zen_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON zen_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Organizations are viewable by assigned members" ON zen_organizations
    FOR SELECT USING (EXISTS (SELECT 1 FROM zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.org_id = zen_organizations.id));
CREATE POLICY "Shippers can view their own zen_orders" ON zen_orders
    FOR SELECT USING (EXISTS (SELECT 1 FROM zen_profiles WHERE zen_profiles.id = auth.uid() AND (zen_profiles.org_id = zen_orders.shipper_id OR zen_profiles.role = 'ADMIN')));
