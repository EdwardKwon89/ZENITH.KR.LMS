-- 요율 할증/할인 정보 테이블 (IMP-011)
CREATE TABLE IF NOT EXISTS zen_rate_surcharges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_card_id UUID REFERENCES zen_rate_cards(id) ON DELETE CASCADE,
    surcharge_type TEXT NOT NULL CHECK (surcharge_type IN ('FSC', 'SSC', 'THC', 'DG', 'PEAK', 'CUSTOM')),
    calc_type TEXT NOT NULL CHECK (calc_type IN ('PERCENT', 'FIXED')),
    amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_rate_surcharges_card_id ON zen_rate_surcharges(rate_card_id);

-- RLS 정책 설정
ALTER TABLE zen_rate_surcharges ENABLE ROW LEVEL SECURITY;

-- 1. ADMIN/MANAGER 전체 접근
CREATE POLICY "Admin/Manager can manage surcharges" 
ON zen_rate_surcharges FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM zen_profiles 
        WHERE id = auth.uid() 
        AND role IN ('ADMIN', 'MANAGER')
    )
);

-- 2. CARRIER 소속 요율의 할증 정보 조회
CREATE POLICY "Carrier can view own card surcharges" 
ON zen_rate_surcharges FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM zen_rate_cards rc
        JOIN zen_profiles p ON p.org_id = rc.org_id
        WHERE rc.id = zen_rate_surcharges.rate_card_id
        AND p.id = auth.uid()
        AND p.role = 'CARRIER'
    )
);

-- 3. SHIPPER/CUSTOMER 소속 요율 조회 (마켓플레이스 노출용)
CREATE POLICY "Users can view surcharges for visible rate cards" 
ON zen_rate_surcharges FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM zen_rate_cards rc
        WHERE rc.id = zen_rate_surcharges.rate_card_id
    )
);

-- 기존 zen_rate_cards에 유효기간 기본값 보완 (있을 경우 대비)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='zen_rate_cards' AND column_name='valid_from') THEN
        ALTER TABLE zen_rate_cards ADD COLUMN valid_from TIMESTAMPTZ DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='zen_rate_cards' AND column_name='valid_to') THEN
        ALTER TABLE zen_rate_cards ADD COLUMN valid_to TIMESTAMPTZ;
    END IF;
END $$;
