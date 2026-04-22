import { Database } from "./supabase";

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
  HELD = 'HELD',
  CANCELED = 'CANCELED',
  RETURNED = 'RETURNED',
  MASTERED = 'MASTERED',
}

/**
 * 상태별 UI 메타데이터 (라벨, 색상)
 */
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string; description: string }> = {
  [OrderStatus.REGISTERED]: { label: '접수', color: 'bg-blue-100 text-blue-800', description: '오더가 신규 등록됨' },
  [OrderStatus.SCHEDULED]: { label: '스케줄배정', color: 'bg-indigo-100 text-indigo-800', description: '운송 수단 배정 완료' },
  [OrderStatus.WAREHOUSED]: { label: '입고완료', color: 'bg-yellow-100 text-yellow-800', description: '창고 실물 입고 확인' },
  [OrderStatus.PACKED]: { label: '패킹완료', color: 'bg-orange-100 text-orange-800', description: '출고용 패킹/래핑 완료' },
  [OrderStatus.RELEASED]: { label: '출고완료', color: 'bg-purple-100 text-purple-800', description: '창고 출고 및 운송장 부착' },
  [OrderStatus.IN_TRANSIT]: { label: '운송중', color: 'bg-cyan-100 text-cyan-800', description: '최종 목적지로 이동 중' },
  [OrderStatus.DELIVERED]: { label: '배송완료', color: 'bg-green-100 text-green-800', description: '수하인에게 인도 완료' },
  [OrderStatus.HELD]: { label: '보류', color: 'bg-red-100 text-red-800', description: '문제 발생으로 인한 일시 중단' },
  [OrderStatus.CANCELED]: { label: '취소', color: 'bg-gray-100 text-gray-800', description: '오더 취소됨' },
  [OrderStatus.RETURNED]: { label: '반송', color: 'bg-rose-100 text-rose-800', description: '화주에게 화물 반송됨' },
  [OrderStatus.MASTERED]: { label: '마스터결합', color: 'bg-slate-700 text-white', description: '마스터 오더에 바인딩되어 수정이 제한됨' },
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
  cargo_details?: any;
}

export type OrderListItem = Database['public']['Tables']['zen_orders']['Row'] & {
  shipper: { name: string };
  origin_port: { name: string, code: string };
  dest_port: { name: string, code: string };
};

export type MasterOrderListItem = Database['public']['Tables']['zen_master_orders']['Row'] & {
  origin_port?: { name: string, code: string } | null;
  dest_port?: { name: string, code: string } | null;
  carrier?: { name: string } | null;
};

export type MasterOrderStatus = 'CREATED' | 'SCHEDULED' | 'RELEASED' | 'COMPLETED';
