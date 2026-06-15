"use server";

import { logger } from "@/lib/logger";
import { validateAdminAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateSchema = z.object({
  baseCurrency: z.string().min(1),
  exchangeRates: z.record(
    z.string(),
    z.string().refine(val => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, { message: "환율은 0보다 큰 숫자여야 합니다." })
  )
});

/**
 * 환율 설정 조회
 */
export async function getExchangeRateSettings(): Promise<{
  baseCurrency: string;
  rates: { key: string; label: string; value: string }[];
}> {
  const { supabase } = await validateAdminAction();

  const { data, error } = await supabase
    .from("system_settings")
    .select("key, label, value")
    .in("key", ["BASE_CURRENCY", "EXCHANGE_RATE_USD", "EXCHANGE_RATE_CNY", "EXCHANGE_RATE_JPY"]);

  if (error) {
    logger.error("Failed to fetch exchange rate settings:", error);
    throw error;
  }

  const settingsMap = new Map(data.map(item => [item.key, item]));
  const rawBase = settingsMap.get("BASE_CURRENCY")?.value;
  let baseCurrency = "KRW";
  if (rawBase) {
    try {
      baseCurrency = JSON.parse(rawBase);
    } catch {
      baseCurrency = rawBase;
    }
  }

  const targetKeys = ["EXCHANGE_RATE_USD", "EXCHANGE_RATE_CNY", "EXCHANGE_RATE_JPY"];
  const rates = targetKeys.map(key => {
    const item = settingsMap.get(key);
    return {
      key,
      label: item?.label || key,
      value: item?.value || "0"
    };
  });

  return { baseCurrency, rates };
}

/**
 * 환율 설정 저장 (전체 일괄 저장)
 */
export async function updateExchangeRateSettings(rates: {
  baseCurrency: string;
  exchangeRates: Record<string, string>;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = updateSchema.safeParse(rates);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { supabase } = await validateAdminAction();
  const { baseCurrency, exchangeRates } = parsed.data;

  const { error: baseError } = await supabase
    .from("system_settings")
    .update({ value: JSON.stringify(baseCurrency), updated_at: new Date().toISOString() })
    .eq("key", "BASE_CURRENCY");

  if (baseError) {
    logger.error("Failed to update BASE_CURRENCY:", baseError);
    return { success: false, error: baseError.message };
  }

  for (const [key, val] of Object.entries(exchangeRates)) {
    const { error: rateError } = await supabase
      .from("system_settings")
      .update({ value: val, updated_at: new Date().toISOString() })
      .eq("key", key);
    if (rateError) {
      logger.error(`Failed to update setting ${key}:`, rateError);
      return { success: false, error: rateError.message };
    }
  }

  revalidatePath("/", "layout");
  return { success: true };
}
