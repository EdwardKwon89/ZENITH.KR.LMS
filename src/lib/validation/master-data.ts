import { z } from "zod";

/**
 * 항구(Port) 정보 관리 스키마
 */
export const portSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2, "Port code is required (e.g. KRPUS)"),
  name: z.string().min(1, "Port name is required"),
  country_code: z.string().length(2, "ISO Country code is required"),
  city: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type PortInput = z.infer<typeof portSchema>;

/**
 * 공통코드(Common Code) 관리 스키마
 */
export const commonCodeSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.string().min(1, "Category is required"),
  code: z.string().min(1, "Code is required"),
  name_ko: z.string().min(1, "Korean name is required"),
  name_en: z.string().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CommonCodeInput = z.infer<typeof commonCodeSchema>;
