-- Issue #1041: 법인정보 주소 입력 확장 — zen_organizations 컬럼 단위 GRANT 확장
-- 기존 GRANT: rep_name, biz_no, contact_phone, contact_email, address (5개)
-- 신규 추가: country_code, state_province, city, address_detail, zipcode, address_english, address_detail_english (7개)

GRANT UPDATE (country_code, state_province, city, address_detail, zipcode, address_english, address_detail_english)
  ON public.zen_organizations TO authenticated;
