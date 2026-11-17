'use server';

import { logger } from '@/lib/logger';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { USER_ROLES } from '@/lib/auth/rbac';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';

async function getClientIp() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return headerStore.get('x-real-ip') || '127.0.0.1';
}

/**
 * TASK-B-356 (Issue #1334): Supabase 인증 오류를 로케일 문장으로 변환한다.
 * 보안: "Invalid login credentials"는 계정 존재 여부를 구분하지 않는 단일 문구로 수렴시키고,
 * 기존에 구분되던 사유(이메일 미인증·이미 가입됨·비밀번호 정책·레이트리밋)는 구분 수준을 유지한다.
 */
async function resolveAuthError(
  message: string | undefined,
  locale: string,
  context: 'login' | 'signup',
): Promise<string> {
  const t = await getTranslations({ locale, namespace: 'Errors' });
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) return t('auth_invalid_credentials');
  if (m.includes('email not confirmed')) return t('auth_email_not_confirmed');
  if (m.includes('already registered') || m.includes('already been registered')) return t('auth_account_exists');
  if (m.includes('password')) return t('auth_password_invalid');
  if (m.includes('rate limit') || m.includes('too many')) return t('auth_rate_limited');
  return context === 'login' ? t('auth_unexpected') : t('auth_signup_failed');
}

// DEF-B-039 (Issue #1026): 신규 조직 생성 가입자의 org_type → role 명시적 매핑.
// ADMIN/CARRIER 전용 분기 제거 — ADMIN 폴백은 절대 금지.
// 미매핑/누락 org_type은 안전 기본값 CORPORATE로 폴백.
const ORG_TYPE_TO_ROLE: Record<string, string> = {
  CARRIER: USER_ROLES.CARRIER,
  AGENCY: USER_ROLES.AGENCY,
  SHIPPER: USER_ROLES.SHIPPER,
  CORPORATE: USER_ROLES.CORPORATE,
  CUSTOMS: USER_ROLES.CUSTOMS_BROKER,
  DELIVERY: USER_ROLES.DELIVERY_AGENT,
};

async function verifyDbRateLimit(action: string, maxRequests: number, windowSeconds: number) {
  const ip = await getClientIp();
  const key = `${ip}:${action}`;
  
  try {
    const adminClient = await createAdminClient();
    const { data, error } = await adminClient.rpc('check_rate_limit', {
      p_key: key,
      p_window_size_seconds: windowSeconds,
      p_max_requests: maxRequests
    });

    if (error) {
      logger.error(`[RATE_LIMIT_DB] RPC Error for ${key}:`, error);
      return { allowed: true, retryAfter: 0 };
    }

    return {
      allowed: data.allowed as boolean,
      retryAfter: data.retry_after as number
    };
  } catch (e) {
    logger.error(`[RATE_LIMIT_DB] Unexpected Error for ${key}:`, e);
    return { allowed: true, retryAfter: 0 };
  }
}




export async function login(formData: FormData) {
  logger.info('[ACTION] login START');
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const locale = formData.get('locale') as string || 'ko';

  // 1. Rate Limiting Check (Max 10 requests per minute)
  const rateLimit = await verifyDbRateLimit('login', 10, 60);
  if (!rateLimit.allowed) {
    logger.warn(`[RATE_LIMIT] Login blocked for IP: ${await getClientIp()}`);
    const t = await getTranslations({ locale, namespace: 'Auth' });
    return { error: t('rate_limit_exceeded', { seconds: String(rateLimit.retryAfter) }) };
  }

  const supabase = await createClient();
  logger.info('[ACTION] login INPUT:', { email, locale });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('[ACTION] login AUTH ERROR:', error.message);
      return { error: await resolveAuthError(error.message, locale, 'login') };
    }

    logger.info('[ACTION] login AUTH SUCCESS:', data.user?.id);

    // Clear stale zen_last_activity cookie — prevents immediate timeout after login
    // (old cookie from previous session with timestamp exceeding SESSION_IDLE_TIMEOUT_MIN)
    (await cookies()).delete('zen_last_activity');

    // Redirect to orders as the primary dashboard view with locale prefix
    revalidatePath('/', 'layout');
    logger.info('[ACTION] login REDIRECTING to:', `/${locale}/orders`);
    
    // Using redirect inside try-catch is tricky in Next.js.
    // It's better to return success and let the client handle redirect, 
    // or call redirect outside the try-catch.
  } catch (e: any) {
    if (e.message?.includes('NEXT_REDIRECT')) {
      throw e; 
    }
    logger.error('[ACTION] login UNEXPECTED ERROR:', e);
    return { error: await resolveAuthError(undefined, locale, 'login') };
  }
  
  // Call redirect outside try-catch
  const formDataLocale = formData.get('locale') as string || 'ko';
  redirect(`/${formDataLocale}/orders`);
}

