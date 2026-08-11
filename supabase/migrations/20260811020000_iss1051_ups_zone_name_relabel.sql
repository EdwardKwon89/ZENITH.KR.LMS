-- DEF-B-048 / Issue #1051: zen_ups_zones 이름표를 번호만 표시하는 방식으로 단순화
-- 대륙명 라벨은 실제로 국가가 혼재돼 있어 부정확할 수밖에 없음 — 번호만 표시

UPDATE zen_ups_zones SET zone_name = 'Zone 1' WHERE zone_code = 'Z1';
UPDATE zen_ups_zones SET zone_name = 'Zone 2' WHERE zone_code = 'Z2';
UPDATE zen_ups_zones SET zone_name = 'Zone 3' WHERE zone_code = 'Z3';
UPDATE zen_ups_zones SET zone_name = 'Zone 4' WHERE zone_code = 'Z4';
UPDATE zen_ups_zones SET zone_name = 'Zone 5' WHERE zone_code = 'Z5';
UPDATE zen_ups_zones SET zone_name = 'Zone 6' WHERE zone_code = 'Z6';
UPDATE zen_ups_zones SET zone_name = 'Zone 7' WHERE zone_code = 'Z7';
UPDATE zen_ups_zones SET zone_name = 'Zone 8' WHERE zone_code = 'Z8';
UPDATE zen_ups_zones SET zone_name = 'Zone 9' WHERE zone_code = 'Z9';
UPDATE zen_ups_zones SET zone_name = 'Zone 10' WHERE zone_code = 'Z10';
