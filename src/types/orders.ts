import { Database } from "./supabase";

export type OrderType = 'B2B' | 'B2C_ECOM' | 'B2C_EXPRESS';

export interface OrderItem {
  sku_code?: string;
  item_name: string;
  quantity: number;
  unit_price?: number;
  currency?: string;
  weight?: number;
  volume?: number;
}

export interface CreateOrderRequest {
  order_no?: string; // 서버에서 생성 가능
  order_type: OrderType;
  shipper_id: string;
  origin_port_id: string;
  dest_port_id: string;
  recipient_pccc?: string;
  recipient_contact?: string;
  recipient_email?: string;
  delivery_notes?: string;
  items: OrderItem[];
  cargo_details?: any; // B2B용 기존 필드 호환
}

export type OrderListItem = Database['public']['Tables']['zen_orders']['Row'] & {
  shipper: { name: string };
  origin_port: { name: string, code: string };
  dest_port: { name: string, code: string };
};
