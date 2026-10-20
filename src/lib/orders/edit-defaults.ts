// TASK-B-333 (Issue #1240, #1238 항목 4·5): 오더 수정 화면 defaultValues 매핑을 순수 함수로 추출.
// - 화주명·영문주소 저장값 복원 (항목 4)
// - UPS 패키지 CONTENT(DOC/NONDOC) 정규화 (항목 5)
// - TASK-B-332 후속: 레거시 하이픈 전화번호를 폼 초기값에서 숫자만으로 정제
import { stripNonDigits } from '@/lib/validation/shxk-limits';

/**
 * UPS 모드에서만 저장 content_type을 DOC/NONDOC으로 정규화한다.
 * - UPS: 'DOC' → 'DOC', 그 외(GENERAL/null/빈 값/기타) → 'NONDOC'
 * - 비UPS: 기존 값 유지 (null/undefined → 'GENERAL')
 * (UPS CONTENT select 옵션이 DOC/NONDOC 두 개뿐이라 GENERAL이 공백으로 렌더링되는 문제 차단)
 */
export function normalizeUpsContentType(
  value: string | null | undefined,
  transportMode: string | undefined,
): string {
  if (transportMode === 'UPS') {
    return value === 'DOC' ? 'DOC' : 'NONDOC';
  }
  return value ?? 'GENERAL';
}

export interface OrderEditDefaultsInput {
  order_type?: string | null;
  shipper_id?: string | null;
  origin_port_id?: string | null;
  dest_port_id?: string | null;
  description?: string | null;
  shipper_name?: string | null;
  shipper_contact_name?: string | null;
  shipper_contact_phone?: string | null;
  shipper_contact_email?: string | null;
  shipper_address?: string | null;
  shipper_address_english?: string | null;
  shipper_country_code?: string | null;
  shipper_state_province?: string | null;
  shipper_city?: string | null;
  shipper_address_detail?: string | null;
  shipper_address_detail_english?: string | null;
  shipper_zipcode?: string | null;
  shipper_biz_no?: string | null;
  recipient_name?: string | null;
  recipient_address?: string | null;
  recipient_address_local?: string | null;
  recipient_address_detail?: string | null;
  recipient_phone?: string | null;
  recipient_zipcode?: string | null;
  recipient_country_code?: string | null;
  recipient_state_province?: string | null;
  recipient_city?: string | null;
  recipient_pccc?: string | null;
  recipient_email?: string | null;
  delivery_notes?: string | null;
  transport_mode?: string | null;
  estimated_cost?: number | null;
  delivery_method?: string | null;
  pickup_location?: string | null;
  pickup_contact_name?: string | null;
  pickup_contact_tel?: string | null;
  ups_product_code?: string | null;
  incoterms?: string | null;
  ups_service_family?: string | null;
  packages?: Array<Record<string, any>> | null;
  [key: string]: unknown;
}

/**
 * edit/page.tsx가 getOrderDetails() 결과로 구성하던 defaultValues 객체를 그대로 옮기되,
 * 누락되었던 shipper_name / shipper_address_english / shipper_address_detail_english를 추가하고,
 * 전화번호를 숫자만으로 정제하며, UPS 패키지 content_type을 정규화한다.
 */
