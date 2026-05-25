import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/utils/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { authGuard } from '@/lib/auth/proxy';
import { logger } from '@/lib/logger';
import { globalRateLimiter } from '@/lib/security/rate-limit';

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

  // 1. Rate Limiting Check (API Routes & Server Actions)
  const isApi = pathname.split('/').filter(Boolean)[0] === 'api' ||
    (routing.locales.includes(pathname.split('/').filter(Boolean)[0] as any) &&
     pathname.split('/').filter(Boolean)[1] === 'api');
  
  const isAction = request.method === 'POST' && 
    (!!request.headers.get('next-action') || !!request.headers.get('x-action-id'));

  if (isApi || isAction) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               request.headers.get('x-real-ip') ||
               '127.0.0.1';

    const limitResult = globalRateLimiter.check(ip);
    if (!limitResult.allowed) {
      logger.warn(`[RATE_LIMIT] Blocked IP: ${ip}, path: ${pathname}, current: ${limitResult.current}`);
      
      const locale = pathname.split('/').filter(Boolean)[0] || 'ko';
      let message = `Too many requests. Please try again after ${limitResult.retryAfter} seconds.`;
      
      if (locale === 'ko') {
        message = `요청 횟수가 너무 많습니다. ${limitResult.retryAfter}초 후에 다시 시도해 주세요.`;
      } else if (locale === 'ja') {
        message = `リクエストの回数が多すぎます。${limitResult.retryAfter}秒後に再試行してください。`;
      } else if (locale === 'zh') {
        message = `请求过于频繁，请在 ${limitResult.retryAfter} 秒后重试。`;
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message,
          retryAfter: limitResult.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(limitResult.retryAfter)
          }
        }
      );
    }
  }

  let sessionResult;
  try {
    sessionResult = await updateSession(request);
  } catch (e) {
    logger.error(`[MIDDLEWARE] Session Sync Failed:`, e);
    return handleI18nRouting(request);
  }

  const { supabaseResponse, user, supabase } = sessionResult;

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
