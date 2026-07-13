-- 20260704101500_agency_003_org_contact_columns.sql
-- [DEF-091] zen_organizations contact 컬럼 추가 — 화주 상세 정보 편집 Backend
-- Dave (TASK-B-047)
ALTER TABLE public.zen_organizations
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;
