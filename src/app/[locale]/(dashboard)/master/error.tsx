"use client";

import React, { useEffect } from 'react';
import * as Sentry from "@sentry/nextjs";
import { logger } from '@/lib/logger';
import { ErrorFallback } from '@/components/ui/ErrorFallback';

export default function MasterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    // TASK-1141: severity ERROR 명시 logClientError 호출은 logger.error()에 흡수되어
    // 삭제 — logger.error가 zen_error_logs에 자동 적재하므로 중복 기록 방지.
    logger.error("Master Error:", error);
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Master Area Error"
      message="An unexpected error occurred. Please try again or contact support."
    />
  );
}
