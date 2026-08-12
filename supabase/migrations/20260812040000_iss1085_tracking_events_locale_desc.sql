-- 20260812040000_iss1085_tracking_events_locale_desc.sql
-- TASK-B-290 (Issue #1085 / DEF-B-060): SHXK 중문 이벤트 설명 로케일 번역 컬럼
--
-- event_desc엔 SHXK 중문 원문만 저장됐는데, ko/en 로케일별 표출을 위해
-- 번역본(event_desc_ko/event_desc_en)을 별도 컬럼으로 저장한다.
-- (번역은 src/lib/shxk/translate.ts의 정적 사전 기반)

ALTER TABLE public.zen_ups_tracking_events
  ADD COLUMN IF NOT EXISTS event_desc_ko TEXT,
  ADD COLUMN IF NOT EXISTS event_desc_en TEXT;
