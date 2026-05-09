"use server";

import { validateUserAction, validateAdminAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/auth/rbac";

export type VocType = 'DELAY' | 'DAMAGE' | 'MISDELIVERY' | 'OTHER';
export type VocStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

export interface VocItem {
  id: string;
  order_id: string;
  order_no: string;
  org_id: string;
  type: VocType;
  title: string;
  description: string;
  status: VocStatus;
  answer_count: number;
  created_at: string;
  updated_at: string;
}

export interface VocAnswer {
  id: string;
  voc_id: string;
  answered_by: string;
  answered_by_name: string;
  content: string;
  created_at: string;
}

export interface VocDetail extends VocItem {
  answers: VocAnswer[];
}

/**
 * 14.1 createVoc (Action)
 * VOC를 등록하고 Admin에게 알림을 발송합니다.
 */
export async function createVoc(payload: any) {
  console.log("[DEBUG] createVoc called");
  console.log("[DEBUG] payload type:", typeof payload);
  console.log("[DEBUG] payload is null:", payload === null);
  console.log("[DEBUG] payload keys:", payload ? Object.keys(payload) : "none");
  console.log("[DEBUG] payload stringified:", JSON.stringify(payload));
  
  // If payload is FormData, extract fields
  let data = payload;
  if (payload instanceof FormData) {
    console.log("[DEBUG] payload is FormData");
    data = {
      order_id: payload.get("order_id") as string,
      type: payload.get("type") as VocType,
      title: payload.get("title") as string,
      description: payload.get("description") as string,
    };
  }

  console.log("[DEBUG] createVoc processed data:", data);
  
  // File based logging for E2E debugging
  const fs = require('fs');
  const logMsg = `[${new Date().toISOString()}] createVoc: order_id=${data.order_id}, type=${data.type}\n`;
  fs.appendFileSync('scratch/voc_action.log', logMsg);

  const { supabase, user, profile } = await validateUserAction();

  if (!profile) {
    fs.appendFileSync('scratch/voc_action.log', `[ERROR] No profile found for user ${user?.id}\n`);
    return { success: false, error: "User profile not found" };
  }

  // 1. 오더 소유권 확인
  console.log(`[DEBUG] Verifying order ownership: order_id=${data.order_id}, org_id=${profile.org_id}`);
  const { data: order, error: orderError } = await supabase
    .from("zen_orders")
    .select("order_no, shipper_id")
    .eq("id", data.order_id)
    .single();

  if (orderError) {
    console.error("[DEBUG] Order verification FAILED:", orderError);
    fs.appendFileSync('scratch/voc_action.log', `[ERROR] Order verification FAILED: ${JSON.stringify(orderError)}\n`);
    return { success: false, error: `Order verification failed: ${orderError.message}` };
  }
  
  if (!order) {
    console.error("[DEBUG] Order NOT FOUND");
    fs.appendFileSync('scratch/voc_action.log', `[ERROR] Order NOT FOUND: ${data.order_id}\n`);
    return { success: false, error: "Order not found" };
  }

  console.log(`[DEBUG] Order found: no=${order.order_no}, shipper_id=${order.shipper_id}`);
  
  if (order.shipper_id !== profile.org_id) {
    console.error(`[DEBUG] UNAUTHORIZED: order.shipper_id(${order.shipper_id}) !== profile.org_id(${profile.org_id})`);
    fs.appendFileSync('scratch/voc_action.log', `[ERROR] UNAUTHORIZED: ${order.shipper_id} !== ${profile.org_id}\n`);
    return { success: false, error: "UNAUTHORIZED: Access denied to this order" };
  }

  // 2. zen_voc INSERT
  console.log("[DEBUG] Inserting into zen_voc...");
  const vocData = {
    order_id: data.order_id,
    org_id: profile.org_id,
    created_by: user.id,
    type: data.type,
    title: data.title.substring(0, 100),
    description: data.description.substring(0, 2000),
    status: 'OPEN'
  };
  console.log("[DEBUG] VOC Insert data:", vocData);

  const { data: voc, error: vocError } = await supabase
    .from("zen_voc")
    .insert(vocData)
    .select()
    .single();

  if (vocError) {
    console.error("[DEBUG] VOC creation FAILED:", vocError);
    fs.appendFileSync('scratch/voc_action.log', `[ERROR] VOC creation FAILED: ${JSON.stringify(vocError)}\n`);
    return { success: false, error: `VOC creation failed: ${vocError.message}` };
  }

  console.log("[DEBUG] VOC creation SUCCESS:", voc);
  fs.appendFileSync('scratch/voc_action.log', `[SUCCESS] VOC created: ${voc.id}\n`);

  // 3. Admin 대상 알림 발송
  try {
    const { data: admins } = await supabase
      .from("zen_profiles")
      .select("id")
      .in("role", [USER_ROLES.ADMIN, USER_ROLES.ZENITH_SUPER_ADMIN, USER_ROLES.MANAGER]);

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        order_id: data.order_id,
        type: "VOC_CREATED",
        title: "신규 VOC 접수",
        message: `오더 ${order.order_no}에 대한 새로운 VOC(${data.type})가 접수되었습니다.`,
        channel: "IN_APP"
      }));
      await supabase.from("zen_notifications").insert(notifications);
    }
  } catch (notifError) {
    console.error("[ERROR] VOC Admin notification failed:", notifError);
  }

  revalidatePath('/voc', 'page');
  revalidatePath('/voc/admin', 'page');
  revalidatePath(`/orders/${data.order_id}`, 'page');

  return { success: true, vocId: voc.id };
}

