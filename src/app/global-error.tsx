"use client";
import { logger } from '@/lib/logger';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ZenErrorView } from "@/components/ui/ZenErrorView";
import { logClientError } from "@/app/actions/monitoring";

/**
 * Root Layout 레벨의 에러를 포착하는 최상위 에러 바운더리입니다.
 * Next.js 관례에 따라 <html> 및 <body> 태그를 포함해야 합니다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry에 에러 전송 및 이벤트 ID 확보
    const eventId = Sentry.captureException(error);
    
    // DB 에러 로그에 시스템 임계 에러로 기록
    logClientError({
      message: error.message || "Unknown Global Error",
      stack: error.stack,
      severity: "CRITICAL",
      error_type: "SERVER",
      sentry_id: eventId,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });
    
    logger.error("Global Runtime Error:", error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="antialiased">
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <ZenErrorView 
            error={error} 
            reset={reset} 
            title="System Critical Error"
            message="시스템 핵심 엔진에서 예기치 않은 중단이 발생했습니다. 관리자에게 보고되었으며 빠른 시일 내에 복구될 예정입니다."
          />
        </div>
      </body>
    </html>
  );
}
