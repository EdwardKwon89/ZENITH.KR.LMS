"use client";

import React, { useEffect } from 'react';
import { ZenErrorView } from '@/components/ui/ZenErrorView';

export default function GlobalDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 실제 운영 환경에서는 Sentry 등의 외부 로깅 서비스로 전송할 지점입니다.
    console.error("Dashboard Runtime Error:", error);
  }, [error]);

  return (
    <div className="flex-1">
      <ZenErrorView error={error} reset={reset} />
    </div>
  );
}
