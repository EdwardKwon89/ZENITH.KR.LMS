import { Resend } from "resend";
import { OrderStatus } from "@/types/orders";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "ZENITH LMS <noreply@zenith-lms.com>";

const STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.WAREHOUSED]: "입고 완료",
  [OrderStatus.RELEASED]:   "출고 완료",
  [OrderStatus.IN_TRANSIT]: "운송 중",
  [OrderStatus.DELIVERED]:  "배송 완료",
  [OrderStatus.HELD]:       "보류",
};

export interface NotificationTarget {
  email: string;
  name?: string;
}

export async function sendStatusChangeEmail(
  target: NotificationTarget,
  orderNo: string,
  newStatus: OrderStatus
): Promise<void> {
  const label = STATUS_LABELS[newStatus];
  if (!label || !target.email) return;

  const subject = `[ZENITH] 오더 ${orderNo} 상태 변경: ${label}`;
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#1e293b">오더 상태가 변경되었습니다</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;color:#64748b">오더 번호</td><td style="padding:8px;font-weight:bold">${orderNo}</td></tr>
        <tr><td style="padding:8px;color:#64748b">변경 상태</td><td style="padding:8px;font-weight:bold;color:#0ea5e9">${label}</td></tr>
      </table>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">본 메일은 ZENITH LMS에서 자동 발송된 알림입니다.</p>
    </div>
  `;

  await resend.emails.send({ from: FROM, to: target.email, subject, html });
}
