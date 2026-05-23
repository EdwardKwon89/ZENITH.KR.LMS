-- IMP-070: 다중 경로 정산 연계 (zen_order_costs 컬럼 확장)
ALTER TABLE public.zen_order_costs
    ADD COLUMN IF NOT EXISTS route_option_id UUID REFERENCES public.zen_route_options(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS carrier TEXT,
    ADD COLUMN IF NOT EXISTS segment_index INTEGER;

-- RLS 및 캐시 무효화 처리를 위한 RLS 정책은 기존 order_id 및 profiles 조인을 따르므로 추가 작업 불필요.
