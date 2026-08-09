import * as XLSX from 'xlsx';

export function generateBulkOrderTemplate(): string {
  const orderSheet = XLSX.utils.aoa_to_sheet([
    ['order_seq', 'order_type', 'shipper_id', 'transport_mode', 'ups_product_code', 'incoterms', 'recipient_name', 'recipient_address', 'recipient_phone', 'recipient_address_local', 'recipient_address_detail', 'recipient_zipcode', 'recipient_country_code', 'recipient_state_province', 'recipient_city', 'recipient_pccc', 'recipient_email', 'description', 'delivery_notes', 'delivery_method', 'pickup_location', 'pickup_contact_name', 'pickup_contact_tel', 'pickup_country_code', 'pickup_state_province', 'pickup_city', 'pickup_address', 'pickup_address_detail', 'pickup_zipcode'],
    ['1', 'B2B', '', 'AIR', '', '', 'Recipient Name', '123 Main St', '010-1234-5678'],
  ]);
  const packageSheet = XLSX.utils.aoa_to_sheet([
    ['package_seq', 'order_seq', 'packing_unit', 'gross_weight', 'packing_count', 'physical_box_count', 'length', 'width', 'height', 'special_cargo_type', 'content_type', 'domestic_ref_no'],
    ['1', '1', 'BOX', '10.5', '1', '1', '30', '20', '15', 'NONE', 'GENERAL', ''],
  ]);
  const itemSheet = XLSX.utils.aoa_to_sheet([
    ['item_seq', 'package_seq', 'item_name', 'quantity', 'unit_price', 'currency', 'hs_code', 'item_packing_unit', 'sku_code'],
    ['1', '1', 'Sample Item', '2', '50', 'USD', '', 'EA', ''],
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, orderSheet, '오더(Order)');
  XLSX.utils.book_append_sheet(wb, packageSheet, '패키지(Package)');
  XLSX.utils.book_append_sheet(wb, itemSheet, '아이템(Item)');

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}
