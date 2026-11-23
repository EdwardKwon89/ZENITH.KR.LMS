'use server';

import { logger } from '@/lib/logger';
import { trError } from '@/lib/i18n/action-error';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { validateUserAction } from '@/lib/auth/guards';
import { AdminRepository } from '@/lib/repositories';
import { revalidatePath } from 'next/cache';

/**
 * 개인 회원 ID(이메일) 찾기 — 이름으로 조회
 * 마스킹된 E-Mail + 마스킹된 전화번호를 반환합니다.
 */
export async function findPersonalId(fullName: string) {
  const supabase = await createAdminClient();

  try {
    const adminRepo = new AdminRepository(supabase);
    const { data: profiles, error } = await adminRepo.findProfilesByName(fullName);

    if (error) {
      logger.error('[AUTH_ACTION] findPersonalId Error:', error);
      return { error: await trError('fetch_failed') };
    }

    if (!profiles || profiles.length === 0) {
      return { error: await trError('find_member_not_found') };
    }

    const results = (profiles as any[]).map((p: { email: string; phone_number?: string | null }) => {
      const [user, domain] = p.email.split('@');
      const maskedUser = user.length <= 3
        ? user.substring(0, 1) + '*'.repeat(user.length - 1)
        : user.substring(0, 2) + '*'.repeat(Math.max(0, user.length - 4)) + user.substring(user.length - 2);
      const maskedEmail = `${maskedUser}@${domain}`;

      let maskedPhone: string | null = null;
      if (p.phone_number) {
        const phone = p.phone_number.replace(/-/g, '');
        if (phone.length >= 8) {
          maskedPhone = phone.substring(0, 3) + '-****-' + phone.substring(phone.length - 4);
        }
      }

      return { email: maskedEmail, phone: maskedPhone ?? undefined };
    });

    return { success: true, results };
  } catch (err) {
    logger.error('[AUTH_ACTION] findPersonalId catch:', err);
    return { error: await trError('internal_error') };
  }
}

/**
 * 법인 담당자 ID(이메일) 찾기 — 법인명 + 사업자번호로 조회
 * 담당자 마스킹 E-Mail을 반환합니다.
 */
export async function findCorporateId(orgName: string, regNo: string) {
  const supabase = await createAdminClient();

  try {
    const adminRepo = new AdminRepository(supabase);

    const { data: org, error: orgError } = await adminRepo.findCorporateAdminEmail(orgName, regNo);
    if (orgError || !org?.id) {
      logger.error('[AUTH_ACTION] findCorporateId Org Error:', orgError);
      return { error: await trError('find_corp_not_found') };
    }

    const { data: profile, error: profileError } = await adminRepo.findAdminByOrgId(org.id);
    if (profileError || !profile?.email) {
      logger.error('[AUTH_ACTION] findCorporateId Profile Error:', profileError);
      return { error: await trError('find_corp_admin_not_found') };
    }

    const [user, domain] = profile.email.split('@');
    const maskedUser = user.length <= 3
      ? user.substring(0, 1) + '*'.repeat(user.length - 1)
      : user.substring(0, 2) + '*'.repeat(Math.max(0, user.length - 4)) + user.substring(user.length - 2);
    const maskedEmail = `${maskedUser}@${domain}`;

    return { success: true, maskedEmail };
  } catch (err) {
    logger.error('[AUTH_ACTION] findCorporateId catch:', err);
    return { error: await trError('internal_error') };
  }
}

/**
 * [AUDIT-S1-C] 비밀번호 재설정 이메일 발송
 */
export async function sendPasswordReset(email: string, locale: string = 'ko') {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/${locale}/confirm?type=recovery`,
    });

    if (error) {
      logger.error('[AUTH_ACTION] sendPasswordReset Error:', error);
      return { error: await trError('generic', { code: 'PASSWORD_RESET' }) };
    }

    return { success: true };
  } catch (err) {
    logger.error('[AUTH_ACTION] sendPasswordReset catch:', err);
    return { error: await trError('password_reset_failed') };
  }
}

/**
 * [AUDIT-S1-E] 로그인 상태에서 비밀번호 변경
 */
export async function changePassword(password: string) {
  try {
    const { supabase } = await validateUserAction();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      logger.error('[AUTH_ACTION] changePassword Error:', error);
      return { error: await trError('generic', { code: 'PASSWORD_UPDATE' }) };
    }

    return { success: true };
  } catch (err) {
    logger.error('[AUTH_ACTION] changePassword catch:', err);
    return { error: await trError('password_change_failed') };
  }
}

/**
 * [AUDIT-S1-E] 현재 비밀번호 재인증 후 비밀번호 변경
 */
export async function changePasswordWithReauth(currentPassword: string, newPassword: string) {
  try {
    const { supabase, user } = await validateUserAction();
    if (!user?.email) {
      return { error: await trError('email_not_available') };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) {
      logger.error('[AUTH_ACTION] reauth Error:', signInError);
      return { error: await trError('current_password_incorrect') };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      logger.error('[AUTH_ACTION] changePassword Error:', error);
      return { error: await trError('generic', { code: 'PASSWORD_UPDATE' }) };
    }

    return { success: true };
  } catch (err) {
    logger.error('[AUTH_ACTION] changePasswordWithReauth catch:', err);
    return { error: await trError('password_change_failed') };
  }
}

/**
 * [BASE] 사용자 세션 및 프로필 조회
 */
export async function getUserSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminRepo = new AdminRepository(supabase);
  const { data: profile } = await adminRepo.findProfileById(user.id);

  return { user, profile };
}
