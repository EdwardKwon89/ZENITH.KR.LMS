import { logger } from '@/lib/logger';
import { type NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/params/feature-flags';
import { USER_ROLES } from '@/lib/auth/rbac';
import { ORG_ROUTE_MAP, DEFAULT_REDIRECTS } from '@/config/routes';
import { routing } from '@/i18n/routing';

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

  const isAuthPage = purePath.startsWith('/login') || purePath.startsWith('/register');
  const isApi = purePath.startsWith('/api');

  if (isApi) return null;

  if (!user && !isAuthPage && purePath !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${DEFAULT_REDIRECTS.UNAUTHENTICATED}`;
    return { response: mergeHeaders(NextResponse.redirect(url), supabaseResponse), redirectUrl: url.pathname };
  }

  if (user) {
    const isMaintenanceMode = await isFeatureEnabled('MAINTENANCE_MODE');
    const isPlatformUser = user?.app_metadata?.role === USER_ROLES.ZENITH_SUPER_ADMIN || user?.app_metadata?.role === USER_ROLES.ADMIN;

    if (isMaintenanceMode && !isPlatformUser && !isAuthPage && purePath !== '/' && purePath !== '/maintenance') {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/maintenance`;
      return { response: mergeHeaders(NextResponse.redirect(url), supabaseResponse), redirectUrl: url.pathname };
    }
  }

  if (user && !isApi) {
    const metadataRole = user.app_metadata?.role as string | undefined;
    const isMetadataPlatformAdmin = metadataRole === USER_ROLES.ADMIN || metadataRole === USER_ROLES.ZENITH_SUPER_ADMIN;
    let orgType = isMetadataPlatformAdmin ? 'PLATFORM' : ((user.app_metadata?.org_type as any) || 'GUEST');
    let userStatus = (user.app_metadata?.status as string) || 'PENDING';

    try {
      const { data: profile } = await supabase
        .from('zen_profiles')
        .select(`status, org_id, role, zen_organizations ( type )`)
        .eq('id', user.id)
        .single();

      if (profile) {
        userStatus = profile.status || userStatus;
        const dbOrgType = (profile.zen_organizations as any)?.type;

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
      if (isMetadataPlatformAdmin) orgType = 'PLATFORM';
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
        purePath.startsWith('/admin/rates');

      if (!isAllowedPath) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}${allowedRoot}`;
        return { response: mergeHeaders(NextResponse.redirect(url), supabaseResponse), redirectUrl: url.pathname };
      }
    }
  }

  return null;
}
