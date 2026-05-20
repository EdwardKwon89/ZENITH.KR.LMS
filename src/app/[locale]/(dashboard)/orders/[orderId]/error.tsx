"use client";

import React, { useEffect } from 'react';
import * as Sentry from "@sentry/nextjs";
import { logger } from '@/lib/logger';
import { logClientError } from '@/app/actions/monitoring';
import { ErrorFallback } from '@/components/ui/ErrorFallback';

export default function OrderDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const eventId = Sentry.captureException(error);
    logClientError({
      message: error.message || "Unknown Order Detail Error",
      stack: error.stack,
      url: typeof window !== "undefined" ? window.location.href : "",
      severity: "ERROR",
      error_type: "CLIENT",
      sentry_id: eventId
    });
    logger.error("Order Detail Error:", error);
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Order Detail Error"
      message="Failed to load order details. Please try again."
    />
  );
}
