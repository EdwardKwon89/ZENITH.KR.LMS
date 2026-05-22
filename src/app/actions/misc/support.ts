"use server";

import { logger } from '@/lib/logger';

import { validateUserAction, validateAdminAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/auth/rbac";

export type QnaStatus = 'PENDING' | 'IN_PROGRESS' | 'ANSWERED';
export type FaqCategory = 'ORDER' | 'INVOICE' | 'TRACKING' | 'ROUTING' | 'GENERAL';

export interface QnaItem {
  id: string;
  order_id: string | null;
  order_no: string | null;
  org_id: string;
  title: string;
  content: string;
  status: QnaStatus;
  answer_count: number;
  created_at: string;
  updated_at: string;
}

export interface QnaAnswer {
  id: string;
  qna_id: string;
  answered_by: string;
  answered_by_name: string;
  content: string;
  created_at: string;
}

export interface QnaDetail extends QnaItem {
  answers: QnaAnswer[];
}

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  order_no: number;
  is_active: boolean;
  created_at: string;
}

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  is_important: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

// ==========================================
// QnA Actions
// ==========================================

/**
 * 15.1 createQna
 */
export async function createQna(payload: {
  title: string;
  content: string;
  order_id?: string;
}) {
  const { supabase, user, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  // 1. 오더 소유권 검증 (있는 경우)
  if (payload.order_id) {
    const { data: order, error: orderError } = await supabase
      .from("zen_orders")
      .select("shipper_id")
      .eq("id", payload.order_id)
      .single();

    if (orderError || !order) throw new Error("Order not found");
    if (order.shipper_id !== profile.org_id) throw new Error("UNAUTHORIZED: Access denied to this order");
  }

  // 2. zen_qna INSERT
  const { data: qna, error: qnaError } = await supabase
    .from("zen_qna")
    .insert({
      title: payload.title.substring(0, 200),
      content: payload.content.substring(0, 5000),
      order_id: payload.order_id || null,
      org_id: profile.org_id,
      created_by: user.id,
      status: 'PENDING'
    })
    .select("id, title, content, order_id, org_id, status, created_at, updated_at, created_by")
    .single();

  if (qnaError) throw new Error(`QnA creation failed: ${qnaError.message}`);

  // 3. Admin 대상 알림 발송 (VOC 패턴 참조)
  try {
    const { data: admins } = await supabase
      .from("zen_profiles")
      .select("id")
      .in("role", [USER_ROLES.ADMIN, USER_ROLES.ZENITH_SUPER_ADMIN, USER_ROLES.MANAGER]);

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        type: "QNA_CREATED",
        title: "신규 1:1 문의 접수",
        message: `신규 문의: ${payload.title}`,
        channel: "IN_APP"
      }));
      await supabase.from("zen_notifications").insert(notifications);
    }
  } catch (e) {
    logger.error("[ERROR] QnA notification failed:", e);
  }

  revalidatePath("/support/qna");
  return { success: true, qnaId: qna.id };
}

/**
 * 15.2 getQnaList
 */
