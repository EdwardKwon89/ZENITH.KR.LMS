-- 20260810140000_ups_fuel_surcharge_real_data.sql
-- DEF-B-042 (Issue #1035): UPS 공식 발표 유류할증료 13주 실데이터 반영.
-- JSJung 확정(2026-08-10): "판매할증은 의미가 없다, UPS 공지값 그대로 사용"
-- → selling_rate = cost_rate = UPS 공지값(마진 없이 동일 적용).
-- 기존 placeholder(2026-06-28 seed: selling 0.185 / cost 0.155)는 이 마이그레이션으로 전부 덮어써진다.
-- effective_week는 실제 월요일 날짜로 고정(과거 이력이므로 CURRENT_DATE 동적 계산 금지).

BEGIN;

-- [TASK-B-269 v2] 값 기반 placeholder 완전 제거 (Jaison 2026-08-10 반려 대응)
-- seed 마이그레이션(20260628000000)은 db reset 시 빈 테이블에 먼저 실행되어
-- CURRENT_DATE 기준 "이번 주" placeholder(0.185/0.155)를 매번 재삽입한다.
-- 이 마이그레이션은 2026-08-10까지의 13주만 덮어쓰므로, 2026-08-17 이후부터는
-- 해당 주차가 13주 범위 밖에 있어 placeholder가 살아남아 매주 자동 원복되는 결함이 있었다.
-- → 주차와 무관하게 placeholder 값을 값으로 즉시 삭제하여 절대 살아남지 못하게 한다.
DELETE FROM public.zen_ups_fuel_surcharges
WHERE selling_rate = 0.185 AND cost_rate = 0.155;

CREATE TEMP TABLE fuel_weeks (
  effective_week DATE PRIMARY KEY,
  rate NUMERIC(8,4) NOT NULL
) ON COMMIT DROP;

INSERT INTO fuel_weeks (effective_week, rate) VALUES
  ('2026-05-18', 0.4950), -- 49.50%
  ('2026-05-25', 0.5025), -- 50.25%
  ('2026-06-01', 0.5025), -- 50.25%
  ('2026-06-08', 0.4325), -- 43.25%
  ('2026-06-15', 0.4375), -- 43.75%
  ('2026-06-22', 0.4225), -- 42.25%
  ('2026-06-29', 0.3925), -- 39.25%
  ('2026-07-06', 0.3900), -- 39.00%
  ('2026-07-13', 0.3925), -- 39.25%
  ('2026-07-20', 0.4050), -- 40.50%
  ('2026-07-27', 0.4475), -- 44.75%
  ('2026-08-03', 0.4625), -- 46.25%
  ('2026-08-10', 0.4675); -- 46.75%

-- 1) 전체 적용(전 상품) 행: product_id = NULL, 13주 upsert.
--    Postgres UNIQUE(product_id, effective_week)는 NULL을 서로 다른 값으로 취급하므로
--    ON CONFLICT로는 기존 NULL 행을 덮어쓸 수 없다 → 13주에 해당하는 기존 NULL 행을
--    먼저 제거한 뒤 실데이터로 삽입(seed placeholder 0.185/0.155 제거 겸함).
DELETE FROM public.zen_ups_fuel_surcharges
WHERE product_id IS NULL
  AND effective_week IN (SELECT effective_week FROM fuel_weeks);

INSERT INTO public.zen_ups_fuel_surcharges (product_id, effective_week, selling_rate, cost_rate)
SELECT NULL, w.effective_week, w.rate, w.rate
FROM fuel_weeks w;

-- 2) 상품별 개별 행: 현재 zen_ups_products 전체 상품 × 13주 upsert
INSERT INTO public.zen_ups_fuel_surcharges (product_id, effective_week, selling_rate, cost_rate)
SELECT p.id, w.effective_week, w.rate, w.rate
FROM public.zen_ups_products p
CROSS JOIN fuel_weeks w
ON CONFLICT (product_id, effective_week)
DO UPDATE SET selling_rate = EXCLUDED.selling_rate, cost_rate = EXCLUDED.cost_rate;

COMMIT;
