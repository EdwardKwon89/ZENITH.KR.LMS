-- TASK-B-340 (Issue #1256): 화주 국가코드 빈 값('') 기존 데이터 정정
--
-- 배경: 수정 화면의 화주 "주소"가 비어 보이는 원인은 shipper_country_code가 ''로 저장된 행이다.
--   SHXK 전송은 `(order.shipper_country_code) || shipperDefaults.country`로 빈 값을 이미 KR로 처리해
--   라벨 발급에는 영향이 없었다(표시 결함). 따라서 주소가 있는 '' 행을 KR로 맞춘다.
--
-- 범위:
--   - ''(빈 문자열)만 대상. NULL은 건드리지 않는다(주소 없는 AIR 등 — 기본값 `??`/`||`가 화면에서 처리).
--   - 주소가 없는 행(COALESCE(shipper_address,'') = '')은 건드리지 않는다.
--   - 멱등: 재실행 시 0행.

UPDATE public.zen_orders
SET shipper_country_code = 'KR'
WHERE shipper_country_code = ''
  AND COALESCE(shipper_address, '') <> '';
