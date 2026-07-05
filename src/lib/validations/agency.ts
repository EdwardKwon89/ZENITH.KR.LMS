import { z } from 'zod';

export const CreateAgencyShipperSchema = z.object({
  name: z.string().min(1, '화주명을 입력해주세요.').max(100, '화주명은 100자 이하여야 합니다.'),
  shipper_type: z.enum(['INDIVIDUAL', 'CORPORATE'], { message: '화주 유형을 선택해주세요.' }),
  discount_rate: z.number({ message: '할인율을 입력해주세요.' })
    .min(0, '할인율은 0 이상이어야 합니다.')
    .max(0.9999, '할인율은 99.99% 이하여야 합니다.'),
  grade: z.string().max(20).optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email('유효한 이메일 형식이 아닙니다.').optional().or(z.literal('')),
  contact_phone: z.string().regex(/^0\d{1,2}-\d{3,4}-\d{4}$/, '연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)').optional().or(z.literal('')),
  biz_no: z.string().regex(/^\d{3}-\d{2}-\d{5}$/, '사업자번호 형식이 올바르지 않습니다. (예: 123-45-67890)').optional().or(z.literal('')),
  rep_name: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.shipper_type === 'CORPORATE' && !data.biz_no) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['biz_no'],
      message: '법인 화주는 사업자번호를 필수로 입력해야 합니다.',
    });
  }
});

export const UpdateAgencyShipperGradeSchema = z.object({
  grade: z.string().max(20),
  discount_rate: z.number().min(0).max(0.9999),
});

export const UpdateAgencyShipperSchema = z.object({
  name: z.string().min(1, '화주명을 입력해주세요.').max(100, '화주명은 100자 이하여야 합니다.'),
  shipper_type: z.enum(['INDIVIDUAL', 'CORPORATE'], { message: '화주 유형을 선택해주세요.' }),
  discount_rate: z.number({ message: '할인율을 입력해주세요.' })
    .min(0, '할인율은 0 이상이어야 합니다.')
    .max(0.9999, '할인율은 99.99% 이하여야 합니다.'),
  grade: z.string().max(20).optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email('유효한 이메일 형식이 아닙니다.').optional().or(z.literal('')),
  contact_phone: z.string().regex(/^0\d{1,2}-\d{3,4}-\d{4}$/, '연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)').optional().or(z.literal('')),
  biz_no: z.string().regex(/^\d{3}-\d{2}-\d{5}$/, '사업자번호 형식이 올바르지 않습니다. (예: 123-45-67890)').optional().or(z.literal('')),
  rep_name: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.shipper_type === 'CORPORATE' && !data.biz_no) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['biz_no'],
      message: '법인 화주는 사업자번호를 필수로 입력해야 합니다.',
    });
  }
});

export const CreateAgencyRateOverrideSchema = z.object({
  base_rate_id: z.string().uuid(),
  selling_price: z.number().min(0),
  cost_price: z.number().min(0).optional(),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const AgencySettlementQuerySchema = z.object({
  agency_org_id: z.string().uuid(),
  shipper_org_id: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  order_no_search: z.string().optional(),
});

