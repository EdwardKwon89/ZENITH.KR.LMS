import { z } from "zod";

export const inventoryAdjustmentSchema = z.object({
  inventoryId: z.string().uuid(),
  adjustmentQty: z.number(),
  reason: z.string().min(1, "조정 사유를 입력해주세요."),
});

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

export const inventoryFilterSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().optional().default(10),
  search: z.string().optional(),
  lowStockOnly: z.boolean().optional().default(false),
});

export type InventoryFilterInput = z.infer<typeof inventoryFilterSchema>;
