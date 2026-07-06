-- TASK-B-059 §1: zen_orders.agency_org_id 컬럼 추가
ALTER TABLE zen_orders
  ADD COLUMN IF NOT EXISTS agency_org_id uuid REFERENCES zen_organizations(id);

COMMENT ON COLUMN zen_orders.agency_org_id IS 'Agency 화주가 등록한 오더의 대리점 org_id (TASK-B-059)';

-- RLS: AGENCY_SHIPPER는 자신의 agency_org_id에 속한 오더만 조회 가능
CREATE POLICY "agency_shipper_select_own_orders"
  ON zen_orders FOR SELECT
  USING (
    agency_org_id = (
      SELECT org_id FROM zen_profiles WHERE id = auth.uid()
    )
  );
