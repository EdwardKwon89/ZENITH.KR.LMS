import { BaseRepository } from './base.repository';
import { OrderRegistrationInput } from '@/lib/validation/order';
import { OrderStatus } from '@/types/orders';

export interface OrderWithRelations {
  id: string;
  [key: string]: unknown;
  shipper?: { name?: string } | null;
  origin_port?: { name?: string; code?: string } | null;
  dest_port?: { name?: string; code?: string } | null;
  packages?: Array<{
    id: string;
    [key: string]: unknown;
    items?: Array<{ [key: string]: unknown }>;
  }>;
}

export interface MasterOrderWithHouses {
  id: string;
  [key: string]: unknown;
  origin_port?: { code?: string; name?: string } | null;
  dest_port?: { code?: string; name?: string } | null;
  carrier?: { name?: string; iata_code?: string } | null;
  houses?: Array<{ [key: string]: unknown }>;
  totalHouses?: number;
}

/**
 * OrderRepository: Orders 도메인 DB 접근 전담
 *
 * 담당 테이블: zen_orders, zen_order_packages, zen_order_items, zen_master_orders, order_status_history
 */
export class OrderRepository extends BaseRepository {

  // ─── zen_orders ───────────────────────────────────────────────

  async findById(orderId: string) {
    return this.db
      .from('zen_orders')
      .select('*')
      .eq('id', orderId)
      .single();
  }

  async findByIdWithRelations(orderId: string) {
    return this.db
      .from('zen_orders')
      .select(`
        *,
        shipper:zen_organizations!shipper_id(*),
        origin_port:zen_ports!origin_port_id(*),
        dest_port:zen_ports!dest_port_id(*)
      `)
      .eq('id', orderId)
      .single();
  }

  async findList({
    page = 1,
    pageSize = 20,
    status,
    order_type,
    transport_mode,
    search,
    shipperId,
    createdBy,
  }: {
    page?: number;
    pageSize?: number;
    status?: string;
    order_type?: string;
    transport_mode?: string;
    search?: string;
    shipperId?: string;
    createdBy?: string;
  } = {}) {
    let query = this.db
      .from('zen_orders')
      .select(`
        *,
        shipper:zen_organizations!shipper_id(name),
        origin_port:zen_ports!origin_port_id(name, code),
        dest_port:zen_ports!dest_port_id(name, code)
      `, { count: 'exact' });

    if (shipperId) query = query.eq('shipper_id', shipperId);
    if (createdBy) query = query.eq('created_by', createdBy);
    if (status) query = query.eq('status', status);
    if (order_type) query = query.eq('order_type', order_type);
    if (transport_mode) query = query.eq('transport_mode', transport_mode);
    if (search) query = query.or(`order_no.ilike.%${search}%,recipient_name.ilike.%${search}%`);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    return query
      .order('created_at', { ascending: false })
      .range(from, to);
  }

  async createOrderViaRpc(payload: OrderRegistrationInput, userId: string, orgId: string) {
    return this.db.rpc('create_order_atomic', {
      p_payload: payload,
      p_user_id: userId,
      p_org_id: orgId,
    });
  }

  async updateHeader(orderId: string, data: Record<string, unknown>) {
    return this.db
      .from('zen_orders')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', orderId);
  }

  async updateStatus(orderId: string, nextStatus: OrderStatus) {
    return this.db
      .from('zen_orders')
      .update({ status: nextStatus })
      .eq('id', orderId);
  }

  async getStatus(orderId: string) {
    return this.db
      .from('zen_orders')
      .select('status, transport_mode')
      .eq('id', orderId)
      .single();
  }

  async getMasterOrderId(orderId: string) {
    return this.db
      .from('zen_orders')
      .select('master_order_id')
      .eq('id', orderId)
      .maybeSingle();
  }

  // ─── zen_order_packages ───────────────────────────────────────

