import { z } from 'zod';

/**
 * 오더 상세 항목(Item) 검증 스키마
 */
export const orderItemSchema = z.object({
  sku_code: z.string().optional(),
  item_name: z.string().min(1, 'Item name is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unit_price: z.number().nonnegative('Unit price cannot be negative').default(0),
  currency: z.string().default('USD'),
  weight: z.number().nonnegative('Weight cannot be negative'),
  volume: z.number().nonnegative('Volume cannot be negative'),
  pccc: z.string().optional(), // 통관부호 (B2C 대응)
});

/**
 * 신규 오더 등록(Registration) 검증 스키마
 */
export const orderRegistrationSchema = z.object({
  order_type: z.enum(['B2B', 'B2C_ECOM', 'B2C_EXPRESS']),
  shipper_id: z.string().uuid('Please select a valid shipper'),
  origin_port_id: z.string().uuid('Please select a valid origin port'),
  dest_port_id: z.string().uuid('Please select a valid destination port'),
  description: z.string().optional(),
  recipient_pccc: z.string().optional(),
  recipient_contact: z.string().optional(),
  recipient_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  delivery_notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type OrderRegistrationInput = z.infer<typeof orderRegistrationSchema>;
