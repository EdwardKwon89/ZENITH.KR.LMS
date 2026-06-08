import { cache } from 'react';
import { logger } from '@/lib/logger';
import { type NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/params/feature-flags';
import { USER_ROLES } from '@/lib/auth/rbac';
import { ORG_ROUTE_MAP, DEFAULT_REDIRECTS } from '@/config/routes';
import { routing } from '@/i18n/routing';

const getProfileCached = cache(async (supabase: SupabaseClient, userId: string) => {
  return supabase
    .from('zen_profiles')
    .select(`status, org_id, role`)
    .eq('id', userId)
    .single();
});

export interface ProxyDecision {
  response: NextResponse;
  redirectUrl?: string;
}

function pathInfo(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const maybeLocale = segments[0];
  const isLocaleExist = routing.locales.includes(maybeLocale as any);
  const locale = isLocaleExist ? maybeLocale : routing.defaultLocale;
  const purePath = '/' + (isLocaleExist ? segments.slice(1) : segments).join('/');
  return { locale, purePath };
}

function mergeHeaders(targetResponse: NextResponse, sourceResponse: NextResponse) {
  sourceResponse.headers.getSetCookie().forEach((cookie) => {
    targetResponse.headers.append('Set-Cookie', cookie);
  });
  return targetResponse;
}

export async function authGuard(
  request: NextRequest,
  supabaseResponse: NextResponse,
  supabase: SupabaseClient,
  user: User | null
): Promise<ProxyDecision | null> {
  const pathname = request.nextUrl.pathname;
  const { locale, purePath } = pathInfo(pathname);

  const isAuthPage = purePath.startsWith('/login') || purePath.startsWith('/register') ||
                     purePath.startsWith('/find-id') || purePath.startsWith('/reset-password');
  const isApi = purePath.startsWith('/api');

  if (isApi) return null;

  const isSuspendedPage = purePath.startsWith('/suspended');

  if (!user && !isAuthPage && purePath !== '/' && !isSuspendedPage) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${DEFAULT_REDIRECTS.UNAUTHENTICATED}`;
    return { response: mergeHeaders(NextResponse.redirect(url), supabaseResponse), redirectUrl: url.pathname };
  }

  if (user) {
    const isMaintenanceMode = await isFeatureEnabled('MAINTENANCE_MODE');
    const isPlatformUser = 
      user?.app_metadata?.role === USER_ROLES.ZENITH_SUPER_ADMIN || 
      (user?.app_metadata?.role === USER_ROLES.ADMIN && user?.app_metadata?.org_type === 'PLATFORM');

    if (isMaintenanceMode && !isPlatformUser && !isAuthPage && purePath !== '/' && purePath !== '/maintenance') {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/maintenance`;
      return { response: mergeHeaders(NextResponse.redirect(url), supabaseResponse), redirectUrl: url.pathname };
    }
  }

  if (user && !isApi) {
    const now = Date.now();

    // --- IMP-071: 세션 Idle Timeout ---
    // (Server Action POST는 제외 — 서버액션 내부 validateUserAction()이 세션 검증)
    // 단, zen_last_activity 갱신은 서버 액션도 포함해야 함. 갱신이 없으면
    // 서버 액션 후 router.push() GET 요청에서 stale cookie → 로그아웃됨.
    const isServerAction = request.method === 'POST' && request.headers.has('next-action');
    if (!isAuthPage && purePath !== '/' && !isServerAction) {
      const SESSION_IDLE_TIMEOUT_MIN = parseInt(process.env.SESSION_IDLE_TIMEOUT_MIN || '30', 10);
      const lastActivity = request.cookies.get('zen_last_activity')?.value;

      if (lastActivity) {
        const elapsed = now - parseInt(lastActivity, 10);
        if (elapsed > SESSION_IDLE_TIMEOUT_MIN * 60 * 1000) {
          await supabase.auth.signOut();
          const url = request.nextUrl.clone();
          url.pathname = `/${locale}/login`;
          url.searchParams.set('reason', 'timeout');
          const response = NextResponse.redirect(url);
          response.cookies.delete('zen_last_activity');
          // signOut() recreates supabaseResponse via setAll closure, but authGuard
          // still holds the OLD reference with valid session cookies. Merging that
          // would RE-SET the session, nullifying the signOut. Skip merge here.
          return { response, redirectUrl: url.pathname };
        }
      }
    }

    // 서버 액션 포함 모든 인증 요청에 zen_last_activity 갱신
    if (!isAuthPage && purePath !== '/') {
      supabaseResponse.cookies.set('zen_last_activity', String(now), {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
    }

    const metadataRole = user.app_metadata?.role as string | undefined;
    const metadataOrgType = user.app_metadata?.org_type as string | undefined;
    
    let orgType: string;
    if (metadataOrgType) {
      orgType = metadataOrgType;
    } else {
      const isMetadataPlatformAdmin = metadataRole === USER_ROLES.ADMIN || metadataRole === USER_ROLES.ZENITH_SUPER_ADMIN;
      orgType = isMetadataPlatformAdmin ? 'PLATFORM' : 'GUEST';
    }
    
    let userStatus = (user.app_metadata?.status as string) || 'PENDING';

    // metadata 누락 세션 fallback: app_metadata 갱신 hook 미적용 레거시 세션
    const hasCompleteMetadata = !!(user.app_metadata?.role && user.app_metadata?.org_type && user.app_metadata?.status);

    if (!hasCompleteMetadata) {
      try {
        const { data: profile } = await getProfileCached(supabase, user.id);

        if (profile) {
          userStatus = profile.status || userStatus;
          
          let dbOrgType: string | undefined;
          if (profile.org_id) {
            const { data: org } = await supabase
              .from('zen_organizations')
              .select('type')
              .eq('id', profile.org_id)
              .single();
            dbOrgType = org?.type;
          }

          if ([USER_ROLES.ZENITH_SUPER_ADMIN, USER_ROLES.ADMIN].includes((profile as any).role)) {
            orgType = 'PLATFORM';
          } else if (dbOrgType) {
            orgType = dbOrgType;
          } else if (!profile.org_id && userStatus === 'ACTIVE') {
            orgType = 'SHIPPER';
          }
        }
      } catch (e) {
        logger.warn(`[AUTH PROXY] DB fallback:`, e);
        if (metadataRole === USER_ROLES.ADMIN || metadataRole === USER_ROLES.ZENITH_SUPER_ADMIN) orgType = 'PLATFORM';
      }
    }

    const allowedRoot = ORG_ROUTE_MAP[orgType as keyof typeof ORG_ROUTE_MAP] || '/';

    if (userStatus === 'PENDING' || userStatus === 'SUPPLEMENT_REQUIRED') {
      const pendingPath = DEFAULT_REDIRECTS.PENDING;
      if (purePath !== pendingPath && !isAuthPage && !purePath.startsWith('/orders') && !purePath.startsWith('/dashboard')) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}${pendingPath}`;
        return { response: mergeHeaders(NextResponse.redirect(url), supabaseResponse), redirectUrl: url.pathname };
      }
    }

    // --- IMP-072: SUSPENDED 계정 처리 ---
    if (userStatus === 'SUSPENDED') {
      if (!isSuspendedPage && !isAuthPage && purePath !== '/') {
        // 세션 종료 + 쿠키 소거 후 안내 페이지로 (루프 방지)
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/suspended`;
        url.searchParams.set('reason', 'suspended');
        const response = NextResponse.redirect(url);
        response.cookies.delete('zen_last_activity');
        return { response, redirectUrl: url.pathname };
      }
      // SUSPENDED 유저가 whitelist 경로(/suspended)에 있을 때
      // authGuard를 건너뛰어 무한루프 방지
      return null;
    }

    if (orgType !== 'PLATFORM') {
      const isAllowedPath =
        purePath === '/' ||
        purePath.startsWith(allowedRoot) ||
        isAuthPage ||
        purePath.startsWith('/orders') ||
        purePath.startsWith('/tracking') ||
        purePath.startsWith('/mypage') ||
        purePath.startsWith('/support') ||
        purePath.startsWith('/inventory') ||
        purePath.startsWith('/admin/rates') ||
        purePath.startsWith('/admin/transport-costs') ||
        purePath.startsWith('/admin/customs-rates') ||
        purePath.startsWith('/admin/delivery-rates');

      if (!isAllowedPath) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}${allowedRoot}`;
        return { response: mergeHeaders(NextResponse.redirect(url), supabaseResponse), redirectUrl: url.pathname };
      }
    }
  }

  return null;
}