  async getPackagesByOrderId(orderId: string) {
    return this.db
      .from('zen_order_packages')
      .select('id, order_id, packing_unit, packing_count, length, width, height, gross_weight, volume, remarks, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
  }

  async deletePackagesByOrderId(orderId: string) {
    return this.db.from('zen_order_packages').delete().eq('order_id', orderId);
  }

  async insertPackage(data: Record<string, unknown>) {
    return this.db
      .from('zen_order_packages')
      .insert(data)
      .select('id, order_id, packing_unit, packing_count, length, width, height, gross_weight, volume')
      .single();
  }

  // ─── zen_order_items ──────────────────────────────────────────

  async getItemsByOrderId(orderId: string) {
    return this.db
      .from('zen_order_items')
      .select('sku_code, quantity')
      .eq('order_id', orderId);
  }

  async getItemsFullByOrderId(orderId: string) {
    return this.db
      .from('zen_order_items')
      .select('id, order_id, package_id, sku_code, item_name, quantity, unit_price, currency, hs_code, item_packing_unit, volume, weight')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
  }

  async deleteItemsByOrderId(orderId: string) {
    return this.db.from('zen_order_items').delete().eq('order_id', orderId);
  }

  async insertItems(items: Array<Record<string, unknown>>) {
    return this.db.from('zen_order_items').insert(items);
  }

  // ─── order_status_history ─────────────────────────────────────

  async insertStatusHistory(data: Record<string, unknown>) {
    return this.db.from('order_status_history').insert(data);
  }

  // ─── zen_master_orders ────────────────────────────────────────

  async insertMasterOrder(data: Record<string, unknown>) {
    return this.db
      .from('zen_master_orders')
      .insert(data)
      .select('id, master_no, status, total_house_count, total_gross_weight, total_volume, carrier_id, vessel_flight_no, origin_port_id, dest_port_id, remarks, created_by')
      .single();
  }

  async bindHouseOrders(masterId: string, houseOrderIds: string[], status: OrderStatus) {
    return this.db
      .from('zen_orders')
      .update({ master_order_id: masterId, status })
      .in('id', houseOrderIds);
  }

  async unbindHouseOrders(masterId: string, restoreStatus: OrderStatus) {
    return this.db
      .from('zen_orders')
      .update({ master_order_id: null, status: restoreStatus })
      .eq('master_order_id', masterId);
  }

  async deleteMasterOrder(masterId: string) {
    return this.db.from('zen_master_orders').delete().eq('id', masterId);
  }

  async findMasterById(masterId: string) {
    return this.db
      .from('zen_master_orders')
      .select(`
        *,
        origin_port:zen_ports!origin_port_id(code, name),
        dest_port:zen_ports!dest_port_id(code, name),
        carrier:zen_organizations!carrier_id(name, iata_code)
      `)
      .eq('id', masterId)
      .single();
  }

  async findMastersList(page = 1, pageSize = 50) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    return this.db
      .from('zen_master_orders')
      .select(`
        *,
        origin_port:zen_ports!origin_port_id(code, name),
        dest_port:zen_ports!dest_port_id(code, name),
        carrier:zen_organizations!carrier_id(name, iata_code)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
  }

  async findHousesByMasterId(masterId: string, page = 1, pageSize = 50) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    return this.db
      .from('zen_orders')
      .select(`
        *,
        shipper:zen_organizations!shipper_id(name),
        origin_port:zen_ports!origin_port_id(code, name),
        dest_port:zen_ports!dest_port_id(code, name)
      `, { count: 'exact' })
      .eq('master_order_id', masterId)
      .range(from, to);
  }

  async findPendingHouseOrders(page = 1, pageSize = 50) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    return this.db
      .from('zen_orders')
      .select(`
        *,
        shipper:zen_organizations!shipper_id(name),
        origin_port:zen_ports!origin_port_id(code, name),
        dest_port:zen_ports!dest_port_id(code, name)
      `, { count: 'exact' })
      .eq('status', OrderStatus.PACKED)
      .is('master_order_id', null)
      .order('created_at', { ascending: true })
      .range(from, to);
  }

  async updateMasterStatus(masterId: string, nextStatus: string, reason?: string) {
    return this.db
      .from('zen_master_orders')
      .update({
        status: nextStatus,
        remarks: reason ? `[Status Change: ${nextStatus}] ${reason}` : undefined,
      })
      .eq('id', masterId);
  }

  // ─── RPC helpers ──────────────────────────────────────────────

  async getOrdersAggregation(orderIds: string[]) {
    return this.db.rpc('get_orders_aggregation', { order_ids: orderIds });
  }
}
