// Agency 역할 모델 타입 정의 — TASK-139 / IMP-111

export interface AgencyShipper {
  id: string;
  agency_org_id: string;
  shipper_org_id: string;
  shipper_type: 'INDIVIDUAL' | 'CORPORATE';
  discount_rate: number;
  grade: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AgencyShipperRow extends AgencyShipper {
  shipper: { id: string; name: string; biz_no: string | null; status: string }[] | null;
}

export interface CreateAgencyShipperInput {
  name: string;
  shipper_type: 'INDIVIDUAL' | 'CORPORATE';
  discount_rate: number;
  grade?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface AgencyRateOverride {
  id: string;
  agency_org_id: string;
  base_rate_id: string;
  selling_price: number;
  cost_price: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}
