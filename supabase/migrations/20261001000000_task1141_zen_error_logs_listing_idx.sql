-- TASK-1141 (Issue #1208, IMP-169 Option C): zen_error_logs 목록 조회용 인덱스
--
-- logger.error() 자동 적재가 시작되면 적재량이 기존(명시 호출 6곳) 대비 크게
-- 늘어난다. /admin/error-logs 목록 쿼리(getErrorLogs, TASK-1140 3단 정렬:
-- resolved ASC → severity ASC → created_at DESC)가 테이블 스캔으로
-- 전환되지 않도록 선제 인덱스를 추가한다. RLS·컬럼 변경 없음 (additive only).

CREATE INDEX IF NOT EXISTS zen_error_logs_listing_idx
  ON zen_error_logs (resolved, severity, created_at DESC);

COMMENT ON INDEX zen_error_logs_listing_idx IS
  'TASK-1141: /admin/error-logs 3-key sort (resolved/severity/created_at) covering index for auto-ingested logger.error() volume';