export async function signup(formData: FormData, locale: string = 'ko') {
  // 1. Rate Limiting Check (Max 10 requests per minute)
  const rateLimit = await verifyDbRateLimit('signup', 10, 60);
  if (!rateLimit.allowed) {
    logger.warn(`[RATE_LIMIT] Signup blocked for IP: ${await getClientIp()}`);
    const t = await getTranslations({ locale, namespace: 'Auth' });
    return { error: t('rate_limit_exceeded', { seconds: String(rateLimit.retryAfter) }) };
  }

  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;
  const orgId = formData.get('org_id') as string | null;
  const isNewOrg = formData.get('is_new_org') === 'true';
  const orgName = formData.get('org_name') as string | null;
  const businessNumber = formData.get('business_number') as string | null;
  const phoneNumber = formData.get('phone_number') as string | null;

  logger.info('[SIGNUP_ACTION] Received signup request:', { email, fullName, isNewOrg, orgName });
  
  // Master Edward's Policy: Personal accounts are assigned 'SHIPPER' by default.
  let orgType = formData.get('org_type') as string | null;
  if (!orgType && !isNewOrg && !orgId) {
    orgType = 'SHIPPER';
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        org_id: orgId,
        is_new_org: isNewOrg,
        org_name: orgName,
        business_number: businessNumber,
        org_type: orgType,
        phone_number: phoneNumber,
        // Individual users are ACTIVE immediately; Corporate/New Org users are PENDING.
        status: (orgId === null && !isNewOrg) ? 'ACTIVE' : 'PENDING',
        // New Org creators: org_type → role 명시적 매핑(DEF-B-039). 알 수 없는 org_type은 CORPORATE 안전 폴백.
        // Joinees → USER; Individuals → INDIVIDUAL. ADMIN 자동 부여 절대 금지.
        role: isNewOrg
          ? (ORG_TYPE_TO_ROLE[orgType ?? ''] ?? USER_ROLES.CORPORATE)
          : (orgId === null ? USER_ROLES.INDIVIDUAL : USER_ROLES.USER),
      }
    }
  });

  if (error) {
    logger.error('[SIGNUP_ACTION] AUTH ERROR:', error.message);
    return { error: await resolveAuthError(error.message, locale, 'signup') };
  }

  // 회원가입 성공 시 확인 메일 발송 (non-fatal)
  try {
    const { sendSignupWelcomeEmail } = await import('@/lib/notifications/email');
    await sendSignupWelcomeEmail({ email, password, fullName });
  } catch (emailError) {
    logger.error('[SIGNUP_ACTION] Welcome email failed (non-fatal):', emailError);
  }

  // IMP-088: 개인정보 활용동의 시각 저장
  const privacyConsentAt = formData.get('privacy_consent_at') as string | null;
  const termsConsentAt = formData.get('terms_consent_at') as string | null;
  if ((privacyConsentAt || termsConsentAt) && data?.user) {
    const supabaseAdmin = await createAdminClient();
    await supabaseAdmin
      .from('zen_profiles')
      .update({
        privacy_consent_at: privacyConsentAt,
        terms_consent_at: termsConsentAt,
        phone_number: phoneNumber,
      })
      .eq('id', data.user.id);
  }

  // Handle Document Upload if present
  const docFile = formData.get('doc_file') as File | null;
  if (docFile && data?.user) {
    const adminClient = await createAdminClient();

    // on_auth_user_created DB Trigger가 signUp 내에서 동기적으로 zen_profiles를 생성하므로
    // setTimeout 대기 없이 바로 조회 가능 (Race Condition 근본 해결 — IMP-068)
    const { data: profile, error: profileError } = await adminClient
      .from('zen_profiles')
      .select('org_id')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile?.org_id) {
      logger.error('[SIGNUP_ACTION] Profile not found after signup:', profileError);
      {
        const t = await getTranslations({ locale, namespace: 'Errors' });
        return { error: t('auth_signup_profile_failed') };
      }
    }

    const fileExt = docFile.name.split('.').pop();
    const filePath = `${profile.org_id}/${Date.now()}_${docFile.name}`;

    const { error: uploadError } = await adminClient.storage
      .from('business_docs')
      .upload(filePath, docFile, {
        contentType: docFile.type,
        upsert: false
      });

    if (!uploadError) {
      await adminClient
        .from('zen_organization_documents')
        .insert({
          org_id: profile.org_id,
          doc_type: 'BIZ_REG',
          file_path: filePath,
          status: 'PENDING'
        });
    } else {
      logger.error('Upload Error:', uploadError);
    }
  }

  return { success: true };
}
