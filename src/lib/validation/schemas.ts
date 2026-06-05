/**
 * Server Action 입력 검증 스키마 (Zod)
 * 각 Server Action의 payload 구조를 정의하고 런타임 검증을 제공합니다.
 */

import { z } from "zod";

export const createVocSchema = z.object({
  order_id: z.string().uuid("유효한 오더 ID가 아닙니다"),
  type: z.enum(["DELAY", "DAMAGE", "MISDELIVERY", "OTHER"], {
    error: "유효한 VOC 유형이 아닙니다 (DELAY, DAMAGE, MISDELIVERY, OTHER)",
  }),
  title: z.string().min(1, "제목은 필수입니다").max(200, "제목은 200자 이하입니다"),
  description: z.string().min(1, "내용은 필수입니다").max(5000, "내용은 5000자 이하입니다"),
});

export const upsertTransportCostSchema = z.object({
  id: z.string().uuid().optional(),
  order_id: z.string().uuid("유효한 오더 ID가 아닙니다"),
  cost_type: z.string().min(1, "비용 유형은 필수입니다").max(50),
  amount: z.number().min(0, "금액은 0 이상이어야 합니다"),
  currency: z.string().length(3, "통화 코드는 3자리입니다 (예: USD)").optional(),
  description: z.string().max(500).optional(),
});

export const upsertPortSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, "포트 코드는 필수입니다").max(10),
  name: z.string().min(1, "포트명은 필수입니다").max(100),
  country_code: z.string().length(2, "국가 코드는 2자리입니다 (예: KR)").optional(),
  city: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
});

export const upsertCommonCodeSchema = z.object({
  group_code: z.string().min(1, "그룹 코드는 필수입니다").max(50),
  code_value: z.string().min(1, "코드 값은 필수입니다").max(50),
  code_name: z.string().min(1, "코드명은 필수입니다").max(100),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

export const updateSystemParamSchema = z.object({
  value_jsonb: z.unknown().optional(),
  description: z.string().max(500).optional(),
  updated_by: z.string().uuid().optional(),
});

export const upsertVesselScheduleSchema = z.object({
  id: z.string().uuid().optional(),
  vessel_name: z.string().min(1, "선박명은 필수입니다").max(100),
  voyage_no: z.string().min(1, "항해번호는 필수입니다").max(50),
  origin_port_id: z.string().uuid("출발항이 유효하지 않습니다"),
  destination_port_id: z.string().uuid("도착항이 유효하지 않습니다"),
  service_type: z.enum(["AIR", "SEA"], { required_error: "운송모드는 필수입니다" }),
  carrier_id: z.string().uuid().optional(),
  etd: z.string().min(1, "ETD는 필수입니다"),
  eta: z.string().min(1, "ETA는 필수입니다"),
  status: z.string().optional(),
});

/**
 * 공통 검증 헬퍼 — safeParse 실패 시 표준 에러 반환
 */
export function validatePayload<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues?.[0]?.message ?? "입력 값이 유효하지 않습니다";
    return { success: false, error: firstError };
  }
  return { success: true, data: result.data };
}
