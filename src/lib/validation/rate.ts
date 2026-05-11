import { z } from "zod";

export const rateSurchargeSchema = z.object({
  surcharge_type: z.enum(['FSC', 'SSC', 'THC', 'DG', 'PEAK', 'CUSTOM']),
  calc_type: z.enum(['PERCENT', 'FIXED']),
  amount: z.number().min(0),
  currency: z.string().default('USD'),
  description: z.string().optional(),
});

export const rateTierSchema = z.object({
  weight_min: z.number().min(0),
  unit_price: z.number().min(0),
  min_total_price: z.number().min(0).default(0),
});

export const rateCardSchema = z.object({
  org_id: z.string().uuid().optional(),
  origin_code: z.string().min(2),
  dest_code: z.string().min(2),
  mode: z.enum(['AIR', 'SEA', 'LAND']),
  unit_type: z.enum(['KG', 'CBM', 'LOT', 'FCL_20', 'FCL_40', 'LCL']),
  transit_days: z.number().int().min(1).optional(),
  is_direct: z.boolean().default(true),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  remarks: z.string().optional(),
  currency: z.string().default('USD'),
});

export const rateRegistrationSchema = z.object({
  card: rateCardSchema,
  tiers: z.array(rateTierSchema).min(1),
  surcharges: z.array(rateSurchargeSchema).optional(),
});

export type RateRegistrationInput = z.infer<typeof rateRegistrationSchema>;
