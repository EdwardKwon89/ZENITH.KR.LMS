export type ClaimStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
export type ClaimReason = 'DELAY' | 'DAMAGE' | 'MISDELIVERY';

export interface Claim {
  id: string;
  order_id: string;
  org_id: string;
  created_by: string;
  reason_code: ClaimReason;
  description: string;
  status: ClaimStatus;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  order?: {
    order_no: string;
    status: string;
  };
  shipper?: {
    name: string;
  };
}

export interface IncidentFee {
  id: string;
  claim_id: string;
  invoice_id: string | null;
  fee_amount: number;
  currency: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface ClaimDetail extends Claim {
  order: any; // Detailed order info
  incident_fees: IncidentFee[];
}
