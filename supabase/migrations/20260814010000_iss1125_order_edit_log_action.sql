-- 20260814010000_iss1125_order_edit_log_action.sql
-- TASK-B-303 (Issue #1125): zen_order_edit_log 확장 — action + old_data/new_data JSONB
--
-- 배경: 기존 zen_order_edit_log는 WAREHOUSED+UPS 부분수정일 때만 기록되고
--       who/when만 담으며 "무엇이 바뀌었는지" 정보가 전혀 없다.
--       JSJung 요청으로 오더 등록/수정 이력 관리 기능 신설:
--       rate_card_logs + getPricingAuditLog() + ZoneDiscountForm 패턴(action + old_data/new_data)을 이식.
--
-- 컬럼 추가만이므로 기존 RLS/GRANT 정책은 그대로 재사용한다.

-- =====================================================
-- 1. 컬럼 추가 (기존 행은 UPDATE로 백필)
-- =====================================================

ALTER TABLE public.zen_order_edit_log
  ADD COLUMN IF NOT EXISTS action VARCHAR(20) NOT NULL DEFAULT 'UPDATE',
  ADD COLUMN IF NOT EXISTS old_data JSONB,
  ADD COLUMN IF NOT EXISTS new_data JSONB;

-- 기존 행(과거 WAREHOUSED+UPS 부분수정 기록)은 DEFAULT 'UPDATE'로 백필된 뒤,
-- 이후 신규 insert는 action 명시 강제
ALTER TABLE public.zen_order_edit_log ALTER COLUMN action DROP DEFAULT;

-- =====================================================
-- 2. 컬럼 설명 (관리 목적)
-- =====================================================

COMMENT ON COLUMN public.zen_order_edit_log.action IS '이벤트 종류 — CREATE(오더 등록) / UPDATE(수정)';
COMMENT ON COLUMN public.zen_order_edit_log.old_data IS '수정 전 핵심 필드 부분 스냅샷 (CREATE는 NULL)';
COMMENT ON COLUMN public.zen_order_edit_log.new_data IS '수정 후 핵심 필드 부분 스냅샷';
