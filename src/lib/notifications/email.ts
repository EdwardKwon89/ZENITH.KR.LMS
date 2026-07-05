import { logger } from '@/lib/logger';
import { Resend } from "resend";
import { OrderStatus } from "@/types/orders";
import { escapeHtml } from "@/lib/utils/escape-html";
import crypto from 'crypto';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM = "ZENITH LMS <noreply@zenith-lms.com>";

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

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

  if (!resend) {
    logger.warn(`[NOTIF] Resend API Key is missing. Skipping email for order ${orderNo} (Status: ${label})`);
    return;
  }

  const subject = `[ZENITH] 오더 ${escapeHtml(orderNo)} 상태 변경: ${label}`;
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#1e293b">오더 상태가 변경되었습니다</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;color:#64748b">오더 번호</td><td style="padding:8px;font-weight:bold">${escapeHtml(orderNo)}</td></tr>
        <tr><td style="padding:8px;color:#64748b">변경 상태</td><td style="padding:8px;font-weight:bold;color:#0ea5e9">${escapeHtml(label)}</td></tr>
      </table>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">본 메일은 ZENITH LMS에서 자동 발송된 알림입니다.</p>
    </div>
  `;

  await resend.emails.send({ from: FROM, to: target.email, subject, html });
}

export async function sendShipperWelcomeEmail(params: {
  email: string;
  shipperName: string;
  tempPassword: string;
  agencyContactEmail?: string;
}): Promise<void> {
  if (!resend) {
    logger.warn(`[NOTIF] Resend API Key is missing. Skipping welcome email for ${params.email}`);
    return;
  }

  const subject = '[ZENITH LMS] 화주 계정이 등록되었습니다 — 초기 로그인 정보 안내';
  const loginUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/ko/login`
    : '/ko/login';

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#1e293b">화주 계정이 등록되었습니다</h2>
      <p style="color:#475569">안녕하세요, ${escapeHtml(params.shipperName)}님</p>
      <p style="color:#475569">ZENITH LMS 화주 계정이 등록되었습니다. 아래 정보로 로그인해주세요.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#64748b">로그인 ID</td><td style="padding:8px;font-weight:bold">${escapeHtml(params.email)}</td></tr>
        <tr><td style="padding:8px;color:#64748b">임시 비밀번호</td><td style="padding:8px;font-weight:bold;font-family:monospace">${escapeHtml(params.tempPassword)}</td></tr>
        <tr><td style="padding:8px;color:#64748b">로그인 URL</td><td style="padding:8px"><a href="${loginUrl}" style="color:#0ea5e9">${loginUrl}</a></td></tr>
      </table>
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px;margin:16px 0">
        <p style="color:#92400e;margin:0;font-size:13px">
          <strong>🔒 보안 안내</strong><br>
          로그인 후 반드시 비밀번호를 변경해주세요.<br>
          임시 비밀번호는 타인과 공유하지 마세요.
        </p>
      </div>
      ${params.agencyContactEmail ? `
        <p style="color:#94a3b8;font-size:12px">
          문의처: ${escapeHtml(params.agencyContactEmail)}
        </p>
      ` : ''}
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">본 메일은 ZENITH LMS에서 자동 발송된 알림입니다.</p>
    </div>
  `;

  await resend.emails.send({ from: FROM, to: params.email, subject, html });
}
