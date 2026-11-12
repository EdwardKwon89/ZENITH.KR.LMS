import { z } from 'zod';
import { normalizePhoneDigits } from './shxk-limits';

/**
 * 주소록(zen_address_book) 항목 검증 스키마
 */
export const addressBookEntrySchema = z.object({
  id: z.string().uuid().optional(),
  display_name: z.string().min(1, 'Display name is required'),
  recipient_name: z.string().min(1, 'Recipient name is required'),
  recipient_address: z.string().min(1, 'Recipient address is required'),
  recipient_address_local: z.string().optional(),
  recipient_address_detail: z.string().optional(),
  // TASK-B-347 (Issue #1279): 서버측에서도 비숫자 제거 + 15자리 상한.
  // 거부가 아니라 정규화: 레거시 하이픈 포함 저장분('010-1111')이 재저장을 막지 않도록.
  recipient_phone: z.string().transform((v) => normalizePhoneDigits(v)).optional(),
  country_code: z.string().optional(),
  state_province: z.string().optional(),
  city: z.string().optional(),
  zipcode: z.string().optional(),
  recipient_pccc: z.string().optional(),
  recipient_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  display_mode: z.enum(['EN', 'BILINGUAL']),
  is_default: z.boolean(),
});

export type AddressBookEntryInput = z.infer<typeof addressBookEntrySchema>;
