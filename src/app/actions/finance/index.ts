'use server';

import { revalidatePath } from 'next/cache';
import { validateUserAction } from '@/lib/auth/guards';

export {
  generateInvoicesForOrder,
  updatePaymentStatus,
  calculateSettlementAction,
  getSettlementOverview,
  getWeeklyRevenueChart,
  getRevenueReport,
  getCostReport,
} from './settlement';

export {
  generateInvoiceAction,
  issueInvoicePdf,
  getInvoicePdfHistory,
  issueTaxInvoice,
  sendTaxInvoiceEmail,
  getTaxInvoiceHistory,
} from './invoice';

export {
  getTransportCosts,
  upsertTransportCost,
  deleteTransportCost,
} from './fees';

export async function getOrganizations() {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from('zen_organizations')
    .select('id, name')
    .order('name');

  if (error) throw new Error(`조직 조회 실패: ${error.message}`);
  return data || [];
}

export async function getOrderDocumentData(orderNo: string) {
  const { supabase } = await validateUserAction();

  const { data: order, error: orderError } = await supabase
    .from('zen_orders')
    .select(`
      *,
      shipper:zen_organizations!shipper_id(*),
      origin_port:zen_ports!origin_port_id(*),
      dest_port:zen_ports!dest_port_id(*)
    `)
    .eq('order_no', orderNo)
    .maybeSingle();

  if (orderError) throw new Error(`오더 조회 중 오류 발생: ${orderError.message}`);
  if (!order) throw new Error(`해당 번호(${orderNo})의 오더를 찾을 수 없습니다.`);

  const { data: packages, error: pkgError } = await supabase
    .from('zen_order_packages')
    .select('id, order_id, packing_unit, packing_count, gross_weight, volume, length, width, height, remarks, created_at, updated_at')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (pkgError) throw new Error(`패킹 정보 조회 실패: ${pkgError.message}`);

  const { data: items, error: itemsError } = await supabase
    .from('zen_order_items')
    .select('id, order_id, package_id, item_name, quantity, unit_price, currency, hs_code, sku_code, weight, volume, item_packing_unit, created_at, updated_at')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (itemsError) throw new Error(`아이템 정보 조회 실패: ${itemsError.message}`);

  const packagesWithItems = packages.map(pkg => ({
    ...pkg,
    items: items.filter(item => item.package_id === pkg.id)
  }));

  return {
    ...order,
    packages: packagesWithItems
  };
}
