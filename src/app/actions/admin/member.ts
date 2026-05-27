"use server";

import { logger } from '@/lib/logger';
import { withAction } from '@/lib/actions/wrapper';
import { revalidatePath } from "next/cache";
import { validateUserAction, validateAdminAction } from "@/lib/auth/guards";
import { createAdminClient } from '@/utils/supabase/server';
import { sendInAppNotification } from "../notifications";
import { USER_ROLES } from '@/lib/auth/rbac';
import { AdminRepository } from '@/lib/repositories';

export interface GradeMasterItem {
  grade_code: string;
  grade_name_ko: string;
  grade_name_en: string | null;
  discount_rate: number;
  benefit_desc: string | null;
}

export interface GradePromotionRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  current_grade: string;
  target_grade: string;
  request_reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_comment: string | null;
  processed_at: string | null;
  created_at: string;
}

/**
 * 1. 등급 마스터 조회 (승급 가능 등급 목록)
 */
export async function getGradeMaster(): Promise<GradeMasterItem[]> {
  const { supabase } = await validateUserAction();
  const adminRepo = new AdminRepository(supabase);
  return adminRepo.findGradeMaster();
}

/**
 * 1.1. 내 프로필 정보 조회
 */
export async function getMyProfile() {
  const { profile } = await validateUserAction();

  if (!profile) {
    throw new Error("프로필 정보를 불러오는 데 실패했습니다.");
  }

  return profile;
}

/**
 * 1.1.1. 내 프로필 정보 수정
 */
export async function updateMyProfile(payload: {
  fullName: string;
}) {
  const { user, supabase } = await validateUserAction();
  const adminRepo = new AdminRepository(supabase);

  try {
    const { error: zenError } = await adminRepo.updateProfileFullName(user.id, payload.fullName);
    if (zenError) throw zenError;

    revalidatePath("/mypage/profile");
    return { success: true };
  } catch (err: any) {
    logger.error("[MEMBER_ACTION] updateMyProfile Error:", err.message);
    return { error: "프로필 수정 중 오류가 발생했습니다." };
  }
}

/**
 * 1.2. 내 대기 중인 승급 신청 조회
 */
export async function getMyPendingPromotionRequest() {
  const { user, supabase } = await validateUserAction();
  const adminRepo = new AdminRepository(supabase);

  const { data, error } = await adminRepo.findPendingPromotionByUserId(user.id);
  if (error) {
    logger.error("Error fetching pending request:", error);
    return null;
  }

  return data;
}

/**
 * 2. 승급 신청 (INDIVIDUAL 사용자 전용)
 */
export const requestGradePromotion = withAction(async function (payload: {
  targetGrade: string;
  requestReason: string;
}) {
  const { user, supabase } = await validateUserAction();
  const adminRepo = new AdminRepository(supabase);

  const { data: zenProfile, error: zenProfileError } = await adminRepo.findProfileById(user.id);
  const { data: profileGrade } = await adminRepo.findProfileGrade(user.id);

  const profile = zenProfile ? {
    role: zenProfile.role,
    grade_code: profileGrade?.grade_code || 'IRON'
  } : null;

  if (zenProfileError || !profile) {
    throw new Error("프로필 정보를 확인할 수 없습니다.");
  }

  if (profile.role !== USER_ROLES.INDIVIDUAL) {
    throw new Error("개인 회원만 등급 승급을 신청할 수 있습니다.");
  }

  const { data: existing } = await adminRepo.findExistingPendingRequest(user.id);
  if (existing) {
    throw new Error("이미 대기 중인 승급 신청이 있습니다.");
  }

  const { data: request, error: requestError } = await adminRepo.insertPromotionRequest({
    user_id: user.id,
    current_grade: profile.grade_code,
    target_grade: payload.targetGrade,
    request_reason: payload.requestReason,
    status: "PENDING"
  });

  if (requestError || !request) {
    logger.error("Error requesting grade promotion:", requestError);
    throw new Error("승급 신청 중 오류가 발생했습니다.");
  }

  const { data: admins } = await adminRepo.findAdminProfiles();
  if (admins && admins.length > 0) {
    for (const admin of admins) {
      await sendInAppNotification({
        userId: admin.id,
        type: "GRADE_PROMOTION_REQUESTED",
        title: "🚨 등급 승급 신청 알림",
        message: `${user.email} 회원의 승급 신청이 접수되었습니다.`,
      });
    }
  }

  revalidatePath("/mypage/grade");
  return request.id;
});

/**
 * 3. 승급 신청 목록 조회 (Admin 전용)
 */
export async function getGradePromotionRequests(params?: {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  limit?: number;
  offset?: number;
}): Promise<{ requests: GradePromotionRequest[]; total: number }> {
  const { supabase, profile } = await validateAdminAction();
  const adminRepo = new AdminRepository(supabase);

  const { data, count, error } = await adminRepo.findPromotionRequests(params);

  if (error) {
    logger.error("Error fetching promotion requests:", {
      error,
      adminRole: profile?.role,
      params,
    });
    throw new Error("신청 목록을 불러오는 데 실패했습니다.");
  }

  const requests: GradePromotionRequest[] = (data || []).map((item: any) => {
    const zenProfileValue = item.zen_profiles;
    const zenProfileItem = Array.isArray(zenProfileValue)
      ? zenProfileValue[0]
      : zenProfileValue;

    return {
      id: item.id,
      user_id: item.user_id,
      user_name: zenProfileItem?.full_name || "Unknown",
      user_email: zenProfileItem?.email || "Unknown",
      current_grade: item.current_grade,
      target_grade: item.target_grade,
      request_reason: item.request_reason,
      status: item.status,
      admin_comment: item.admin_comment,
      processed_at: item.processed_at,
      created_at: item.created_at
    };
  });

  return { requests, total: count || 0 };
}

