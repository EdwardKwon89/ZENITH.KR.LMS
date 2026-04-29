"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { validateAdminAction } from "@/lib/auth/guards";
import { sendInAppNotification } from "./notifications";

/**
 * 클라이언트 또는 서버에서 발생한 에러를 DB에 기록하고, 중대 에러 시 관리자에게 알림을 발송합니다.
 */
export async function logClientError(data: {
  message: string;
  stack?: string;
  url?: string;
  severity?: "WARNING" | "ERROR" | "CRITICAL";
  error_type?: "CLIENT" | "SERVER" | "EDGE";
  sentry_id?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 사용자 프로필에서 조직 정보 가져오기
  let org_id = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();
    org_id = profile?.org_id;
  }

  const { data: log, error } = await supabase
    .from('zen_error_logs')
    .insert({
      message: data.message,
      stack: data.stack,
      url: data.url,
      severity: data.severity || 'ERROR',
      error_type: data.error_type || 'CLIENT',
      sentry_id: data.sentry_id,
      user_id: user?.id,
      org_id
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to log error to DB:", error);
    return { success: false, error: error.message };
  }

  // CRITICAL 레벨인 경우 관리자들에게 인앱 알림 발송
  if (data.severity === 'CRITICAL') {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['ADMIN', 'ZENITH_SUPER_ADMIN']);

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        await sendInAppNotification({
          userId: admin.id,
          title: "CRITICAL System Error",
          message: `시스템 임계 에러 발생: ${data.message.substring(0, 50)}...`,
          type: "SYSTEM",
          link: "/admin/error-logs"
        });
      }
    }
  }

  return { success: true, logId: log.id };
}

/**
 * 관리자용 에러 로그 목록 조회 (페이징 지원)
 */
export async function getErrorLogs(params: {
  page?: number;
  pageSize?: number;
  severity?: string;
  resolved?: boolean;
}) {
  const { supabase } = await validateAdminAction();
  
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('zen_error_logs')
    .select('*, user:profiles(full_name, email)', { count: 'exact' });

  if (params.severity) {
    query = query.eq('severity', params.severity);
  }
  if (params.resolved !== undefined) {
    query = query.eq('resolved', params.resolved);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error("getErrorLogs error:", error);
    throw error;
  }

  return { 
    data: data || [], 
    count: count || 0, 
    page, 
    pageSize 
  };
}

/**
 * 특정 에러 로그를 '해결됨' 상태로 변경
 */
export async function resolveErrorLog(id: string) {
  const { supabase } = await validateAdminAction();

  const { error } = await supabase
    .from('zen_error_logs')
    .update({ resolved: true })
    .eq('id', id);

  if (error) throw error;
  
  revalidatePath('/admin/error-logs');
  return { success: true };
}
