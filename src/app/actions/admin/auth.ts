'use server';

import { logger } from '@/lib/logger';
import { createClient } from '@/utils/supabase/server';
import { validateUserAction } from '@/lib/auth/guards';
import { AdminRepository } from '@/lib/repositories';
import { revalidatePath } from 'next/cache';

/**
 * 개인 회원 ID(이메일) 찾기 — 이름으로 조회
 * 마스킹된 E-Mail + 마스킹된 전화번호를 반환합니다.
 */
export async function findPersonalId(fullName: string) {
  const supabase = await createClient();

  try {
    const adminRepo = new AdminRepository(supabase);
    const { data, error } = await adminRepo.findProfilesByName(fullName);

    if (error) {
      logger.error('[AUTH_ACTION] findPersonalId Error:', error);
      return { error: '데이터 조회 중 오류가 발생했습니다.' };
    }

    if (!data) {
      return { error: '일치하는 회원 정보를 찾을 수 없습니다.' };
    }

    const [user, domain] = data.email.split('@');
    const maskedUser = user.substring(0, 2) + '*'.repeat(Math.max(0, user.length - 2));
    const maskedEmail = `${maskedUser}@${domain}`;

    let maskedPhone: string | null = null;
    if (data.phone_number) {
      const phone = data.phone_number.replace(/-/g, '');
      if (phone.length >= 8) {
        maskedPhone = phone.substring(0, 3) + '-****-' + phone.substring(phone.length - 4);
      }
    }

    return { success: true, maskedEmail, maskedPhone };
  } catch (err) {
    return { error: '서버 내부 오류가 발생했습니다.' };
  }
}

/**
 * 법인 담당자 ID(이메일) 찾기 — 법인명 + 사업자번호로 조회
 * 담당자 마스킹 E-Mail을 반환합니다.
 */
export async function findCorporateId(orgName: string, regNo: string) {
  const supabase = await createClient();

  try {
    const adminRepo = new AdminRepository(supabase);
    const { data, error } = await adminRepo.findCorporateAdminEmail(orgName, regNo);

    if (error) {
      logger.error('[AUTH_ACTION] findCorporateId Error:', error);
      return { error: '데이터 조회 중 오류가 발생했습니다.' };
    }

    if (!data?.zen_profiles) {
      return { error: '일치하는 법인 정보를 찾을 수 없습니다.' };
    }

    const email = Array.isArray(data.zen_profiles)
      ? data.zen_profiles[0]?.email
      : data.zen_profiles.email;

    if (!email) {
      return { error: '법인 담당자 정보를 찾을 수 없습니다.' };
    }

    const [user, domain] = email.split('@');
    const maskedUser = user.substring(0, 2) + '*'.repeat(Math.max(0, user.length - 2));
    const maskedEmail = `${maskedUser}@${domain}`;

    return { success: true, maskedEmail };
  } catch (err) {
    return { error: '서버 내부 오류가 발생했습니다.' };
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
      logger.error('[AUTH_ACTION] sendPasswordReset Error:', error.message);
      return { error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { error: '비밀번호 재설정 요청 중 오류가 발생했습니다.' };
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
      logger.error('[AUTH_ACTION] changePassword Error:', error.message);
      return { error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { error: '비밀번호 변경 중 오류가 발생했습니다.' };
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
