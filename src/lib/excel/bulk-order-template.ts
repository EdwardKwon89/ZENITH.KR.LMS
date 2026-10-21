import * as XLSX from 'xlsx';

// TASK-B-335 (Issue #1245, DEF-B-150): 대량 등록은 UPS 전용 — 템플릿도 UPS 검증을 통과하는 샘플이어야 한다.
// 헤더·샘플 값을 상수로 추출해 라운드트립 테스트가 재사용한다(템플릿이 다시 깨지면 테스트가 FAIL).

export const BULK_ORDER_SHEET_NAME = '오더(Order)';
export const BULK_PACKAGE_SHEET_NAME = '패키지(Package)';
export const BULK_ITEM_SHEET_NAME = '아이템(Item)';

export const BULK_ORDER_HEADERS = [
  'order_seq', 'order_type', 'shipper_id', 'shipper_contact_phone', 'transport_mode',
  'ups_product_code', 'incoterms', 'recipient_name', 'recipient_address', 'recipient_phone',
  'recipient_address_local', 'recipient_address_detail', 'recipient_zipcode', 'recipient_country_code',
  'recipient_state_province', 'recipient_city', 'recipient_pccc', 'recipient_email', 'description',
  'delivery_notes', 'delivery_method', 'pickup_location', 'pickup_contact_name', 'pickup_contact_tel',
  'pickup_country_code', 'pickup_state_province', 'pickup_city', 'pickup_address', 'pickup_address_detail',
  'pickup_zipcode',
];

// 실제 검증(orderRegistrationSchema, UPS 분기)을 통과하는 샘플.
// - transport_mode: UPS (공란 시 UPS 기본값이지만 명시)
// - ups_product_code: DB(zen_ups_products)에 실존하는 코드여야 함. 'WWE' 등 미존재 코드는
//   saveOrderRateSnapshot(orders.ts)이 if(!product)return으로 조용히 건너뛰어 운임 스냅샷 없는
//   오더가 생성된다(DEF-B-151). content_type=NONDOC과 일관되게 비서류 코드 사용.
// - shipper_contact_phone / recipient_phone: 숫자만(하이픈 미포함)
// - recipient_country_code/zipcode/city: UPS 필수
export const BULK_ORDER_SAMPLE = [
  '1', 'B2B', '', '0212345678', 'UPS',
  'WW_SAVER_NONDOC', 'DDP', 'John Smith', '123 Main St', '14155551234',
  '', '', '90001', 'US',
  'CA', 'Los Angeles', '', '', '',
  '', '', '', '', '',
  '', '', '', '', '',
  '',
];

export const BULK_PACKAGE_HEADERS = [
  'package_seq', 'order_seq', 'packing_unit', 'gross_weight', 'packing_count', 'physical_box_count',
  'length', 'width', 'height', 'special_cargo_type', 'content_type', 'domestic_ref_no',
];

// UPS는 content_type이 DOC/NONDOC — 샘플은 NONDOC(공란도 NONDOC으로 정규화됨).
export const BULK_PACKAGE_SAMPLE = [
  '1', '1', 'BOX', '10.5', '1', '1',
  '30', '20', '15', 'NONE', 'NONDOC', '',
];

export const BULK_ITEM_HEADERS = [
  'item_seq', 'package_seq', 'item_name', 'quantity', 'unit_price', 'currency', 'hs_code',
  'item_packing_unit', 'sku_code',
];

// UPS는 HS 코드 필수·품명 35자 이내(영문) — 샘플은 실제 HS 코드.
export const BULK_ITEM_SAMPLE = [
  '1', '1', 'Sample Item', '2', '50', 'USD', '8471300000',
  'PCE', '',
];

export function generateBulkOrderTemplate(): string {
  const orderSheet = XLSX.utils.aoa_to_sheet([BULK_ORDER_HEADERS, BULK_ORDER_SAMPLE]);
  const packageSheet = XLSX.utils.aoa_to_sheet([BULK_PACKAGE_HEADERS, BULK_PACKAGE_SAMPLE]);
  const itemSheet = XLSX.utils.aoa_to_sheet([BULK_ITEM_HEADERS, BULK_ITEM_SAMPLE]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, orderSheet, BULK_ORDER_SHEET_NAME);
  XLSX.utils.book_append_sheet(wb, packageSheet, BULK_PACKAGE_SHEET_NAME);
  XLSX.utils.book_append_sheet(wb, itemSheet, BULK_ITEM_SHEET_NAME);

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}
