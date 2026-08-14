import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/utils/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { authGuard } from '@/lib/auth/proxy';
import { logger } from '@/lib/logger';
import { globalRateLimiter } from '@/lib/security/rate-limit';
import { runWithRequestContext, setRequestContextStore, type RequestContext } from '@/lib/logging/request-context';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as Sentry from '@sentry/nextjs';

const storage = new AsyncLocalStorage<RequestContext>();
setRequestContextStore(storage);

const handleI18nRouting = createMiddleware(routing);

function mergeHeaders(targetResponse: NextResponse, sourceResponse: NextResponse) {
  sourceResponse.headers.getSetCookie().forEach((cookie) => {
    targetResponse.headers.append('Set-Cookie', cookie);
  });
  return targetResponse;
}

function withRequestIdHeader(response: NextResponse, requestId: string) {
  response.headers.set('x-request-id', requestId);
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  return runWithRequestContext(
    { requestId, route: pathname, startedAt: Date.now() },
    async () => {
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

          return withRequestIdHeader(
            new NextResponse(
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
            ),
            requestId
          );
        }
      }

      // requestId를 요청 헤더로 주입해 Route Handler/Server Action/Server Component로 전파
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-request-id', requestId);
      const requestWithId = new NextRequest(request, { headers: requestHeaders });

      let sessionResult;
      try {
        sessionResult = await updateSession(requestWithId);
      } catch (e) {
        logger.error(`[MIDDLEWARE] Session Sync Failed:`, e);
        return withRequestIdHeader(handleI18nRouting(requestWithId), requestId);
      }

      const { supabaseResponse, user, supabase } = sessionResult;

      // Sentry 사용자 컨텍스트 연결 (세션 확립 지점)
      if (user) {
        Sentry.setUser({
          id: user.id,
          email: user.email ?? undefined,
          org_id: (user.app_metadata?.org_id as string) ?? undefined,
          role: (user.app_metadata?.role as string) ?? undefined,
        });
      } else {
        Sentry.setUser(null);
      }

      if (isApi) {
        return withRequestIdHeader(mergeHeaders(supabaseResponse, supabaseResponse), requestId);
      }

      const decision = await authGuard(requestWithId, supabaseResponse, supabase, user);
      if (decision) {
        return withRequestIdHeader(decision.response, requestId);
      }

      return withRequestIdHeader(mergeHeaders(handleI18nRouting(requestWithId), supabaseResponse), requestId);
    }
  );
}

export const config = {
  matcher: [
    '/',
    '/(ko|en|zh|ja)/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};