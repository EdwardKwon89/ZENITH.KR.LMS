import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/utils/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { ORG_ROUTE_MAP, DEFAULT_REDIRECTS } from '@/config/routes';
import { createClient } from '@/utils/supabase/server';

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
 * 🛡️ [ZENITH Unified Proxy]
 * Next.js 16.2.4 Secondary Entry (Redundant Guard)
 * Note: Providing this for compatibility with Next.js 16 internal manifest.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`[PROXY-DUAL] Entry: ${pathname}`);

  // 1. Supabase 세션 업데이트 및 사용자 획득
  let sessionResult;
  try {
    sessionResult = await updateSession(request);
  } catch (e) {
    console.error(`[PROXY-DUAL] Session Sync Failed:`, e);
    return handleI18nRouting(request);
  }
  
  const { supabaseResponse, user } = sessionResult;
  const supabase = await createClient();

  // 🎯 [Path Normalization]
  const segments = pathname.split('/').filter(Boolean);
  const maybeLocale = segments[0];
  const isLocaleExist = routing.locales.includes(maybeLocale as any);
  const locale = isLocaleExist ? maybeLocale : routing.defaultLocale;
  const purePath = '/' + (isLocaleExist ? segments.slice(1) : segments).join('/');

  const isAuthPage = purePath.startsWith('/login') || purePath.startsWith('/register');
  const isApi = purePath.startsWith('/api');

  // 2. 인증 가드 (Public Path 제외)
  if (!user && !isAuthPage && !isApi && purePath !== '/') {
    console.log(`[PROXY-DUAL] Unauthorized Access. Redirecting to Login.`);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${DEFAULT_REDIRECTS.UNAUTHENTICATED}`;
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
        .from('profiles')
        .select(`
          status, 
          org_id, 
          organizations (
            org_type
          )
        `)
        .eq('id', user.id)
        .single();

      if (profile) {
        userStatus = profile.status || userStatus;
        const dbOrgType = (profile.organizations as any)?.org_type;
        
        if (dbOrgType) {
          orgType = dbOrgType;
        } else if (!profile.org_id && userStatus === 'ACTIVE') {
          // 🚀 [Critical Fix] 개인 사용자의 경우 SHIPPER 권한을 강제 부여하여 대시보드 진입 보장
          orgType = 'SHIPPER';
          console.log(`[PROXY-DUAL] Individual Master detected. Promoting to SHIPPER.`);
        }
      }
    } catch (e) {
      console.warn(`[PROXY-DUAL] Robust Fallback active due to query error:`, e);
    }

    const allowedRoot = ORG_ROUTE_MAP[orgType as keyof typeof ORG_ROUTE_MAP] || '/';
    console.log(`[PROXY-DUAL] Auth Result: user=${user.id}, status=${userStatus}, orgType=${orgType}, allowedRoot=${allowedRoot}`);

    // [Status Guard]
    if (userStatus === 'PENDING' || userStatus === 'SUPPLEMENT_REQUIRED') {
      const pendingPath = DEFAULT_REDIRECTS.PENDING;
      if (purePath !== pendingPath && !isAuthPage && !purePath.startsWith('/orders') && !purePath.startsWith('/dashboard')) {
        console.log(`[PROXY-DUAL] Guard: Redirecting Pending user.`);
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}${pendingPath}`;
        return mergeHeaders(NextResponse.redirect(url), supabaseResponse);
      }
    }

    // [Org Guard]
    if (orgType !== 'PLATFORM') {
      // /orders 와 allowedRoot 모두 허용 루틴 추가
      const isAllowedPath = purePath === '/' || purePath.startsWith(allowedRoot) || isAuthPage || purePath.startsWith('/orders');
      if (!isAllowedPath) {
        console.log(`[PROXY-DUAL] Path Violation (${purePath}). Redirecting to ${allowedRoot}`);
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