/**
 * 4. 승급 심사 처리 (Admin 전용)
 */
export const reviewGradePromotion = withAction(async function (payload: {
  requestId: string;
  decision: 'APPROVED' | 'REJECTED';
  adminComment?: string;
}) {
  const { supabase } = await validateAdminAction();
  const adminRepo = new AdminRepository(supabase);

  const { data: request, error: fetchError } = await adminRepo.findPromotionRequestById(payload.requestId);
  if (fetchError || !request) {
    throw new Error("신청 내역을 찾을 수 없습니다.");
  }

  if (request.status !== "PENDING") {
    throw new Error("이미 처리가 완료된 신청입니다.");
  }

  const { error: updateError } = await adminRepo.updatePromotionRequest(payload.requestId, {
    status: payload.decision,
    admin_comment: payload.adminComment,
    processed_at: new Date().toISOString()
  });

  if (updateError) {
    throw new Error("심사 결과 저장 중 오류가 발생했습니다.");
  }

  if (payload.decision === "APPROVED") {
    const { error: profileUpdateError } = await adminRepo.updateProfileGrade(request.user_id, request.target_grade);
    if (profileUpdateError) {
      logger.error("Failed to update profile grade:", profileUpdateError);
    }
  }

  const resultText = payload.decision === "APPROVED" ? "승인" : "반려";
  await sendInAppNotification({
    userId: request.user_id,
    type: "GRADE_PROMOTION_RESULT",
    title: `등급 승급 심사 결과 (${resultText})`,
    message: payload.decision === "APPROVED"
      ? `축하합니다! 등급 승급이 승인되었습니다. (${request.target_grade})`
      : `안타깝게도 등급 승급이 반려되었습니다. 사유: ${payload.adminComment || "사유 없음"}`,
  });

  revalidatePath("/admin/upgrade-requests");
  revalidatePath("/mypage/grade");
  return true;
});

/**
 * 5. 회원 탈퇴 (Soft Delete)
 */
export async function withdrawUser() {
  const { user, supabase } = await validateUserAction();
  const adminRepo = new AdminRepository(supabase);

  try {
    const { error } = await adminRepo.deactivateProfile(user.id);
    if (error) throw error;

    await supabase.auth.signOut();

    return { success: true };
  } catch (err: any) {
    logger.error("[MEMBER_ACTION] withdrawUser Error:", err.message);
    return { error: "탈퇴 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 6. 회원 목록 조회 (Admin 전용)
 */
export async function listMembers(params?: {
  status?: string;
  role?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}) {
  const { supabase } = await validateAdminAction();
  const repo = new AdminRepository(supabase);

  const { data, error, count } = await repo.findMembers({
    status: params?.status,
    role: params?.role,
    keyword: params?.keyword,
    limit: params?.limit || 20,
    offset: params?.offset || 0,
  });

  if (error) {
    logger.error("[MEMBER_ACTION] listMembers Error:", error);
    throw new Error("회원 목록을 불러오는 데 실패했습니다.");
  }

  return { members: data || [], total: count || 0 };
}

/**
 * 7. 회원 상태 변경 (Admin 전용)
 */
export async function changeMemberStatus(userId: string, status: string) {
  const { supabase, profile } = await validateAdminAction();
  const repo = new AdminRepository(supabase);

  if (status === 'SUSPENDED' && profile?.id === userId) {
    throw new Error("자기 자신을 정지할 수 없습니다.");
  }

  const { error } = await repo.updateProfileStatus(userId, status);
  if (error) {
    logger.error("[MEMBER_ACTION] changeMemberStatus Error:", error);
    throw new Error("회원 상태 변경 중 오류가 발생했습니다.");
  }

  // Sync status to Supabase Auth app_metadata so proxy middleware reads fresh status
  try {
    const admin = await createAdminClient();
    const { data: currentUser } = await admin.auth.admin.getUserById(userId);
    if (currentUser?.user?.app_metadata) {
      await admin.auth.admin.updateUserById(userId, {
        app_metadata: { ...currentUser.user.app_metadata, status },
      });
    }
  } catch (e) {
    logger.error("[MEMBER_ACTION] changeMemberStatus app_metadata sync error:", e);
  }

  revalidatePath("/admin/members");
  return { success: true };
}

/**
 * 8. 회원 등급 변경 (Admin 전용)
 */
export async function changeMemberGrade(userId: string, gradeCode: string) {
  const { supabase } = await validateAdminAction();
  const repo = new AdminRepository(supabase);

  const { error } = await repo.updateProfileGrade(userId, gradeCode);
  if (error) {
    logger.error("[MEMBER_ACTION] changeMemberGrade Error:", error);
    throw new Error("회원 등급 변경 중 오류가 발생했습니다.");
  }

  revalidatePath("/admin/members");
  return { success: true };
}
