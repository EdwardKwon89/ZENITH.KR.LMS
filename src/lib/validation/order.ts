import { z } from 'zod';

/**
 * 오더 상세 항목(Item) 검증 스키마 (패킹 하위)
 */
export const orderItemSchema = z.object({
  sku_code: z.string().optional(), // 재고 연동을 위한 SKU 코드
  item_name: z.string().min(1, 'Item name is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unit_price: z.number().nonnegative('Unit price cannot be negative').default(0),
  currency: z.string().default('USD'),
  hs_code: z.string().optional(), // B2C 선택, B2B 권장
  item_packing_unit: z.string().default('EA'), // 아이템 소단위 (EA, SET 등)
});

/**
 * 오더 패킹 단위(Package) 검증 스키마
 */
export const orderPackageSchema = z.object({
  id: z.string().uuid().optional(),
  packing_unit: z.string().min(1, 'Packing unit is required'), // BOX, PLT 등
  packing_count: z.number().int().positive().default(1),
  length: z.number().nonnegative().optional(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  gross_weight: z.number().nonnegative('Weight is required'),
  volume: z.number().nonnegative().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item per package is required'),
});

/**
 * 신규 오더 등록(Registration) 검증 스키마
 */
export const orderRegistrationSchema = z.object({
  order_type: z.enum(['B2B', 'B2C_ECOM', 'B2C_EXPRESS']),
  shipper_id: z.string().uuid('Please select a valid shipper'),
  origin_port_id: z.string().uuid('Please select a valid origin port'),
  dest_port_id: z.string().uuid('Please select a valid destination port'),
  
  // 송하인(화주) 담당자/연락처/이메일 (v2 스크린샷 피드백 반영)
  shipper_contact_name: z.string().optional(),
  shipper_contact_phone: z.string().optional(),
  shipper_contact_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  
  // 수취인 상세 정보 (v2 핵심 추가)
  recipient_name: z.string().min(1, 'Recipient name is required'),
  recipient_address: z.string().min(1, 'Recipient address is required'),
  recipient_phone: z.string().min(1, 'Recipient phone is required'),
  recipient_zipcode: z.string().optional(),
  
  recipient_pccc: z.string().optional(),
  recipient_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  description: z.string().optional(),
  delivery_notes: z.string().optional(),
  
  // 운송 수단 (v2.1)
  transport_mode: z.enum(['AIR', 'SEA', 'EXP', 'LAND']).default('AIR'),
  
  // 물류 요약 정보 (v2.2)
  estimated_cost: z.number().optional(),
  
  // 특수화물 기재 (IMP-076)
  special_cargo_type: z.enum(['NONE', 'DANGEROUS', 'FROZEN', 'VALUABLE', 'USED']).default('NONE'),
  
  // 계층형 패킹 데이터
  packages: z.array(orderPackageSchema).min(1, 'At least one package is required'),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type OrderPackageInput = z.infer<typeof orderPackageSchema>;
export type OrderRegistrationInput = z.infer<typeof orderRegistrationSchema>;
