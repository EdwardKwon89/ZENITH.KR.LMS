import { z } from 'zod';

/**
 * 오더 상세 항목(Item) 검증 스키마 (패킹 하위)
 */
export const orderItemSchema = z.object({
  sku_code: z.string().optional(), // 재고 연동을 위한 SKU 코드
  item_name: z.string()
    .min(1, 'Item name is required')
    .regex(/^[A-Za-z0-9\s.,\-()&'"/#%+:]*$/, 'Item name must be in English (letters, numbers, and common symbols only)'),
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
  packing_unit: z.string().min(1, 'Packing unit is required'),
  packing_count: z.number().int().positive().default(1),
  physical_box_count: z.number().int().positive().optional().default(1),
  length: z.number().nonnegative().optional(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  gross_weight: z.number().nonnegative('Weight is required'),
  volume: z.number().nonnegative().optional(),
  special_cargo_type: z.enum(['NONE', 'DANGEROUS', 'FROZEN', 'VALUABLE', 'USED']).default('NONE'),
  content_type: z.enum(['GENERAL', 'DOC', 'NONDOC']).default('GENERAL'),
  domestic_ref_no: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item per package is required'),
});

/**
 * 신규 오더 등록(Registration) 검증 스키마
 */
export const orderRegistrationSchema = z.object({
  order_type: z.enum(['B2B', 'B2C_ECOM', 'B2C_EXPRESS']),
  shipper_id: z.string().uuid('Please select a valid shipper'),
  origin_port_id: z.string().uuid('Please select a valid origin port').optional(),
  dest_port_id: z.string().uuid('Please select a valid destination port').optional(),
  
  // 송하인(화주) 담당자/연락처/이메일 (v2 스크린샷 피드백 반영)
  shipper_contact_name: z.string().optional(),
  shipper_contact_phone: z.string().optional(),
  shipper_contact_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  shipper_address: z.string().optional(),
  shipper_country_code: z.string().optional().default('KR'),
  shipper_state_province: z.string().optional(),
  shipper_city: z.string().optional(),
  shipper_address_detail: z.string().optional(),
  shipper_zipcode: z.string().optional(),
  shipper_biz_no: z.string().optional(),
  
  // 수취인 상세 정보 (v2 핵심 추가)
  recipient_name: z.string().min(1, 'Recipient name is required'),
  recipient_address: z.string().min(1, 'Recipient address is required'),
  recipient_address_local: z.string().optional(),
  recipient_address_detail: z.string().optional(),
  recipient_phone: z.string().min(1, 'Recipient phone is required'),
  recipient_zipcode: z.string().optional(),
  recipient_country_code: z.string().optional(),
  recipient_state_province: z.string().optional(),
  recipient_city: z.string().optional(),
  
  recipient_pccc: z.string().optional(),
  recipient_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  description: z.string().optional(),
  delivery_notes: z.string().optional(),
  
  // 운송 수단 (v2.1)
  transport_mode: z.enum(['AIR', 'SEA', 'EXP', 'LAND', 'UPS']).default('AIR'),

  ups_service_family: z.enum(['WW_EXPRESS', 'WW_SAVER', 'WW_EXPEDITED', 'WW_FLIGHT']).optional(),
  
  // 물류 요약 정보 (v2.2)
  estimated_cost: z.number().optional(),
  
  // 계층형 패킹 데이터 (special_cargo_type은 PKG 레벨로 이전 — DEF-059)
  packages: z.array(orderPackageSchema).min(1, 'At least one package is required'),

  // 직접배송/픽업 정보 (IMP-118)
  delivery_method: z.enum(['DIRECT', 'PICKUP']).default('DIRECT'),
  pickup_location: z.string().optional(),
  pickup_contact_name: z.string().optional(),
  pickup_contact_tel: z.string().optional(),

  // UPS 특송 정보 (TASK-B-059)
  ups_product_code: z.string().optional(),
  incoterms: z.enum(['DDU', 'DDP']).optional(),
}).superRefine((data, ctx) => {
  if (data.transport_mode !== 'UPS') {
    if (!data.origin_port_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a valid origin port',
        path: ['origin_port_id'],
      });
    }
    if (!data.dest_port_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a valid destination port',
        path: ['dest_port_id'],
      });
    }
  }
  if (data.delivery_method === 'PICKUP') {
    if (!data.pickup_location || data.pickup_location.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pickup location is required when delivery method is PICKUP',
        path: ['pickup_location'],
      });
    }
    if (!data.pickup_contact_name || data.pickup_contact_name.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pickup contact name is required when delivery method is PICKUP',
        path: ['pickup_contact_name'],
      });
    }
    if (!data.pickup_contact_tel || data.pickup_contact_tel.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pickup contact phone is required when delivery method is PICKUP',
        path: ['pickup_contact_tel'],
      });
    }
  }
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type OrderPackageInput = z.infer<typeof orderPackageSchema>;
export type OrderRegistrationInput = z.infer<typeof orderRegistrationSchema>;
