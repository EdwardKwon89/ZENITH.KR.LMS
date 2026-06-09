"use server";
import { logger } from '@/lib/logger';

import { validateAdminAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { AdminRepository } from '@/lib/repositories';
import { createAdminClient } from '@/utils/supabase/server';

/**
 * 신규 가입한 조직(화주/포워더 등)을 승인합니다.
 */
export async function approveOrganization(orgId: string) {
  const { supabase, user } = await validateAdminAction();
  const adminRepo = new AdminRepository(supabase);

  const { data: newId, error } = await adminRepo.approveOrganization(orgId);
  if (error) throw new Error(`Org approval RPC failed: ${error.message}`);

  logger.info(`Organization ${orgId} approved by admin ${user.id}. Assigned ID: ${newId}`);

  revalidatePath("/admin/organizations");
  return { success: true, corporateId: newId };
}

/**
 * 가입 요청을 반려합니다.
 */
export async function rejectOrganization(orgId: string, reason: string) {
  const { supabase } = await validateAdminAction();
  const adminRepo = new AdminRepository(supabase);

  const { error } = await adminRepo.rejectOrganization(orgId, reason);
  if (error) throw new Error(`Org rejection RPC failed: ${error.message}`);

  revalidatePath("/admin/organizations");
  return { success: true };
}

/**
 * [Ds-11 2.5] 조직 가입 신청 시 서류 보완을 요청합니다.
 */
export async function requestOrganizationSupplement(orgId: string, reason: string) {
  const { supabase } = await validateAdminAction();
  const adminRepo = new AdminRepository(supabase);

  const { error } = await adminRepo.requestOrganizationSupplement(orgId, reason);
  if (error) throw new Error(`Supplement request RPC failed: ${error.message}`);

  revalidatePath("/admin/organizations");
  return { success: true };
}

/**
 * 증빙서류 파일에 대한 Signed URL을 생성합니다 (Admin 전용).
 * service_role 클라이언트를 사용하여 RLS 우회.
 */
export async function getDocumentSignedUrl(filePath: string) {
  await validateAdminAction();

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.storage
    .from('business_docs')
    .createSignedUrl(filePath, 60 * 60);

  if (error) {
    logger.error('[getDocumentSignedUrl] Failed:', error.message);
    return { error: error.message };
  }

  return { signedUrl: data.signedUrl };
}

/**
 * 조직 목록을 조회합니다 (가입 대기 중인 조직 우선).
 */
export async function getOrganizations(status?: string | string[], page = 1, pageSize = 50) {
  const { supabase } = await validateAdminAction();
  const adminRepo = new AdminRepository(supabase);

  const { data, error, count } = await adminRepo.findOrganizations(status, page, pageSize);
  if (error) throw new Error(`Failed to fetch organizations: ${error.message}`);

  return { organizations: data || [], total: count || 0 };
}