export function buildOrderEditDefaults(order: OrderEditDefaultsInput): Record<string, unknown> {
  const transportMode = order?.transport_mode ?? undefined;

  return {
    order_type: order.order_type,
    shipper_id: order.shipper_id,
    origin_port_id: order.origin_port_id,
    dest_port_id: order.dest_port_id,
    description: order.description ?? '',
    shipper_name: order.shipper_name ?? '',
    shipper_contact_name: order.shipper_contact_name ?? '',
    shipper_contact_phone: stripNonDigits(order.shipper_contact_phone ?? ''),
    shipper_contact_email: order.shipper_contact_email ?? '',
    shipper_address: order.shipper_address ?? '',
    shipper_address_english: order.shipper_address_english ?? '',
    shipper_country_code: order.shipper_country_code || 'KR',
    shipper_state_province: order.shipper_state_province ?? '',
    shipper_city: order.shipper_city ?? '',
    shipper_address_detail: order.shipper_address_detail ?? '',
    shipper_address_detail_english: order.shipper_address_detail_english ?? '',
    shipper_zipcode: order.shipper_zipcode ?? '',
    shipper_biz_no: order.shipper_biz_no ?? '',
    recipient_name: order.recipient_name ?? '',
    recipient_address: order.recipient_address ?? '',
    recipient_address_local: order.recipient_address_local ?? '',
    recipient_address_detail: order.recipient_address_detail ?? '',
    recipient_phone: stripNonDigits(order.recipient_phone ?? ''),
    recipient_zipcode: order.recipient_zipcode ?? '',
    recipient_country_code: order.recipient_country_code ?? '',
    recipient_state_province: order.recipient_state_province ?? '',
    recipient_city: order.recipient_city ?? '',
    recipient_pccc: order.recipient_pccc ?? '',
    recipient_email: order.recipient_email ?? '',
    delivery_notes: order.delivery_notes ?? '',
    transport_mode: order.transport_mode,
    estimated_cost: order.estimated_cost ?? 0,
    delivery_method: order.delivery_method ?? 'DIRECT',
    pickup_location: order.pickup_location ?? '',
    pickup_contact_name: order.pickup_contact_name ?? '',
    pickup_contact_tel: order.pickup_contact_tel ?? '',
    ups_product_code: order.ups_product_code ?? '',
    incoterms: order.incoterms ?? 'DDP',
    ups_service_family: order.ups_service_family ?? undefined,
    packages: ((order.packages ?? []) as any[]).map((pkg) => ({
      id: pkg.id,
      measured_at: pkg.measured_at ?? null,
      packing_unit: pkg.packing_unit,
      packing_count: pkg.packing_count,
      physical_box_count: pkg.physical_box_count ?? 1,
      length: pkg.length ?? 0,
      width: pkg.width ?? 0,
      height: pkg.height ?? 0,
      gross_weight: pkg.gross_weight ?? 0,
      volume: pkg.volume ?? undefined,
      special_cargo_type: pkg.special_cargo_type ?? 'NONE',
      content_type: normalizeUpsContentType(pkg.content_type, order.transport_mode ?? undefined),
      domestic_ref_no: pkg.domestic_ref_no ?? '',
      items: ((pkg.items ?? []) as any[]).map((item) => ({
        item_name: item.item_name ?? '',
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? 0,
        currency: item.currency ?? 'USD',
        hs_code: item.hs_code ?? '',
        item_packing_unit: item.item_packing_unit ?? 'EA',
      })),
    })),
  };
}

export interface ShipperSavedAddress {
  country_code?: string | null;
  state_province?: string | null;
  city?: string | null;
  address?: string | null;
  address_detail?: string | null;
  zipcode?: string | null;
  address_english?: string | null;
  address_detail_english?: string | null;
}

export interface ShipperAffiliationAddress {
  orgCountryCode?: string | null;
  orgStateProvince?: string | null;
  orgCity?: string | null;
  orgAddressStreet?: string | null;
  orgAddress?: string | null;
  orgAddressDetail?: string | null;
  orgZipcode?: string | null;
}

export interface ResolveShipperAddressInput {
  isEdit: boolean;
  touched: boolean;
  mode: 'auto' | 'manual';
  saved?: ShipperSavedAddress | null;
  affiliation?: ShipperAffiliationAddress | null;
}

/**
 * 화주 AddressInput의 defaultValues 결정.
 * - 수정 모드에서 토글을 한 번도 누르지 않았으면(isEdit && !touched) 저장된 주소값을 사용 (항목 4 핵심)
 * - 그 외: 기존 로직(manual → 빈 값, auto → affiliation 파생값)
 */
export function resolveShipperAddressDefaults({
  isEdit,
  touched,
  mode,
  saved,
  affiliation,
}: ResolveShipperAddressInput): ShipperSavedAddress {
  if (isEdit && !touched) {
    return {
      country_code: saved?.country_code || 'KR',
      state_province: saved?.state_province ?? '',
      city: saved?.city ?? '',
      address: saved?.address ?? '',
      address_detail: saved?.address_detail ?? '',
      zipcode: saved?.zipcode ?? '',
      address_english: saved?.address_english ?? '',
      address_detail_english: saved?.address_detail_english ?? '',
    };
  }

  if (mode === 'manual') {
    return { country_code: '', state_province: '', city: '', address: '', address_detail: '', zipcode: '' };
  }

  return {
    country_code: affiliation?.orgCountryCode ?? 'KR',
    state_province: affiliation?.orgStateProvince ?? '',
    city: affiliation?.orgCity ?? '',
    address: affiliation?.orgAddressStreet ?? affiliation?.orgAddress ?? '',
    address_detail: affiliation?.orgAddressDetail ?? '',
    zipcode: affiliation?.orgZipcode ?? '',
  };
}
