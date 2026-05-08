"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { validateUserAction, validateAdminAction } from "@/lib/auth/guards";
import { sendInAppNotification } from "./notifications";

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
  user_name: string;      // profiles.full_name
  user_email: string;     // profiles.email
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

  const { data, error } = await supabase
    .from("grade_master")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching grade master:", error);
    throw new Error("등급 정보를 불러오는 데 실패했습니다.");
  }

  return data || [];
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

  try {
    // 1. zen_profiles 업데이트
    const { error: zenError } = await supabase
      .from("zen_profiles")
      .update({ full_name: payload.fullName })
      .eq("id", user.id);

    if (zenError) throw zenError;

    // 2. profiles 업데이트 (동기화)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ 
        full_name: payload.fullName,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (profileError) {
      console.warn("[MEMBER_ACTION] profiles sync failed:", profileError.message);
    }

    revalidatePath("/mypage/profile");
    return { success: true };
  } catch (err: any) {
    console.error("[MEMBER_ACTION] updateMyProfile Error:", err.message);
    return { error: "프로필 수정 중 오류가 발생했습니다." };
  }
}

/**
 * 1.2. 내 대기 중인 승급 신청 조회
 */
export async function getMyPendingPromotionRequest() {
  const { user, supabase } = await validateUserAction();

  const { data, error } = await supabase
    .from("grade_promotion_request")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "PENDING")
    .maybeSingle();

  if (error) {
    console.error("Error fetching pending request:", error);
    return null;
  }

  return data;
}

/**
 * 2. 승급 신청 (INDIVIDUAL 사용자 전용)
 */
export async function requestGradePromotion(payload: {
  targetGrade: string;
  requestReason: string;
}): Promise<{ success: boolean; requestId: string }> {
  const { user, supabase } = await validateUserAction();

  // 1. 프로필 정보 조회 (역할 및 현재 등급 확인) - zen_profiles 기준
  const { data: zenProfile, error: zenProfileError } = await supabase
    .from("zen_profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  // profiles 테이블에서 grade_code 조회 (zen_profiles에는 grade_code 없음)
  const { data: profileGrade } = await supabase
    .from("profiles")
    .select("grade_code")
    .eq("id", user.id)
    .maybeSingle();

  const profile = zenProfile ? {
    role: zenProfile.role,
    grade_code: profileGrade?.grade_code || 'IRON' // 기본값 IRON
  } : null;

  if (zenProfileError || !profile) {
    throw new Error("프로필 정보를 확인할 수 없습니다.");
  }

  if (profile.role !== 'INDIVIDUAL') {
    throw new Error("개인 회원만 등급 승급을 신청할 수 있습니다.");
  }

  // 2. 대기 중인 신청 확인
  const { data: existing } = await supabase
    .from("grade_promotion_request")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "PENDING")
    .maybeSingle();

  if (existing) {
    throw new Error("이미 대기 중인 승급 신청이 있습니다.");
  }

  // 3. 신청 등록
  const { data: request, error: requestError } = await supabase
    .from("grade_promotion_request")
    .insert({
      user_id: user.id,
      current_grade: profile.grade_code,
      target_grade: payload.targetGrade,
      request_reason: payload.requestReason,
      status: "PENDING"
    })
    .select()
    .single();

  if (requestError || !request) {
    console.error("Error requesting grade promotion:", requestError);
    throw new Error("승급 신청 중 오류가 발생했습니다.");
  }

  // 4. Admin 대상 알림 발송
  // (참조: 모든 관리자에게 알림 발송)
  const { data: admins } = await supabase
    .from("zen_profiles")
    .select("id")
    .in("role", ["ADMIN", "ZENITH_SUPER_ADMIN"]);

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
  return { success: true, requestId: request.id };
}

/**
 * 3. 승급 신청 목록 조회 (Admin 전용)
 */
export async function getGradePromotionRequests(params?: {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  limit?: number;
  offset?: number;
}): Promise<{ requests: GradePromotionRequest[]; total: number }> {
  const { supabase, profile } = await validateAdminAction();

  let query = supabase
    .from("grade_promotion_request")
    .select(`
      *,
      zen_profiles:user_id (
        full_name,
        email
      )
    `, { count: "exact" });

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  const limit = params?.limit || 20;
  const offset = params?.offset || 0;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching promotion requests:", {
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
export async function reviewGradePromotion(payload: {
  requestId: string;
  decision: 'APPROVED' | 'REJECTED';
  adminComment?: string;
}): Promise<{ success: boolean }> {
  const { supabase } = await validateAdminAction();

  // 1. 신청 내역 조회
  const { data: request, error: fetchError } = await supabase
    .from("grade_promotion_request")
    .select("*")
    .eq("id", payload.requestId)
    .single();

  if (fetchError || !request) {
    throw new Error("신청 내역을 찾을 수 없습니다.");
  }

  if (request.status !== "PENDING") {
    throw new Error("이미 처리가 완료된 신청입니다.");
  }

  // 2. 상태 업데이트
  const { error: updateError } = await supabase
    .from("grade_promotion_request")
    .update({
      status: payload.decision,
      admin_comment: payload.adminComment,
      processed_at: new Date().toISOString()
    })
    .eq("id", payload.requestId);

  if (updateError) {
    throw new Error("심사 결과 저장 중 오류가 발생했습니다.");
  }

  // 3. 승인 시 프로필 등급 갱신
  if (payload.decision === "APPROVED") {
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ grade_code: request.target_grade })
      .eq("id", request.user_id);

    if (profileUpdateError) {
      console.error("Failed to update profile grade:", profileUpdateError);
      // 신청 상태는 이미 업데이트되었으므로 로깅만 수행
    }
  }

  // 4. 신청자에게 알림 발송
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
  return { success: true };
}
