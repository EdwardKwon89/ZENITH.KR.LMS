'use server';

import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import { orderRegistrationSchema, orderPackageSchema, orderItemSchema } from '@/lib/validation/order';
import type { OrderRegistrationInput, OrderPackageInput } from '@/lib/validation/order';
import { createOrder } from './orders';

export interface BulkOrderResult {
  orderSeq: string | number;
  success: boolean;
  orderId?: string;
  orderNo?: string;
  error?: string;
}

interface BulkOrderSheets {
  orders: Record<string, unknown>[];
  packages: Record<string, unknown>[];
  items: Record<string, unknown>[];
}

function toNum(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function toStr(val: unknown): string {
  if (typeof val === 'string') return val.trim();
  if (val == null) return '';
  return String(val).trim();
}

function resolvePICKUPFields(orderRow: Record<string, unknown>): Partial<OrderRegistrationInput> {
  if (toStr(orderRow.delivery_method) !== 'PICKUP') return {};
  return {
    delivery_method: 'PICKUP',
    pickup_location: toStr(orderRow.pickup_location) || undefined,
    pickup_contact_name: toStr(orderRow.pickup_contact_name) || undefined,
    pickup_contact_tel: toStr(orderRow.pickup_contact_tel) || undefined,
    pickup_country_code: toStr(orderRow.pickup_country_code) || undefined,
    pickup_state_province: toStr(orderRow.pickup_state_province) || undefined,
    pickup_city: toStr(orderRow.pickup_city) || undefined,
    pickup_address: toStr(orderRow.pickup_address) || undefined,
    pickup_address_detail: toStr(orderRow.pickup_address_detail) || undefined,
    pickup_zipcode: toStr(orderRow.pickup_zipcode) || undefined,
  };
}

function mapExcelRowToPackageInput(pkgRow: Record<string, unknown>, itemRows: Record<string, unknown>[]): OrderPackageInput {
  const items = itemRows.map((it) => orderItemSchema.parse({
    sku_code: toStr(it.sku_code) || undefined,
    item_name: toStr(it.item_name),
    quantity: toNum(it.quantity) || 1,
    unit_price: toNum(it.unit_price),
    currency: toStr(it.currency) || 'USD',
    hs_code: toStr(it.hs_code) || undefined,
    item_packing_unit: toStr(it.item_packing_unit) || 'EA',
  }));

  return orderPackageSchema.parse({
    packing_unit: toStr(pkgRow.packing_unit),
    packing_count: toNum(pkgRow.packing_count) || 1,
    physical_box_count: toNum(pkgRow.physical_box_count) || 1,
    length: toNum(pkgRow.length) || undefined,
    width: toNum(pkgRow.width) || undefined,
    height: toNum(pkgRow.height) || undefined,
    gross_weight: toNum(pkgRow.gross_weight),
    special_cargo_type: toStr(pkgRow.special_cargo_type) || 'NONE',
    content_type: toStr(pkgRow.content_type) || 'GENERAL',
    domestic_ref_no: toStr(pkgRow.domestic_ref_no) || undefined,
    items,
  });
}

function mapExcelRowToOrderInput(
  orderRow: Record<string, unknown>,
  packages: OrderPackageInput[],
  profile: { id: string; org_id?: string; role: string },
  agencyShipperIds: Set<string> | null
): OrderRegistrationInput {
  const isShipperRole = [USER_ROLES.SHIPPER, USER_ROLES.AGENCY_SHIPPER, USER_ROLES.CORPORATE, USER_ROLES.INDIVIDUAL].includes(profile.role as any);

  let shipperId: string;
  if (isShipperRole) {
    shipperId = profile.org_id as string;
  } else {
    shipperId = toStr(orderRow.shipper_id) || profile.org_id as string;
    if (profile.role === USER_ROLES.AGENCY && !agencyShipperIds?.has(shipperId)) {
      throw new Error('소속 화주가 아닙니다.');
    }
  }

  const orderType = toStr(orderRow.order_type) || 'B2B';
  const transportMode = toStr(orderRow.transport_mode) || 'AIR';

  const upsFields: Partial<OrderRegistrationInput> = transportMode === 'UPS' ? {
    ups_product_code: toStr(orderRow.ups_product_code) || undefined,
    incoterms: toStr(orderRow.incoterms) as any || undefined,
    ups_service_family: toStr(orderRow.ups_service_family) as any || undefined,
  } : {};

  return orderRegistrationSchema.parse({
    order_type: orderType as any,
    shipper_id: shipperId,
    transport_mode: transportMode as any,
    recipient_name: toStr(orderRow.recipient_name),
    recipient_address: toStr(orderRow.recipient_address),
    recipient_phone: toStr(orderRow.recipient_phone),
    shipper_contact_phone: toStr(orderRow.shipper_contact_phone) || undefined,
    recipient_address_local: toStr(orderRow.recipient_address_local) || undefined,
    recipient_address_detail: toStr(orderRow.recipient_address_detail) || undefined,
    recipient_zipcode: toStr(orderRow.recipient_zipcode) || undefined,
    recipient_country_code: toStr(orderRow.recipient_country_code) || undefined,
    recipient_state_province: toStr(orderRow.recipient_state_province) || undefined,
    recipient_city: toStr(orderRow.recipient_city) || undefined,
    recipient_pccc: toStr(orderRow.recipient_pccc) || undefined,
    recipient_email: toStr(orderRow.recipient_email) || undefined,
    description: toStr(orderRow.description) || undefined,
    delivery_notes: toStr(orderRow.delivery_notes) || undefined,
    ...upsFields,
    ...resolvePICKUPFields(orderRow),
    packages,
  });
}

function validateSheets(sheets: BulkOrderSheets): string[] {
  const errors: string[] = [];
  const orderSeqs = new Set(sheets.orders.map((r) => r.order_seq));
  const packageSeqs = new Set(sheets.packages.map((r) => r.package_seq));

  for (const pkg of sheets.packages) {
    if (!orderSeqs.has(pkg.order_seq)) {
      errors.push(`패키지 시트: order_seq=${pkg.order_seq}(이)가 오더 시트에 존재하지 않습니다.`);
    }
  }
  for (const item of sheets.items) {
    if (!packageSeqs.has(item.package_seq)) {
      errors.push(`아이템 시트: package_seq=${item.package_seq}(이)가 패키지 시트에 존재하지 않습니다.`);
    }
  }
  return errors;
}

export async function bulkCreateOrders(sheets: BulkOrderSheets): Promise<{ results: BulkOrderResult[] }> {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');

  if (sheets.orders.length > 200) {
    throw new Error('한 번에 최대 200건까지 등록할 수 있습니다.');
  }

  const refErrors = validateSheets(sheets);
  if (refErrors.length > 0) {
    return { results: refErrors.map((err) => ({ orderSeq: '(참조무결성)', success: false, error: err })) };
  }

  let agencyShipperIds: Set<string> | null = null;
  if (profile.role === USER_ROLES.AGENCY) {
    const { data: agencyShippers } = await supabase
      .from('zen_agency_shippers')
      .select('shipper_org_id')
      .eq('agency_org_id', profile.org_id as string)
      .eq('is_active', true);
    agencyShipperIds = new Set((agencyShippers ?? []).map((s: any) => s.shipper_org_id));
  }

  const results: BulkOrderResult[] = [];
  for (const orderRow of sheets.orders) {
    const orderSeq = orderRow.order_seq as string | number;
    try {
      const packageRows = sheets.packages.filter((p) => p.order_seq === orderSeq);
      if (packageRows.length === 0) {
        throw new Error(`order_seq=${orderSeq}에 연결된 패키지가 없습니다.`);
      }

      const packages = packageRows.map((pkgRow) => {
        const packageSeq = pkgRow.package_seq;
        const itemRows = sheets.items.filter((it) => it.package_seq === packageSeq);
        if (itemRows.length === 0) {
          throw new Error(`package_seq=${packageSeq}에 연결된 아이템이 없습니다.`);
        }
        return mapExcelRowToPackageInput(pkgRow, itemRows);
      });

      const payload = mapExcelRowToOrderInput(orderRow, packages, profile, agencyShipperIds);

      const order = await createOrder(payload);
      results.push({
        orderSeq,
        success: true,
        orderId: (order as any)?.id,
        orderNo: (order as any)?.order_no,
      });
    } catch (err: any) {
      results.push({ orderSeq, success: false, error: err.message ?? String(err) });
    }
  }

  return { results };
}
