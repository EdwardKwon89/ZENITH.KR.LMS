"use client";

import React, { useEffect } from 'react';
import * as Sentry from "@sentry/nextjs";
import { logger } from '@/lib/logger';
import { logClientError } from '@/app/actions/monitoring';
import { ErrorFallback } from '@/components/ui/ErrorFallback';

export default function MasterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const eventId = Sentry.captureException(error);
    logClientError({
      message: error.message || "Unknown Master Error",
      stack: error.stack,
      url: typeof window !== "undefined" ? window.location.href : "",
      severity: "ERROR",
      error_type: "CLIENT",
      sentry_id: eventId
    });
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
