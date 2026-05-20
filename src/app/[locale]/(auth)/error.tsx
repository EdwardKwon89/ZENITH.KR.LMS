"use client";

import React, { useEffect } from 'react';
import * as Sentry from "@sentry/nextjs";
import { logger } from '@/lib/logger';
import { logClientError } from '@/app/actions/monitoring';
import { ErrorFallback } from '@/components/ui/ErrorFallback';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const eventId = Sentry.captureException(error);
    logClientError({
      message: error.message || "Unknown Auth Error",
      stack: error.stack,
      url: typeof window !== "undefined" ? window.location.href : "",
      severity: "ERROR",
      error_type: "CLIENT",
      sentry_id: eventId
    });
    logger.error("Auth Error:", error);
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Authentication Error"
      message="We encountered an issue during authentication. Please try again."
    />
  );
}
