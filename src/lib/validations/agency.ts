import { z } from 'zod';

export const CreateAgencyShipperSchema = z.object({
  name: z.string().min(1).max(100),
  shipper_type: z.enum(['INDIVIDUAL', 'CORPORATE']),
  discount_rate: z.number().min(0).max(0.9999),
  grade: z.string().max(20).optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
});

export const UpdateAgencyShipperGradeSchema = z.object({
  grade: z.string().max(20),
  discount_rate: z.number().min(0).max(0.9999),
});
