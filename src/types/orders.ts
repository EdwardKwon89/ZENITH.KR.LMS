import { Database, Json } from "./supabase";

export type OrderType = 'B2B' | 'B2C_ECOM' | 'B2C_EXPRESS';

/**
 * 📦 ZENITH 통합 오더 상태 Enum
 */
export enum OrderStatus {
  REGISTERED = 'REGISTERED',
  SCHEDULED = 'SCHEDULED',
  WAREHOUSED = 'WAREHOUSED',
  PACKED = 'PACKED',
  RELEASED = 'RELEASED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CLAIMED = 'CLAIMED',
  HELD = 'HELD',
  CANCELED = 'CANCELED',
  RETURNED = 'RETURNED',
  DISPOSED = 'DISPOSED',
  MASTERED = 'MASTERED',
}

/**
 * 상태별 UI 메타데이터 (라벨, 색상)
 */
export const ORDER_STATUS_META: Record<OrderStatus, { labelKey: string; color: string; descriptionKey: string }> = {
  [OrderStatus.REGISTERED]: { labelKey: 'REGISTERED.label', color: 'bg-blue-100 text-blue-800', descriptionKey: 'REGISTERED.description' },
  [OrderStatus.SCHEDULED]: { labelKey: 'SCHEDULED.label', color: 'bg-indigo-100 text-indigo-800', descriptionKey: 'SCHEDULED.description' },
  [OrderStatus.WAREHOUSED]: { labelKey: 'WAREHOUSED.label', color: 'bg-yellow-100 text-yellow-800', descriptionKey: 'WAREHOUSED.description' },
  [OrderStatus.PACKED]: { labelKey: 'PACKED.label', color: 'bg-orange-100 text-orange-800', descriptionKey: 'PACKED.description' },
  [OrderStatus.RELEASED]: { labelKey: 'RELEASED.label', color: 'bg-purple-100 text-purple-800', descriptionKey: 'RELEASED.description' },
  [OrderStatus.IN_TRANSIT]: { labelKey: 'IN_TRANSIT.label', color: 'bg-cyan-100 text-cyan-800', descriptionKey: 'IN_TRANSIT.description' },
  [OrderStatus.DELIVERED]: { labelKey: 'DELIVERED.label', color: 'bg-green-100 text-green-800', descriptionKey: 'DELIVERED.description' },
  [OrderStatus.CLAIMED]: { labelKey: 'CLAIMED.label', color: 'bg-amber-100 text-amber-800', descriptionKey: 'CLAIMED.description' },
  [OrderStatus.HELD]: { labelKey: 'HELD.label', color: 'bg-red-100 text-red-800', descriptionKey: 'HELD.description' },
  [OrderStatus.CANCELED]: { labelKey: 'CANCELED.label', color: 'bg-gray-100 text-gray-800', descriptionKey: 'CANCELED.description' },
  [OrderStatus.RETURNED]: { labelKey: 'RETURNED.label', color: 'bg-rose-100 text-rose-800', descriptionKey: 'RETURNED.description' },
  [OrderStatus.DISPOSED]: { labelKey: 'DISPOSED.label', color: 'bg-stone-100 text-stone-800', descriptionKey: 'DISPOSED.description' },
  [OrderStatus.MASTERED]: { labelKey: 'MASTERED.label', color: 'bg-slate-700 text-white', descriptionKey: 'MASTERED.description' },
};

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
  order_no?: string;
  order_type: OrderType;
  shipper_id: string;
  origin_port_id: string;
  dest_port_id: string;
  recipient_pccc?: string;
  recipient_contact?: string;
  recipient_email?: string;
  delivery_notes?: string;
  items: OrderItem[];
  cargo_details?: Json;
}

export type OrderListItem = Database['public']['Tables']['zen_orders']['Row'] & {
  shipper: { name: string };
  origin_port: { name: string, code: string };
  dest_port: { name: string, code: string };
};

export type OrganizationItem = Database['public']['Tables']['zen_organizations']['Row'] & {
  iata_code?: string | null;
  prefix_code?: string | null;
};

export type MasterOrderListItem = Database['public']['Tables']['zen_master_orders']['Row'] & {
  origin_port?: { name: string, code: string } | null;
  dest_port?: { name: string, code: string } | null;
  carrier?: { name: string, iata_code?: string | null } | null;
  transport_mode?: string | null;
};

export type MasterOrderStatus = 'CREATED' | 'SCHEDULED' | 'RELEASED' | 'COMPLETED';
