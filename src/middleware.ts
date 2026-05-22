import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/utils/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { authGuard } from '@/lib/auth/proxy';
import { logger } from '@/lib/logger';

const handleI18nRouting = createMiddleware(routing);

function mergeHeaders(targetResponse: NextResponse, sourceResponse: NextResponse) {
  sourceResponse.headers.getSetCookie().forEach((cookie) => {
    targetResponse.headers.append('Set-Cookie', cookie);
  });
  return targetResponse;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  logger.debug(`[PROXY] Entry: ${pathname}`);

  let sessionResult;
  try {
    sessionResult = await updateSession(request);
  } catch (e) {
    logger.error(`[MIDDLEWARE] Session Sync Failed:`, e);
    return handleI18nRouting(request);
  }

  const { supabaseResponse, user, supabase } = sessionResult;

  const isApi = pathname.split('/').filter(Boolean)[0] === 'api' ||
    (routing.locales.includes(pathname.split('/').filter(Boolean)[0] as any) &&
     pathname.split('/').filter(Boolean)[1] === 'api');

  if (isApi) {
    return mergeHeaders(supabaseResponse, supabaseResponse);
  }

  const decision = await authGuard(request, supabaseResponse, supabase, user);
  if (decision) {
    return decision.response;
  }

  return mergeHeaders(handleI18nRouting(request), supabaseResponse);
}

export const config = {
  matcher: [
    '/',
    '/(ko|en|zh|ja)/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
