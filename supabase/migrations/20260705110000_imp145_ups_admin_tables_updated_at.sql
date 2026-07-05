-- Phase 7.1 TASK-175 IMP-145: UPS Admin 테이블 updated_at 컬럼 추가
-- TASK-175 알려진 버그 1번 수정: zen_ups_zones·products·base_rates·other_charges 4개 테이블에 updated_at 추가

ALTER TABLE public.zen_ups_zones
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.zen_ups_products
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.zen_ups_base_rates
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.zen_ups_other_charges
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