export async function getQnaList({
  status,
  order_id,
  limit = 20,
  offset = 0
}: {
  status?: QnaStatus;
  order_id?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { supabase, profile } = await validateUserAction();
  
  let query = supabase
    .from("zen_qna")
    .select(`
      *,
      order:zen_orders(order_no),
      answer_count:zen_qna_answers(count)
    `, { count: "exact" });

  // RLS가 작동하지만 명시적 필터링 추가 (Admin인 경우 제외)
  if (profile?.role !== USER_ROLES.ADMIN && profile?.role !== USER_ROLES.ZENITH_SUPER_ADMIN) {
    query = query.eq("org_id", profile?.org_id);
  }

  if (status) query = query.eq("status", status);
  if (order_id) query = query.eq("order_id", order_id);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  const qnas = data.map((item: any) => ({
    ...item,
    order_no: item.order?.order_no,
    answer_count: item.answer_count?.[0]?.count || 0
  }));

  return { qnas, total: count || 0 };
}

/**
 * 15.3 getQnaDetail
 */
export async function getQnaDetail(qnaId: string): Promise<QnaDetail> {
  const { supabase } = await validateUserAction();

  const { data: qna, error: qnaError } = await supabase
    .from("zen_qna")
    .select(`
      id, title, content, order_id, org_id, status, created_at, updated_at, created_by,
      order:zen_orders(order_no)
    `)
    .eq("id", qnaId)
    .single();

  if (qnaError || !qna) throw new Error("QnA not found");

  const { data: answers, error: ansError } = await supabase
    .from("zen_qna_answers")
    .select(`
      id, qna_id, answered_by, content, created_at,
      profile:profiles(full_name)
    `)
    .eq("qna_id", qnaId)
    .order("created_at", { ascending: true });

  if (ansError) throw new Error(ansError.message);

  return {
    ...qna,
    order_no: qna.order?.order_no,
    answers: answers.map((ans: any) => ({
      ...ans,
      answered_by_name: ans.profile?.full_name || "Admin"
    }))
  } as QnaDetail;
}

/**
 * 15.4 answerQna
 */
export async function answerQna(payload: {
  qnaId: string;
  content: string;
  isFinal?: boolean;
}) {
  const { supabase, user } = await validateAdminAction();

  // 1. 답변 등록
  const { data: answer, error: ansError } = await supabase
    .from("zen_qna_answers")
    .insert({
      qna_id: payload.qnaId,
      answered_by: user.id,
      content: payload.content.substring(0, 5000)
    })
    .select("id, qna_id, answered_by, content, created_at")
    .single();

  if (ansError) throw new Error(`Answer failed: ${ansError.message}`);

  // 2. 상태 업데이트
  const { data: qna } = await supabase
    .from("zen_qna")
    .select("status, created_by, title")
    .eq("id", payload.qnaId)
    .single();

  let nextStatus: QnaStatus = 'IN_PROGRESS';
  if (payload.isFinal) nextStatus = 'ANSWERED';
  else if (qna?.status === 'ANSWERED') nextStatus = 'ANSWERED'; // 이미 완료된 건 유지

  await supabase
    .from("zen_qna")
    .update({ status: nextStatus })
    .eq("id", payload.qnaId);

  // 3. 고객 알림
  if (qna) {
    try {
      await supabase.from("zen_notifications").insert({
        user_id: qna.created_by,
        type: "QNA_ANSWERED",
        title: "문의 답변 등록",
        message: `문의하신 "${qna.title}"에 대한 답변이 등록되었습니다.`,
        channel: "IN_APP"
      });
    } catch (e) {
      logger.error("[ERROR] QnA answer notification failed:", e);
    }
  }

  revalidatePath(`/support/qna/${payload.qnaId}`);
  revalidatePath("/support/qna");
  
  return { success: true, answerId: answer.id };
}

// ==========================================
// FAQ Actions
// ==========================================

/**
 * 15.5 upsertFaq
 */
export async function upsertFaq(payload: {
  id?: string;
  category: FaqCategory;
  question: string;
  answer: string;
  order_no?: number;
  is_active?: boolean;
}) {
  const { supabase, user } = await validateAdminAction();

  const faqData = {
    category: payload.category,
    question: payload.question.substring(0, 500),
    answer: payload.answer.substring(0, 5000),
    order_no: payload.order_no || 0,
    is_active: payload.is_active ?? true,
    created_by: user.id
  };

  let query;
  if (payload.id) {
    query = supabase.from("zen_faq").update(faqData).eq("id", payload.id);
  } else {
    query = supabase.from("zen_faq").insert(faqData);
  }

  const { data, error } = await query.select("id, answer, category, created_at, created_by, is_active, order_no, question, updated_at").single();
  if (error) throw new Error(`FAQ upsert failed: ${error.message}`);

  revalidatePath("/support/faq");
  return { success: true, faqId: data.id };
}

/**
 * 15.6 getFaqList
 */
export async function getFaqList({
  category,
  keyword,
  page = 1,
  pageSize = 50,
}: {
  category?: FaqCategory;
  keyword?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const { supabase, profile } = await validateUserAction();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase.from("zen_faq").select("id, answer, category, created_at, created_by, is_active, order_no, question, updated_at", { count: "exact" });

  if (profile?.role !== USER_ROLES.ADMIN && profile?.role !== USER_ROLES.ZENITH_SUPER_ADMIN) {
    query = query.eq("is_active", true);
  }

  if (category) query = query.eq("category", category);
  if (keyword) {
    query = query.or(`question.ilike.%${keyword}%,answer.ilike.%${keyword}%`);
  }

  const { data, error, count } = await query.order("order_no", { ascending: true }).range(from, to);
  if (error) throw new Error(error.message);

  return { faqs: data as FaqItem[], total: count || 0 };
}

/**
 * 15.7 deleteFaq
 */
export async function deleteFaq(faqId: string) {
  const { supabase } = await validateAdminAction();

  // 소프트 삭제
  const { error } = await supabase
    .from("zen_faq")
    .update({ is_active: false })
    .eq("id", faqId);

  if (error) throw new Error(`Delete failed: ${error.message}`);

  revalidatePath("/support/faq");
  return { success: true };
}

// ==========================================
// Notice Actions
// ==========================================

/**
 * 15.8 upsertNotice
 */
export async function upsertNotice(payload: {
  id?: string;
  title: string;
  content: string;
  is_important?: boolean;
  is_published?: boolean;
}) {
  const { supabase, user } = await validateAdminAction();

  const noticeData: any = {
    title: payload.title.substring(0, 200),
    content: payload.content.substring(0, 10000),
    is_important: payload.is_important ?? false,
    is_published: payload.is_published ?? false,
    created_by: user.id
  };

  if (payload.is_published) {
    // 최초 발행 시점 기록을 위해 현재 상태 확인
    if (payload.id) {
      const { data: current } = await supabase.from("zen_notices").select("published_at").eq("id", payload.id).single();
      if (!current?.published_at) {
        noticeData.published_at = new Date().toISOString();
      }
    } else {
      noticeData.published_at = new Date().toISOString();
    }
  }

  let query;
  if (payload.id) {
    query = supabase.from("zen_notices").update(noticeData).eq("id", payload.id);
  } else {
    query = supabase.from("zen_notices").insert(noticeData);
  }

  const { data, error } = await query.select("id, content, created_at, created_by, is_important, is_published, published_at, title, updated_at").single();
  if (error) throw new Error(`Notice upsert failed: ${error.message}`);

  revalidatePath("/support/notices");
  return { success: true, noticeId: data.id };
}

/**
 * 15.10 deleteNotice
 */
export async function deleteNotice(noticeId: string) {
  const { supabase } = await validateAdminAction();

  const { error } = await supabase
    .from("zen_notices")
    .delete()
    .eq("id", noticeId);

  if (error) throw new Error(`Delete failed: ${error.message}`);

  revalidatePath("/support/notices");
  return { success: true };
}

/**
 * 15.9 getNoticeList
 */
export async function getNoticeList({
  limit = 20,
  offset = 0
}: {
  limit?: number;
  offset?: number;
} = {}) {
  const { supabase, profile } = await validateUserAction();
  
  let query = supabase.from("zen_notices").select("*", { count: "exact" });

  if (profile?.role !== USER_ROLES.ADMIN && profile?.role !== USER_ROLES.ZENITH_SUPER_ADMIN) {
    query = query.eq("is_published", true);
  }

  const { data, error, count } = await query
    .order("is_important", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  return { notices: data as NoticeItem[], total: count || 0 };
}
/**
 * 15.11 getOrderQnaList
 * 특정 오더에 연결된 QnA 목록 조회 (오더 상세 탭에서 사용)
 */
export async function getOrderQnaList(orderId: string, page = 1, pageSize = 50): Promise<{ qnas: QnaItem[]; total: number }> {
  const { supabase, profile } = await validateUserAction();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("zen_qna")
    .select(`
      id, title, content, order_id, org_id, status, created_at, updated_at, created_by,
      order:zen_orders(order_no),
      answer_count:zen_qna_answers(count)
    `, { count: "exact" });

  // 1. 오더 소유권/권한 검증
  // Admin이 아닌 경우 자신의 조직 데이터만 조회 (RLS가 처리하지만 가드 차원에서 명시적 eq 추가)
  if (profile?.role !== USER_ROLES.ADMIN && profile?.role !== USER_ROLES.ZENITH_SUPER_ADMIN) {
    query = query.eq("org_id", profile?.org_id);
  }

  // 2. 오더 ID 필터링
  const { data, error, count } = await query
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to fetch order QnA: ${error.message}`);

  const qnas = data.map((item: any) => ({
    ...item,
    order_no: item.order?.order_no,
    answer_count: item.answer_count?.[0]?.count || 0
  })) as QnaItem[];

  return { qnas, total: count || 0 };
}
