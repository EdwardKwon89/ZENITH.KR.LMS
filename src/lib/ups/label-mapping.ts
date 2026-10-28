// Pure mapping functions — no server-only imports. Safe for client components and tests.
import { Country, State } from 'country-state-city';
import { stripNonDigits } from '@/lib/validation/shxk-limits';
import { isShxkDeclareUnit } from '@/lib/shxk/declare-units';

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

// TASK-B-337 (Issue #1251 v2): 변환 없이 SHXK 정본 목록의 코드를 그대로 전송한다.
// 빈 값·목록에 없는 값만 PCE로 폴백한다. (이전 EA→PCE·PCS→PCE 매핑은 폐기)
export function resolveShxkUnitCode(packingUnit: string): string {
  const upper = (packingUnit || '').toUpperCase();
  return isShxkDeclareUnit(upper) ? upper : 'PCE';
}

// TASK-B-325 (DEF-B-145) → TASK-B-326 (DEF-B-146): UPS AddressLine 거부 방지용 주소 축약
// 국제 영문 주소 표기 관례상 상세주소는 도로명 주소 앞에 온다(JSJung 확정).
// TASK-B-326: 시/구/도는 shipper_city/shipper_province 별도 필드로 이미 전달되므로,
// street에는 도로명+상세주소만 남긴다. DB 관례(도로명, 구, 시, 도[, 국가] 순서)에 따라
// 첫 번째 콤마 세그먼트 = 도로명 (2026-09-13 로컬 DB 16건 전수 검증, 예외 없음).
function sanitizeComma(value: string): string {
  if (!value) return '';
  return value.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveRoadAddress(address: string): string {
  return (address || '').split(',')[0]?.trim() || '';
}

export function resolveShipperStreet(
  order: Record<string, unknown>,
  shipperOrg: Record<string, unknown> | undefined,
): string {
  // DEF-B-059: order-level english 값을 우선으로 사용 (Daum 우편번호에서 자동 채움)
  // 우선순위: order.shipper_address_english > shipperOrg.address_english > shipperOrg.address > order.shipper_address
  const shipperAddr = (order.shipper_address_english as string) || (shipperOrg?.address_english as string) || (shipperOrg?.address as string) || (order.shipper_address as string) || '';
  const shipperAddrDetail = (order.shipper_address_detail_english as string) || (shipperOrg?.address_detail_english as string) || (shipperOrg?.address_detail as string) || (order.shipper_address_detail as string) || '';
  // TASK-B-326: 도로명만 사용 (첫 콤마 세그먼트) — 국가·시·구·도 자동 제거, 상세주소는 맨 앞
  const road = resolveRoadAddress(shipperAddr);
  return [shipperAddrDetail, road].filter(Boolean).join(', ');
}

// TASK-B-305 (Issue #1133): 수하인 주소 영문 우선 표출 유틸
// 우선순위: recipient_address_detail (영문 전용) > recipient_address_local > recipient_address
// TASK-B-325/326: 상세주소를 맨 앞으로 + 도로명만 사용 (국가·시·구·도 자동 제거)
export function resolveConsigneeStreet(
  order: Record<string, unknown>,
): string {
  const consigneeAddr = (order.recipient_address as string) || '';
  const localAddr = (order.recipient_address_local as string) || '';
  const detailAddr = (order.recipient_address_detail as string) || '';
  const road = resolveRoadAddress(consigneeAddr);

  // 영문 상세주소가 있으면 사용, 없으면 한글 원본 + 현지어 표기
  if (detailAddr) {
    return [detailAddr, road].filter(Boolean).join(', ');
  }
  return localAddr ? `${road} (${localAddr})` : road;
}

// TASK-B-341 (Issue #1261) → TASK-B-342 (Issue #1263): SHXK createorder의 shipper 블록.
// shipper_name    = 화면 "화주명"(zen_orders.shipper_name). 폴백: order.shipper_name → shipper_org.name → shipperDefaults.name
// shipper_company = 회사 기본값 고정 (shipperDefaults.name = 환경변수 SHXK_SHIPPER_NAME)
//   (JSJung 2026-10-22 결정 — TASK-B-341의 "두 필드 모두 화주명" 결정을 번복)
// 담당자명(order.shipper_contact_name)은 SHXK payload 어디에도 전송하지 않는다.
function buildShipperPayload(
  order: Record<string, unknown>,
  shipperDefaults: { name: string; country: string },
): Record<string, unknown> {
  const shipperOrg = order.shipper_org as Record<string, unknown> | undefined;
  const shipperDisplayName =
    (order.shipper_name as string)
    || (shipperOrg?.name as string)
    || shipperDefaults.name;

  return {
    shipper_name: shipperDisplayName,
    shipper_company: shipperDefaults.name,
    shipper_countrycode: (order.shipper_country_code as string) || shipperDefaults.country,
    shipper_province: sanitizeComma((order.shipper_state_province as string) || ''),
    shipper_city: sanitizeComma((order.shipper_city as string) || ''),
    shipper_street: sanitizeComma(resolveShipperStreet(order, shipperOrg)),
    shipper_postcode: (order.shipper_zipcode as string) || '',
    shipper_telephone: stripNonDigits((order.shipper_contact_phone as string) || ''),
  };
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

  const consigneeStreet = (order.recipient_address as string) || '';
  const localAddr = (order.recipient_address_local as string) || '';
  // TASK-B-326: 수하인 street도 도로명만 사용 (시/구/도·국가 제거 — AddressLine 초과 방지)
  // TASK-B-343: 전송 시점에만 쉼표 치환 (표시/무역서류는 기존 출력 유지)
  const cleanConsigneeStreet = sanitizeComma(resolveRoadAddress(consigneeStreet));
  const fullConsigneeStreet = sanitizeComma(localAddr ? `${cleanConsigneeStreet} (${localAddr})` : cleanConsigneeStreet);

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
    shipper: buildShipperPayload(order, shipperDefaults),
    consignee: {
      consignee_name: (order.recipient_name as string) || 'E2E Consignee',
      consignee_countrycode: (order.recipient_country_code as string) || countryCode,
      consignee_province: sanitizeComma((order.recipient_state_province as string) || ''),
      consignee_city: sanitizeComma((order.recipient_city as string) || ''),
      consignee_street: fullConsigneeStreet,
      consignee_postcode: (order.recipient_zipcode as string) || '',
      consignee_telephone: stripNonDigits((order.recipient_phone as string) || ''),
      consignee_email: (order.recipient_email as string) || '',
      consignee_tariff: (order.recipient_pccc as string) || '',
    },
    invoice,
  };
}
