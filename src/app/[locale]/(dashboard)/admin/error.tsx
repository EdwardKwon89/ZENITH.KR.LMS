"use client";

import React, { useEffect } from 'react';
import * as Sentry from "@sentry/nextjs";
import { logger } from '@/lib/logger';
import { logClientError } from '@/app/actions/monitoring';
import { ErrorFallback } from '@/components/ui/ErrorFallback';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const eventId = Sentry.captureException(error);
    logClientError({
      message: error.message || "Unknown Admin Error",
      stack: error.stack,
      url: typeof window !== "undefined" ? window.location.href : "",
      severity: "ERROR",
      error_type: "CLIENT",
      sentry_id: eventId
    });
    logger.error("Admin Error:", error);
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Admin Area Error"
      message="An unexpected error occurred in the admin panel. Please try again."
    />
  );
}
