-- 20260811060000_iss1070_ups_warehoused_partial_edit.sql
-- TASK-B-284 (Issue #1070): UPS 오더 WAREHOUSED 단계 부분 수정 허용 (measured_at 기반)
--
-- 배경: 실제 SHXK 등록(registerUpsOrder)은 WAREHOUSED→PACKED 전환 시점에만 호출되므로,
--       그 사이 WAREHOUSED 오더는 창고 큐에서 배치 대기하며 실질적 시간 갭이 존재.
--       그러나 현재 isOrderEditable()이 WAREHOUSED부터 전면 차단 → UPS 오더를 SHXK 등록
--       전까지 수정할 수 없음.
--
-- 위험(단순 WAREHOUSED 허용 금지): 입고 확정 시 창고가 실측한 무게/치수가
--       zen_order_packages.gross_weight/length/width/height에 저장되는데, 이 컬럼이 SHXK로
--       전송되는 컬럼과 동일. updateOrder()가 패키지를 전체 삭제+재삽입하므로 화주 수정이
--       실측값을 조용히 되돌릴 수 있음.
--
-- 해법: zen_order_packages.measured_at 컬럼을 추가해 "실측 완료된 패키지"를 구분하고,
--       WAREHOUSED+UPS 오더는 실측 패키지의 치수/무게/포장수만 잠그고 나머지(헤더·아이템·
--       미실측 패키지)는 수정을 허용한다. 수정 발생 시 zen_order_edit_log에 감사 로그를 남긴다.

-- =====================================================
-- 1. zen_order_packages.measured_at 컬럼 추가
-- =====================================================

ALTER TABLE public.zen_order_packages
  ADD COLUMN IF NOT EXISTS measured_at timestamptz;

-- =====================================================
-- 2. zen_order_edit_log 감사 테이블 (WAREHOUSED 단계 수정 기록)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.zen_order_edit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  edited_by uuid REFERENCES public.zen_profiles(id),
  edited_at timestamptz NOT NULL DEFAULT now(),
  order_status_at_edit text NOT NULL
);

ALTER TABLE public.zen_order_edit_log ENABLE ROW LEVEL SECURITY;

-- INSERT: authenticated 전체 허용 (RLS는 서버 액션의 insert 경로를 보호하는 장치가 아니라
--   앱 레벨 검증이 주 방어이므로, 기존 order_status_history 정책과 동일하게 허용)
DROP POLICY IF EXISTS "Allow authenticated insert for edit log" ON public.zen_order_edit_log;
CREATE POLICY "Allow authenticated insert for edit log"
ON public.zen_order_edit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: authenticated 전체 조회 가능 (관리/감사 목적, 민감 정보 없음)
DROP POLICY IF EXISTS "Allow authenticated read for edit log" ON public.zen_order_edit_log;
CREATE POLICY "Allow authenticated read for edit log"
ON public.zen_order_edit_log FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 3. GRANT: authenticated 롤에 INSERT/SELECT 권한 보장
-- =====================================================

GRANT INSERT, SELECT ON public.zen_order_edit_log TO authenticated;

-- DEF-B-053 (Issue #1063) 컨벤션: service_role에도 GRANT 필수 —
-- 로컬 DB는 pg_default_acl 누적 권한으로 service_role이 이미 arwdDxtm 전체 권한을 갖지만,
-- CI fresh 컨테이너는 explicit GRANT만 유효 — 누락 시 감사 로그 insert가 조용히 실패한다.
-- (PR#1073 반려 사유 — TC-284-05가 CI에서만 'expected 0 to be 1'로 실패)
GRANT ALL ON public.zen_order_edit_log TO service_role;