/**
 * 14.2 getVocList (Action)
 * VOC 목록을 조회합니다. RLS에 의해 권한별 데이터 접근이 자동 제한됩니다.
 */
export async function getVocList({
  status,
  type,
  order_id,
  limit = 20,
  offset = 0
}: {
  status?: VocStatus;
  type?: VocType;
  order_id?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ success: boolean; error?: string; vocs: VocItem[]; total: number }> {
  const { supabase } = await validateUserAction();

  let query = supabase
    .from("zen_voc")
    .select(`
      *,
      order:zen_orders(order_no),
      answer_count:zen_voc_answers(count)
    `, { count: "exact" });

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);
  if (order_id) query = query.eq("order_id", order_id);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { success: false, error: error.message, vocs: [] as VocItem[], total: 0 };

  const vocs: VocItem[] = data.map((item: any) => ({
    ...item,
    order_no: item.order?.order_no,
    answer_count: item.answer_count?.[0]?.count || 0
  }));

  return { success: true, vocs, total: count || 0 };
}

/**
 * 14.3 getVocDetail (Action)
 * VOC 상세 정보와 답변 이력을 조회합니다.
 */
export async function getVocDetail(vocId: string): Promise<{ success: boolean; error?: string; data: VocDetail | null }> {
  const { supabase } = await validateUserAction();

  const { data: voc, error: vocError } = await supabase
    .from("zen_voc")
    .select(`
      *,
      order:zen_orders(order_no)
    `)
    .eq("id", vocId)
    .single();

  if (vocError || !voc) return { success: false, error: "VOC not found", data: null };

  const { data: answers, error: ansError } = await supabase
    .from("zen_voc_answers")
    .select(`
      *,
      profile:zen_profiles(full_name)
    `)
    .eq("voc_id", vocId)
    .order("created_at", { ascending: true });

  if (ansError) return { success: false, error: ansError.message, data: null };

  const data = {
    ...voc,
    order_no: voc.order?.order_no,
    answers: answers.map((ans: any) => ({
      ...ans,
      answered_by_name: ans.profile?.full_name || "Unknown Admin"
    }))
  };

  return { success: true, data };
}

/**
 * 14.4 answerVoc (Action)
 * VOC에 답변을 등록합니다. 최초 답변 시 상태를 IN_PROGRESS로 전환합니다.
 */
export async function answerVoc(payload: {
  vocId: string;
  content: string;
}) {
  const { supabase, user } = await validateAdminAction();

  // 1. 답변 등록
  const { data: answer, error: ansError } = await supabase
    .from("zen_voc_answers")
    .insert({
      voc_id: payload.vocId,
      answered_by: user.id,
      content: payload.content.substring(0, 2000)
    })
    .select()
    .single();

  if (ansError) return { success: false, error: `Answer failed: ${ansError.message}` };

  // 2. VOC 상태 확인 및 업데이트 (OPEN -> IN_PROGRESS)
  const { data: voc } = await supabase
    .from("zen_voc")
    .select("status, created_by, order_id")
    .eq("id", payload.vocId)
    .single();

  if (voc && voc.status === 'OPEN') {
    await supabase
      .from("zen_voc")
      .update({ status: 'IN_PROGRESS' })
      .eq("id", payload.vocId);
  }

  // 3. 고객 대상 알림 발송
  if (voc) {
    try {
      await supabase.from("zen_notifications").insert({
        user_id: voc.created_by,
        order_id: voc.order_id,
        type: "VOC_ANSWERED",
        title: "VOC 답변 등록",
        message: "문의하신 VOC에 대한 답변이 등록되었습니다.",
        channel: "IN_APP"
      });
    } catch (notifError) {
      console.error("[ERROR] VOC answer notification failed:", notifError);
    }
  }

  revalidatePath("/(dashboard)/voc", "page");
  revalidatePath("/(dashboard)/admin/voc", "page");

  return { success: true, answerId: answer.id };
}

/**
 * 14.5 updateVocStatus (Action)
 * VOC 상태를 직접 업데이트합니다 (주로 CLOSED 전환용).
 */
export async function updateVocStatus(vocId: string, status: VocStatus) {
  const { supabase } = await validateAdminAction();

  // 1. 상태 전이 검증 (CLOSED -> OPEN 불가)
  const { data: current } = await supabase
    .from("zen_voc")
    .select("status")
    .eq("id", vocId)
    .single();

  if (current?.status === 'CLOSED' && status !== 'CLOSED') {
    return { success: false, error: "INVALID_TRANSITION: CLOSED status cannot be reverted" };
  }

  const { error } = await supabase
    .from("zen_voc")
    .update({ status })
    .eq("id", vocId);

  if (error) return { success: false, error: `Status update failed: ${error.message}` };

  revalidatePath("/(dashboard)/voc", "page");
  revalidatePath("/(dashboard)/admin/voc", "page");

  return { success: true };
}
