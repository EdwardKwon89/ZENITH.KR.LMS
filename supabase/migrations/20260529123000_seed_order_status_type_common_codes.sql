-- UAT-02-02: OrderFilterBar STATUS/TYPE 콤보박스 empty 문제 해결
-- common_codes 테이블에 ORDER_STATUS / ORDER_TYPE 그룹 시드 데이터 등록

-- 1. common_code_groups에 그룹 등록 (FK 제약 조건 충족)
INSERT INTO public.common_code_groups (group_code, group_name, description, is_system)
VALUES
  ('ORDER_STATUS', '오더 상태', 'zen_orders.status 기준 오더 처리 상태', true),
  ('ORDER_TYPE', '오더 유형', 'zen_orders.order_type 기준 오더 유형', true)
ON CONFLICT (group_code) DO NOTHING;

-- 2. ORDER_STATUS 코드 등록
INSERT INTO public.common_codes (group_code, code_value, code_name_ko, code_name_en, is_active, sort_order)
VALUES
  ('ORDER_STATUS', 'PENDING',     '대기',        'Pending',     true, 5),
  ('ORDER_STATUS', 'REGISTERED',  '등록완료',    'Registered',  true, 10),
  ('ORDER_STATUS', 'CONFIRMED',   '접수확인',    'Confirmed',   true, 15),
  ('ORDER_STATUS', 'PICKED_UP',   '픽업완료',    'Picked Up',   true, 20),
  ('ORDER_STATUS', 'WAREHOUSED',  '입고완료',    'Warehoused',  true, 30),
  ('ORDER_STATUS', 'PACKED',      '포장완료',    'Packed',      true, 35),
  ('ORDER_STATUS', 'SCHEDULED',   '스케줄확정',  'Scheduled',   true, 40),
  ('ORDER_STATUS', 'MASTERED',    '마스터결합',  'Mastered',    true, 45),
  ('ORDER_STATUS', 'IN_TRANSIT',  '운송중',      'In Transit',  true, 50),
  ('ORDER_STATUS', 'ARRIVED',     '도착',        'Arrived',     true, 60),
  ('ORDER_STATUS', 'RELEASED',    '통관완료',    'Released',    true, 70),
  ('ORDER_STATUS', 'DELIVERED',   '배송완료',    'Delivered',   true, 80),
  ('ORDER_STATUS', 'HELD',        '보류',        'Held',        true, 90),
  ('ORDER_STATUS', 'RETURNED',    '반송',        'Returned',    true, 95),
  ('ORDER_STATUS', 'CANCELED',    '취소',        'Canceled',    true, 100),
  ('ORDER_STATUS', 'CLAIMED',     '클레임',      'Claimed',     true, 110),
  ('ORDER_STATUS', 'DISPOSED',    '폐기',        'Disposed',    true, 120)
ON CONFLICT (group_code, code_value) DO NOTHING;

-- 3. ORDER_TYPE 코드 등록
INSERT INTO public.common_codes (group_code, code_value, code_name_ko, code_name_en, is_active, sort_order)
VALUES
  ('ORDER_TYPE', 'B2B',          'B2B 일반',          'B2B General Cargo',     true, 10),
  ('ORDER_TYPE', 'B2C_ECOM',     'B2C 이커머스',      'B2C E-Commerce',        true, 20),
  ('ORDER_TYPE', 'B2C_EXPRESS',  'B2C 특송',          'B2C Express',           true, 30)
ON CONFLICT (group_code, code_value) DO NOTHING;
