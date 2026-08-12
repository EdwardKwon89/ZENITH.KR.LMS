-- 20260812030000_iss1085_tracking_configs_last_status.sql
-- TASK-B-290 (Issue #1085 / DEF-B-060): UPS 트래킹 폴링 시점의 전체 현재 상태(track_status) 저장
--
-- 기존엔 zen_tracking_configs에 폴링 시점의 현재 상태를 저장하는 컬럼이 전혀 없어,
-- 실시간 재조회 없이는 "지금 상태"를 알 수 없었음 (is_active:false 만 배송완료 시 갱신).
-- 매 폴링마다 아래 3개 컬럼을 갱신한다.

ALTER TABLE public.zen_tracking_configs
  ADD COLUMN IF NOT EXISTS last_track_status TEXT,
  ADD COLUMN IF NOT EXISTS last_track_status_name TEXT,
  ADD COLUMN IF NOT EXISTS last_tracked_at TIMESTAMPTZ;
