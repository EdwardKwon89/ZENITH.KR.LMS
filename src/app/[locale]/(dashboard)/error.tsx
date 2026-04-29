"use client";

import React, { useEffect } from 'react';
import * as Sentry from "@sentry/nextjs";
import { ZenErrorView } from '@/components/ui/ZenErrorView';
import { logClientError } from '@/app/actions/monitoring';

export default function GlobalDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry에 에러 전송
    const eventId = Sentry.captureException(error);

    // 로컬 DB 모니터링 시스템에 에러 기록
    logClientError({
      message: error.message || "Unknown Dashboard Error",
      stack: error.stack,
      url: window.location.href,
      severity: "ERROR",
      error_type: "CLIENT",
      sentry_id: eventId
    });

    console.error("Dashboard Runtime Error:", error);
  }, [error]);

  return (
    <div className="flex-1">
      <ZenErrorView error={error} reset={reset} />
    </div>
  );
}
