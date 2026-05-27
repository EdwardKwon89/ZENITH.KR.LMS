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
      return { error: error.message };
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
    return { error: 'An unexpected error occurred during login.' };
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
        // New Org creators are ADMIN; Joinees are MEMBER; Individuals are USER.
        role: isNewOrg ? USER_ROLES.ADMIN : (orgId === null ? USER_ROLES.INDIVIDUAL : USER_ROLES.USER),
      }
    }
  });

  if (error) {
    return { error: error.message };
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
      console.error('[SIGNUP_ACTION] Profile not found after signup:', profileError);
      return { error: 'Profile creation failed. Please try again.' };
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
