import { Database } from "./supabase";
import { WithRelations } from "./utils";

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

type ClaimOrder = WithRelations<
  Database['public']['Tables']['zen_orders']['Row'],
  {
    origin_port?: { code: string; name: string } | null;
    dest_port?: { code: string; name: string } | null;
    packages?: Array<
      WithRelations<
        Database['public']['Tables']['zen_order_packages']['Row'],
        { items?: Database['public']['Tables']['zen_order_items']['Row'][] }
      >
    >;
    costs?: Array<
      WithRelations<
        Database['public']['Tables']['zen_order_costs']['Row'],
        {
          invoice?: {
            id: string; invoice_no: string; total_amount: number; currency: string; status: string;
          } | null;
        }
      >
    >;
  }
>;

export interface ClaimDetail extends Omit<Claim, 'order'> {
  order: ClaimOrder;
  incident_fees: IncidentFee[];
}
