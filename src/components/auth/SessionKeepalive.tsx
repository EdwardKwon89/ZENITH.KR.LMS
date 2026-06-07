'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

// jwt_expiry(300s) 만료 60초 전에 갱신 — 페이지 이동 없이도 세션 유지
const REFRESH_INTERVAL_MS = (300 - 60) * 1000;

export default function SessionKeepalive() {
  useEffect(() => {
    const supabase = createClient();

    const refresh = async () => {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('[SessionKeepalive] refresh failed:', error.message);
      }
    };

    // 마운트 시 즉시 1회 + 이후 주기적 갱신
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
