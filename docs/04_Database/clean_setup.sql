-- [ZENITH_LMS] Schema Reset & Master Data Setup
-- Date: 2026-04-17
-- Target: Supabase (zen_ prefixed tables)

-- 1. DROP EXISTING TABLES (CAUTION: DATA LOSS)
DROP TABLE IF EXISTS public.zen_orders CASCADE;
DROP TABLE IF EXISTS public.zen_rate_cards CASCADE;
DROP TABLE IF EXISTS public.zen_ports CASCADE;
DROP TABLE IF EXISTS public.zen_organizations CASCADE;

-- 2. CREATE TABLES (Aligned with SPEC)

-- Organizations
CREATE TABLE public.zen_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.zen_organizations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PLATFORM', 'SHIPPER', 'CARRIER')),
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ports
CREATE TABLE public.zen_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- IATA/UNLOCODE
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('AIR', 'SEA', 'LAND')),
    country_code CHAR(2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Rate Cards
CREATE TABLE public.zen_rate_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.zen_organizations(id) ON DELETE CASCADE,
    origin_code TEXT NOT NULL REFERENCES public.zen_ports(code),
    dest_code TEXT NOT NULL REFERENCES public.zen_ports(code),
    mode TEXT NOT NULL CHECK (mode IN ('AIR', 'SEA', 'LAND')),
    unit_type TEXT NOT NULL, -- KG, CBM, LCL, FCL_20, FCL_40
    unit_price NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders
CREATE TABLE public.zen_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no TEXT UNIQUE NOT NULL,
    shipper_id UUID REFERENCES public.zen_organizations(id),
    origin_port_id UUID REFERENCES public.zen_ports(id),
    dest_port_id UUID REFERENCES public.zen_ports(id),
    status TEXT DEFAULT 'REGISTERED',
    cargo_details JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SEED INITIAL MASTER DATA

-- Organizations
INSERT INTO public.zen_organizations (name, type, status) VALUES
('ZENITH LOGISTICS CORE', 'PLATFORM', 'ACTIVE'),
('SNTL CARRIER', 'CARRIER', 'ACTIVE'),
('GLOBAL SHIPPER KR', 'SHIPPER', 'ACTIVE');

-- Ports
INSERT INTO public.zen_ports (code, name, type, country_code) VALUES
('ICN', 'Incheon International Airport', 'AIR', 'KR'),
('PUS', 'Busan Port', 'SEA', 'KR'),
('LAX', 'Los Angeles International Airport', 'AIR', 'US'),
('SHA', 'Shanghai Port', 'SEA', 'CN');

-- Rate Cards
INSERT INTO public.zen_rate_cards (org_id, origin_code, dest_code, mode, unit_type, unit_price)
SELECT id, 'ICN', 'LAX', 'AIR', 'KG', 5.50 FROM zen_organizations WHERE type = 'CARRIER' LIMIT 1;

INSERT INTO public.zen_rate_cards (org_id, origin_code, dest_code, mode, unit_type, unit_price)
SELECT id, 'PUS', 'SHA', 'SEA', 'CBM', 45.00 FROM zen_organizations WHERE type = 'CARRIER' LIMIT 1;
