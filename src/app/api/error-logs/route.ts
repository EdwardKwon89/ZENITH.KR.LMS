import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

// TASK-1141 (Issue #1208, Option C): 브라우저에서 발생한 logger.error()를
// zen_error_logs에 적재하는 클라이언트 채널. 서버 채널은
// src/lib/logging/error-log-transport.ts가 직접 insert하므로 본 라우트는
// 브라우저 전용이다.
//
// - 인증 불요: 로그아웃 상태의 에러 바운더리((auth)/error.tsx 등)에서도 적재되어야 하므로.
//   대신 (1) severity는 WARNING|ERROR만 허용하고 CRITICAL은 400 거부 —
//   CRITICAL의 의미(이메일+인앱 알림)는 본 경로에서 발송되지 않으므로
//   "조용한 CRITICAL" 행 생성을 원천 차단한다. CRITICAL은 기존 logClientError
//   서버 액션 경로로만 기록된다. (2) 길이 상한 강제. (3) /api/* 전역
//   rate-limit(middleware.ts)이 스팸성 POST를 1차 차단한다.
// - 실패 경로는 console.warn만 사용한다. 여기서 logger.error를 호출하면
//   error-log-transport 서버 insert를 다시 타서 DB 장애 시 증폭 루프가 되므로 금지.

const MESSAGE_MAX = 2000;
const STACK_MAX = 4000;
const URL_MAX = 1000;

const ALLOWED_SEVERITIES = ['WARNING', 'ERROR'] as const;

interface ErrorLogsPostBody {
  message?: unknown;
  stack?: unknown;
  url?: unknown;
  severity?: unknown;
  sentry_id?: unknown;
}

function truncate(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value);
  if (!str) return undefined;
  return str.length > max ? str.slice(0, max) : str;
}

export async function POST(req: Request) {
  let body: ErrorLogsPostBody;
  try {
    body = (await req.json()) as ErrorLogsPostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ ok: false, error: 'message is required' }, { status: 400 });
  }

  const severity = body.severity === undefined || body.severity === null ? 'ERROR' : String(body.severity);
  if (!(ALLOWED_SEVERITIES as readonly string[]).includes(severity)) {
    // CRITICAL 포함 그 외 값 거부 — CRITICAL은 logClientError 경로 전용
    return NextResponse.json(
      { ok: false, error: 'severity must be WARNING or ERROR (CRITICAL is not accepted here)' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('zen_error_logs')
      .insert({
        message: truncate(message, MESSAGE_MAX),
        stack: truncate(body.stack, STACK_MAX),
        url: truncate(body.url, URL_MAX),
        severity,
        error_type: 'CLIENT',
        sentry_id: truncate(body.sentry_id, 255),
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[api/error-logs] zen_error_logs insert failed:', error.message);
      return NextResponse.json({ ok: false, error: 'Failed to persist error log' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: unknown) {
    console.warn(
      '[api/error-logs] unexpected error:',
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ ok: false, error: 'Failed to persist error log' }, { status: 500 });
  }
}
