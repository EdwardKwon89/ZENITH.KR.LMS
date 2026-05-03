"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { OrderStatus } from "@/types/orders";
import { sendStatusChangeEmail } from "@/lib/notifications/email";
import { revalidatePath } from "next/cache";

type NotificationTriggerStatus = Extract<
  OrderStatus,
  | OrderStatus.WAREHOUSED
  | OrderStatus.RELEASED
  | OrderStatus.IN_TRANSIT
  | OrderStatus.DELIVERED
  | OrderStatus.HELD
>;

const TRIGGER_STATUSES: Set<OrderStatus> = new Set([
  OrderStatus.WAREHOUSED,
  OrderStatus.RELEASED,
  OrderStatus.IN_TRANSIT,
  OrderStatus.DELIVERED,
  OrderStatus.HELD,
]);

const STATUS_TITLES: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.WAREHOUSED]: "입고 완료",
  [OrderStatus.RELEASED]:   "출고 완료",
  [OrderStatus.IN_TRANSIT]: "운송 중",
  [OrderStatus.DELIVERED]:  "배송 완료",
  [OrderStatus.HELD]:       "보류 처리",
};

interface OrderBasicData {
  order_no: string;
  shipper_id: string;
  recipient_email?: string;
}

export async function triggerStatusChangeNotification(
  orderId: string,
  newStatus: OrderStatus,
  providedSupabase?: any
): Promise<void> {
  if (!TRIGGER_STATUSES.has(newStatus)) return;

  const supabase = providedSupabase || await createServerClient();

  // 1. 오더 기본 정보 조회 (shipper_id = zen_organizations.id)
  const { data: order, error } = await supabase
    .from("zen_orders")
    .select("order_no, shipper_id, recipient_email")
    .eq("id", orderId)
    .single<OrderBasicData>();

  if (error || !order) {
    console.error("[NOTIF] Failed to fetch order for notification:", error);
    return;
  }

  const title   = STATUS_TITLES[newStatus] ?? "상태 변경";
  const message = `오더 ${order.order_no}의 상태가 '${title}'(으)로 변경되었습니다.`;

  // 수신자 목록 구성
  const targets: { userId: string; email?: string }[] = [];

  // 송하인 org 소속 사용자 조회 (profiles.org_id = zen_orders.shipper_id)
  if ([OrderStatus.WAREHOUSED, OrderStatus.RELEASED, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED, OrderStatus.HELD].includes(newStatus)) {
    const { data: shipperUsers } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("org_id", order.shipper_id);

    for (const u of shipperUsers ?? []) {
      targets.push({ userId: u.id, email: u.email ?? undefined });
    }
  }

  // 수하인: IN_TRANSIT, DELIVERED
  if ([OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED].includes(newStatus) && order.recipient_email) {
    // 수하인은 profiles 미등록일 수 있으므로 이메일만 발송
    try {
      await sendStatusChangeEmail({ email: order.recipient_email }, order.order_no, newStatus);
    } catch (e) {
      console.error("[NOTIF] Recipient email failed:", e);
    }
  }

  // 송하인 IN_APP + EMAIL 처리
  for (const target of targets) {
    // IN_APP 알림 저장
    const { error: insertError } = await supabase.from("zen_notifications").insert({
      user_id:  target.userId,
      order_id: orderId,
      type:     newStatus === OrderStatus.HELD ? "HELD" : newStatus === OrderStatus.DELIVERED ? "DELIVERED" : "STATUS_CHANGE",
      title,
      message,
      channel:  "IN_APP",
    });

    if (insertError) {
      console.error("[NOTIF] IN_APP insert failed:", insertError);
    }

    // EMAIL 발송
    if (target.email) {
      try {
        await sendStatusChangeEmail({ email: target.email }, order.order_no, newStatus);
        // EMAIL 이력도 별도 저장
        await supabase.from("zen_notifications").insert({
          user_id:  target.userId,
          order_id: orderId,
          type:     "STATUS_CHANGE",
          title,
          message,
          channel:  "EMAIL",
        });
      } catch (e) {
        console.error("[NOTIF] Email send failed:", e);
      }
    }
  }
}

export async function getNotifications(limit = 20, offset = 0) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notifications: [], unreadCount: 0 };

  const [{ data: notifications }, { count }] = await Promise.all([
    supabase
      .from("zen_notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("channel", "IN_APP")
      .order("is_read", { ascending: true })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from("zen_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("channel", "IN_APP")
      .eq("is_read", false),
  ]);

  return {
    notifications: notifications ?? [],
    unreadCount:   count ?? 0,
  };
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("zen_notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) return { success: false };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function markAllNotificationsRead() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, updatedCount: 0 };

  const { data, error } = await supabase
    .from("zen_notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("channel", "IN_APP")
    .eq("is_read", false)
    .select("id");

  if (error) return { success: false, updatedCount: 0 };
  revalidatePath("/", "layout");
  return { success: true, updatedCount: data?.length ?? 0 };
}

/**
 * 범용 인앱 알림 발송 함수
 */
export async function sendInAppNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: string;
  orderId?: string;
  link?: string;
}) {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("zen_notifications")
    .insert({
      user_id: params.userId,
      order_id: params.orderId,
      type: params.type,
      title: params.title,
      message: params.message,
      channel: "IN_APP",
      // link는 현재 스키마에 없으므로 message에 포함하거나 추후 스키마 확장 필요
      // 일단은 데이터 일관성을 위해 스키마에 정의된 필드만 입력
    })
    .select()
    .single();

  if (error) {
    console.error("[NOTIF] sendInAppNotification failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true, notificationId: data.id };
}
