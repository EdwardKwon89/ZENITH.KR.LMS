export interface Inventory {
  id: string;
  org_id: string;
  sku_code: string;
  item_name: string;
  on_hand_qty: number;
  reserved_qty: number;
  available_qty: number;
  warehouse_location?: string | null;
  min_stock_level: number;
  created_at: string;
  updated_at: string;
}

export type InventoryTransactionType = 
  | 'INBOUND' 
  | 'OUTBOUND' 
  | 'ADJUSTMENT' 
  | 'RESERVATION' 
  | 'RESERVATION_CANCEL';

export interface InventoryHistory {
  id: string;
  inventory_id: string;
  org_id: string;
  transaction_type: InventoryTransactionType;
  change_qty: number;
  result_qty: number;
  reference_id?: string | null;
  remarks?: string | null;
  created_by?: string | null;
  created_at: string;
}
