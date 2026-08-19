// Pure mapping functions — no server-only imports. Safe for client components and tests.
import { Country, State } from 'country-state-city';

// TASK-B-307 (Issue #1137): state/country 원시코드→이름 변환 유틸
export function resolveRegionName(stateCode: string, countryCode: string): string {
  if (!stateCode || !countryCode) return '';
  const state = State.getStateByCodeAndCountry(stateCode, countryCode);
  return state?.name || stateCode;
}

export function resolveCountryName(countryCode: string): string {
  if (!countryCode) return '';
  const country = Country.getCountryByCode(countryCode);
  return country?.name || countryCode;
}

export function determineOrderCargotype(packages: Record<string, unknown>[]): { cargotype: string; mailCargoType: string } {
  if (packages.length === 0) return { cargotype: 'W', mailCargoType: '4' };
  const allDoc = packages.every(p => (p.content_type as string) === 'DOC');
  return allDoc
    ? { cargotype: 'D', mailCargoType: '3' }
    : { cargotype: 'W', mailCargoType: '4' };
}

export function buildCargovolume(packages: Record<string, unknown>[]): Record<string, unknown>[] {
  return packages.map((pkg) => ({
    child_number:       String(pkg.id ?? '').replace(/-/g, ''),
    involume_length:    Number(pkg.length ?? 0),
    involume_width:     Number(pkg.width ?? 0),
    involume_height:    Number(pkg.height ?? 0),
    involume_grossweight: Number(pkg.gross_weight ?? 0),
  }));
}

export function buildInvoiceFromItems(packages: Record<string, unknown>[]): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = [];
  for (const pkg of packages) {
    const pkgItems = (pkg.items as any[]) || [];
    for (const item of pkgItems) {
      items.push({
        invoice_enname:    item.item_name || 'General Merchandise',
        invoice_quantity:  String(item.quantity ?? 1),
        invoice_unitcharge: String(item.unit_price ?? '1.00'),
        unit_code:         resolveShxkUnitCode(item.item_packing_unit as string),
        ...(item.sku_code ? { sku: item.sku_code } : {}),
        ...(item.hs_code ? { hs_code: item.hs_code } : {}),
      });
    }
  }
  return items.length > 0 ? items : [{ invoice_enname: 'General Merchandise', invoice_quantity: '1', invoice_unitcharge: '1.00', unit_code: 'PCE' }];
}

const SHXK_UNIT_CODE_MAP: Record<string, string> = {
  EA: 'PCE',
  PCS: 'PCE',
  SET: 'SET',
  MTR: 'MTR',
};

export function resolveShxkUnitCode(packingUnit: string): string {
  return SHXK_UNIT_CODE_MAP[(packingUnit || '').toUpperCase()] || 'PCE';
}

export function resolveShipperStreet(
  order: Record<string, unknown>,
  shipperOrg: Record<string, unknown> | undefined,
): string {
  // DEF-B-059: order-level english 값을 우선으로 사용 (Daum 우편번호에서 자동 채움)
  // 우선순위: order.shipper_address_english > shipperOrg.address_english > shipperOrg.address > order.shipper_address
  const shipperAddr = (order.shipper_address_english as string) || (shipperOrg?.address_english as string) || (shipperOrg?.address as string) || (order.shipper_address as string) || '';
  const shipperAddrDetail = (order.shipper_address_detail_english as string) || (shipperOrg?.address_detail_english as string) || (shipperOrg?.address_detail as string) || (order.shipper_address_detail as string) || '';
  return [shipperAddr, shipperAddrDetail].filter(Boolean).join(' ');
}

// TASK-B-305 (Issue #1133): 수하인 주소 영문 우선 표출 유틸
// 우선순위: recipient_address_detail (영문 전용) > recipient_address_local > recipient_address
export function resolveConsigneeStreet(
  order: Record<string, unknown>,
): string {
  const consigneeAddr = (order.recipient_address as string) || '';
  const localAddr = (order.recipient_address_local as string) || '';
  const detailAddr = (order.recipient_address_detail as string) || '';
  
  // 영문 상세주소가 있으면 사용, 없으면 한글 원본 + 현지어 표기
  if (detailAddr) {
    return [consigneeAddr, detailAddr].filter(Boolean).join(' ');
  }
  return localAddr ? `${consigneeAddr} (${localAddr})` : consigneeAddr;
}

export function buildCreateOrderPayload(
  shxkCode: string,
  order: Record<string, unknown>,
  countryCode: string,
  packages: Record<string, unknown>[],
  shipperDefaults: { name: string; country: string },
): Record<string, unknown> {
  const { cargotype, mailCargoType } = determineOrderCargotype(packages);
  const cargovolume = buildCargovolume(packages);
  const invoice = buildInvoiceFromItems(packages);
  const totalPieces = packages.reduce((sum, p) => sum + Number(p.physical_box_count ?? p.packing_count ?? 1), 0);
  const totalWeight = packages.reduce((sum, p) => sum + Number(p.gross_weight ?? 0), 0);

  const shipperStreet = resolveShipperStreet(order, order.shipper_org as Record<string, unknown> | undefined);
  const consigneeStreet = (order.recipient_address as string) || '';
  const localAddr = (order.recipient_address_local as string) || '';
  const fullConsigneeStreet = localAddr ? `${consigneeStreet} (${localAddr})` : consigneeStreet;

  return {
    reference_no: (order.order_no as string).replace(/-/g, ''),
    shipping_method: shxkCode,
    platform_id: '',
    buyer_id: '',
    order_status: 'P',
    order_weight: totalWeight,
    order_pieces: totalPieces,
    cargotype,
    mail_cargo_type: mailCargoType,
    cargovolume,
    shipper: {
      shipper_name: (order.shipper_contact_name as string) || shipperDefaults.name,
      shipper_company: (order.shipper_org as Record<string, unknown> | undefined)?.name as string || shipperDefaults.name,
      shipper_countrycode: (order.shipper_country_code as string) || shipperDefaults.country,
      shipper_province: (order.shipper_state_province as string) || '',
      shipper_city: (order.shipper_city as string) || '',
      shipper_street: shipperStreet,
      shipper_postcode: (order.shipper_zipcode as string) || '',
      shipper_telephone: (order.shipper_contact_phone as string) || '',
    },
    consignee: {
      consignee_name: (order.recipient_name as string) || 'E2E Consignee',
      consignee_countrycode: (order.recipient_country_code as string) || countryCode,
      consignee_province: (order.recipient_state_province as string) || '',
      consignee_city: (order.recipient_city as string) || '',
      consignee_street: fullConsigneeStreet,
      consignee_postcode: (order.recipient_zipcode as string) || '',
      consignee_telephone: (order.recipient_phone as string) || '',
      consignee_email: (order.recipient_email as string) || '',
      consignee_tariff: (order.recipient_pccc as string) || '',
    },
    invoice,
  };
}
