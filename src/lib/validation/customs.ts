import { z } from 'zod';

/**
 * 통관 신고 생성 스키마
 */
export const customsDeclarationSchema = z.object({
  cargoDescription: z.string().min(2, '물품 내용을 상세히 입력해주세요.'),
  declaredValue: z.number().min(0, '신고 가액은 0 이상이어야 합니다.'),
  currencyCode: z.string().length(3, '통화 코드는 3자리여야 합니다. (예: USD)'),
});

export type CustomsDeclarationInput = z.infer<typeof customsDeclarationSchema>;

/**
 * 통관 상태 업데이트 스키마
 */
export const customsStatusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'SUBMITTED', 'APPROVED', 'HELD', 'REJECTED']),
  declarationNo: z.string().optional(),
  adminNote: z.string().optional(),
});

export type CustomsStatusUpdateInput = z.infer<typeof customsStatusUpdateSchema>;
