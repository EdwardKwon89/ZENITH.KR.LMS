import { z } from 'zod';

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
  recipient_phone: z.string().optional(),
  country_code: z.string().optional(),
  display_mode: z.enum(['EN', 'BILINGUAL']),
  is_default: z.boolean(),
});

export type AddressBookEntryInput = z.infer<typeof addressBookEntrySchema>;
