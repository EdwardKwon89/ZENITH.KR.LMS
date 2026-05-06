import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/utils/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { ORG_ROUTE_MAP, DEFAULT_REDIRECTS } from '@/config/routes';
import { createClient } from '@/utils/supabase/server';
import { isFeatureEnabled } from '@/lib/params/feature-flags';

const handleI18nRouting = createMiddleware(routing);

/**
 * 🛠️ [Header Integrity]
 * 쿠키 및 세션 정보 유실 방지를 위한 헤더 병합 함수
 */
function mergeHeaders(targetResponse: NextResponse, sourceResponse: NextResponse) {
  sourceResponse.headers.getSetCookie().forEach((cookie) => {
    targetResponse.headers.append('Set-Cookie', cookie);
  });
  return targetResponse;
}

/**
 * 🛡️ [ZENITH Unified Middleware]
 * Next.js Unified Entry for Auth, i18n, and RBAC
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`[MIDDLEWARE] Entry: ${pathname}`);

  // 1. Supabase 세션 업데이트 및 사용자 획득
  let sessionResult;
  try {
    sessionResult = await updateSession(request);
  } catch (e) {
    console.error(`[MIDDLEWARE] Session Sync Failed:`, e);
    return handleI18nRouting(request);
  }
  
  const { supabaseResponse, user, supabase } = sessionResult;

  // 🎯 [Path Normalization]
  const segments = pathname.split('/').filter(Boolean);
  const maybeLocale = segments[0];
  const isLocaleExist = routing.locales.includes(maybeLocale as any);
  const locale = isLocaleExist ? maybeLocale : routing.defaultLocale;
  const purePath = '/' + (isLocaleExist ? segments.slice(1) : segments).join('/');

  const isAuthPage = purePath.startsWith('/login') || purePath.startsWith('/register');
  const isApi = purePath.startsWith('/api');

  // API 경로는 i18n 라우팅 제외 — handleI18nRouting이 /ko/api/... 로 잘못 리다이렉트하는 것 방지
  if (isApi) {
    return mergeHeaders(supabaseResponse, supabaseResponse);
  }

  // 2. 인증 가드 (Public Path 제외)
  if (!user && !isAuthPage && !isApi && purePath !== '/') {
    console.log(`[MIDDLEWARE] Unauthorized Access. Redirecting to Login.`);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${DEFAULT_REDIRECTS.UNAUTHENTICATED}`;
    return mergeHeaders(NextResponse.redirect(url), supabaseResponse);
  }

  // 2.1 플랫폼 점검 모드 (Maintenance Mode) Feature Flag 확인 (PH4-OPS-06)
  const isMaintenanceMode = await isFeatureEnabled('MAINTENANCE_MODE');
  const isPlatformUser = user?.app_metadata?.role === 'ZENITH_SUPER_ADMIN' || user?.app_metadata?.role === 'ADMIN';

  if (isMaintenanceMode && !isPlatformUser && !isAuthPage && !isApi && purePath !== '/') {
    console.log(`[MIDDLEWARE] Maintenance Mode Active. Blocking non-admin access.`);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/maintenance`; // 점검 페이지 (아직 없으므로 루트로 보내거나 403 처리 가능)
    // 임시로 홈으로 보내거나 에러 메시지 쿼리 파라미터 추가
    url.pathname = `/${locale}`;
    url.searchParams.set('error', 'maintenance');
    return mergeHeaders(NextResponse.redirect(url), supabaseResponse);
  }

  // 3. 권한 및 상태 거버넌스 (Schema-Resilient & Individual-Safe)
  if (user && !isApi) {
    // [Metadata Baseline]
    let orgType = (user.app_metadata?.org_type as any) || 'GUEST';
    let userStatus = (user.app_metadata?.status as string) || 'PENDING';

    try {
      // [DB Verification]
      const { data: profile, error } = await supabase
        .from('zen_profiles')
        .select(`
          status,
          org_id,
          role,
          zen_organizations (
            type
          )
        `)
        .eq('id', user.id)
        .single();

      if (profile) {
        userStatus = profile.status || userStatus;
        const dbOrgType = (profile.zen_organizations as any)?.type;

        if (['ZENITH_SUPER_ADMIN', 'ADMIN'].includes((profile as any).role)) {
          // 플랫폼 관리자는 조직 소속 없이도 PLATFORM 전체 권한 부여
          orgType = 'PLATFORM';
        } else if (dbOrgType) {
          orgType = dbOrgType;
        } else if (!profile.org_id && userStatus === 'ACTIVE') {
          orgType = 'SHIPPER';
          console.log(`[MIDDLEWARE] Individual Master detected. Promoting to SHIPPER.`);
        }
      }
    } catch (e) {
      console.warn(`[MIDDLEWARE] Robust Fallback active due to query error:`, e);
    }

    const allowedRoot = ORG_ROUTE_MAP[orgType as keyof typeof ORG_ROUTE_MAP] || '/';
    console.log(`[MIDDLEWARE] Auth Result: user=${user.id}, status=${userStatus}, orgType=${orgType}, allowedRoot=${allowedRoot}`);

    // [Status Guard]
    if (userStatus === 'PENDING' || userStatus === 'SUPPLEMENT_REQUIRED') {
      const pendingPath = DEFAULT_REDIRECTS.PENDING;
      if (purePath !== pendingPath && !isAuthPage && !purePath.startsWith('/orders') && !purePath.startsWith('/dashboard')) {
        console.log(`[MIDDLEWARE] Guard: Redirecting Pending user.`);
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}${pendingPath}`;
        return mergeHeaders(NextResponse.redirect(url), supabaseResponse);
      }
    }

    // [Org Guard]
    if (orgType !== 'PLATFORM') {
      // 🚀 [Critical Fix] /tracking 및 /orders 경로 모두 허용
      const isAllowedPath = 
        purePath === '/' || 
        purePath.startsWith(allowedRoot) || 
        isAuthPage || 
        purePath.startsWith('/orders') || 
        purePath.startsWith('/tracking') ||
        purePath.startsWith('/inventory'); // 재고관리도 허용 목록에 추가

      if (!isAllowedPath) {
        console.log(`[MIDDLEWARE] Path Violation (${purePath}). Redirecting to ${allowedRoot}`);
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}${allowedRoot}`;
        return mergeHeaders(NextResponse.redirect(url), supabaseResponse);
      }
    }
  }

  // 4. i18n 라우팅 최종 처리
  return mergeHeaders(handleI18nRouting(request), supabaseResponse);
}

export const config = {
  matcher: [
    '/',
    '/(ko|en|zh|ja)/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
