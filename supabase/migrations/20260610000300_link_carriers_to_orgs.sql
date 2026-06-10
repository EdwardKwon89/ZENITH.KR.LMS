-- carrier org 연결 누락 수정
-- zen_carriers.org_id 미설정(9개) → zen_organizations 매핑 또는 신규 생성

-- 1. FedEx Express: 동명 org 직접 연결
UPDATE zen_carriers c
SET org_id = o.id
FROM zen_organizations o
WHERE o.name = 'FedEx Express' AND o.type = 'CARRIER'
  AND c.name = 'FedEx Express' AND c.org_id IS NULL;

-- 2. 나머지 8개 carrier용 조직 신규 생성 후 연결
DO $$
DECLARE
  v_org_id uuid;
  v_carrier RECORD;
BEGIN
  FOR v_carrier IN
    SELECT id, name FROM zen_carriers
    WHERE org_id IS NULL
    ORDER BY name
  LOOP
    -- 이미 동명 org가 존재하면 재사용, 없으면 삽입
    SELECT id INTO v_org_id
    FROM zen_organizations
    WHERE name = v_carrier.name AND type = 'CARRIER'
    LIMIT 1;

    IF v_org_id IS NULL THEN
      INSERT INTO zen_organizations (name, type)
      VALUES (v_carrier.name, 'CARRIER')
      RETURNING id INTO v_org_id;
    END IF;

    UPDATE zen_carriers SET org_id = v_org_id WHERE id = v_carrier.id;
  END LOOP;
END $$;
