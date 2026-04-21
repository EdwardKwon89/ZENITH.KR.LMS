-- 1. zen_rate_cards 테이블 확장 (마켓플레이스 모델 대응)
ALTER TABLE zen_rate_cards 
ADD COLUMN IF NOT EXISTS transit_days INTEGER,
ADD COLUMN IF NOT EXISTS is_direct BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS remarks TEXT;
-- 2. zen_rate_tiers (슬랩 요율 상세) 테이블 생성
CREATE TABLE IF NOT EXISTS zen_rate_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_card_id UUID REFERENCES zen_rate_cards(id) ON DELETE CASCADE,
    weight_min NUMERIC NOT NULL DEFAULT 0, -- 구간 시작 (ex: 45)
    unit_price NUMERIC NOT NULL, -- 해당 구간의 kg/cbm당 단가
    min_total_price NUMERIC DEFAULT 0, -- 해당 구간 적용 시 최소 보장 금액
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 인덱스 추가 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_rate_tiers_card_id ON zen_rate_tiers(rate_card_id);
CREATE INDEX IF NOT EXISTS idx_rate_cards_route ON zen_rate_cards(origin_code, dest_code, mode);
