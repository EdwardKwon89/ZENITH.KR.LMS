// Pure mapping functions — no server-only imports. Safe for client components and tests.

import { State } from 'country-state-city';

export function determineOrderCargotype(packages: Record<string, unknown>[]): { cargotype: string; mailCargoType: string } {
  if (packages.length === 0) return { cargotype: 'W', mailCargoType: '4' };
  const allDoc = packages.every(p => (p.content_type as string) === 'DOC');
  return allDoc
    ? { cargotype: 'D', mailCargoType: '3' }
    : { cargotype: 'W', mailCargoType: '4' };
}

export function buildCargovolume(packages: Record<string, unknown>[]): Record<string, unknown>[] {
  return packages.map((pkg) => ({
    child_number:       String(pkg.id ?? ''),
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
        ...(item.sku_code ? { sku: item.sku_code } : {}),
        ...(item.hs_code ? { hs_code: item.hs_code } : {}),
      });
    }
  }
  return items.length > 0 ? items : [{ invoice_enname: 'General Merchandise', invoice_quantity: '1', invoice_unitcharge: '1.00' }];
}

export function resolveProvinceEnglishName(stateCode: string, countryCode: string): string {
  if (!stateCode || !countryCode) return stateCode || '';
  const state = State.getStateByCodeAndCountry(stateCode, countryCode);
  return state?.name || stateCode;
}

export function resolveShipperStreet(
  order: Record<string, unknown>,
  shipperOrg: Record<string, unknown> | undefined,
): string {
  const shipperAddr = (shipperOrg?.address_english as string) || (shipperOrg?.address as string) || (order.shipper_address as string) || '';
  const shipperAddrDetail = (shipperOrg?.address_detail_english as string) || (shipperOrg?.address_detail as string) || (order.shipper_address_detail as string) || '';
  return [shipperAddr, shipperAddrDetail].filter(Boolean).join(' ');
}
