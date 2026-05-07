-- Ensure baseline grade master rows exist for profile FK/default grade flows.

INSERT INTO public.grade_master (
  grade_code,
  grade_name_ko,
  grade_name_en,
  discount_rate,
  benefit_desc
)
VALUES
  ('IRON', '아이언', 'Iron', 0, '기본 등급'),
  ('BRONZE', '브론즈', 'Bronze', 5, '기본 할인 제공'),
  ('SILVER', '실버', 'Silver', 10, '추가 할인 제공'),
  ('GOLD', '골드', 'Gold', 15, '최대 우대 등급')
ON CONFLICT (grade_code) DO UPDATE
SET
  grade_name_ko = EXCLUDED.grade_name_ko,
  grade_name_en = EXCLUDED.grade_name_en,
  discount_rate = EXCLUDED.discount_rate,
  benefit_desc = EXCLUDED.benefit_desc;
