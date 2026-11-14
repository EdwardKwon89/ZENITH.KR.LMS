"use client";
import { logger } from '@/lib/logger';

import React, { useEffect } from 'react';
import * as Sentry from "@sentry/nextjs";
import { ZenErrorView } from '@/components/ui/ZenErrorView';

export default function GlobalDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry에 에러 전송
    Sentry.captureException(error);

    // TASK-1141: severity ERROR 명시 logClientError 호출은 logger.error()에 흡수되어
    // 삭제 — logger.error가 zen_error_logs에 자동 적재하므로 중복 기록 방지.
    logger.error("Dashboard Runtime Error:", error);
  }, [error]);

  return (
    <div className="flex-1">
      <ZenErrorView error={error} reset={reset} />
    </div>
  );
}
