"use server";

import { logger } from '@/lib/logger';
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * 특정 역할의 모든 권한을 업데이트합니다.
 */
export async function updateRolePermissions(
  roleCode: string,
  allowedPaths: string[]
) {
  const supabase = await createClient();

  // 1. 기존 권한 삭제
  const { error: deleteError } = await supabase
    .from("zen_role_permissions")
    .delete()
    .eq("role_code", roleCode);

  if (deleteError) {
    logger.error("Error deleting old permissions:", deleteError);
    return { success: false, error: deleteError.message };
  }

  // 2. 신규 권한 삽입
  if (allowedPaths.length > 0) {
    const records = allowedPaths.map(path => ({
      role_code: roleCode,
      path: path,
      menu_id: path.split('/').filter(Boolean).pop() || "root",
      is_allowed: true
    }));

    const { error: insertError } = await supabase
      .from("zen_role_permissions")
      .insert(records);

    if (insertError) {
      logger.error("Error inserting new permissions:", insertError);
      return { success: false, error: insertError.message };
    }
  }

  // 3. 캐시 갱신
  revalidatePath("/", "layout");
  return { success: true };
}
