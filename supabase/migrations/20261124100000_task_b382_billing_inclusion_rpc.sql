-- ============================================================================
-- TASK-B-382 (Issue #1463): zen_billing_statement_order_included
--   오더가 청구서 항목에 포함되었는지만 boolean으로 반환하는 SECURITY DEFINER 함수.
--
-- 설계 확정(v5.2 / B안 = 정책 0개):
--   · RLS 정책 신설 없음 — MANAGER에게 청구서 헤더·항목 SELECT 권한을 주지 않는다.
--   · 포함 여부만 반환하고 청구서 데이터(행·컬럼)는 반환하지 않는다.
--   · 청구서 상태와 무관하게 "포함 여부"만 확인한다(DRAFT 포함도 true).
--   · 실행 권한은 authenticated(세션 클라이언트)만 허용하고, 함수 내부에서
--     허용 역할 3종(ADMIN·MANAGER·ZENITH_SUPER_ADMIN)만 검사한다.
--     비허용 역할·profile 없음은 false가 아니라 **예외**로 거부(fail-closed)한다.
--   · actor는 파라미터로 받지 않는다(auth.uid() 사용).
--
-- 앱 적용 순서: 이 마이그레이션(DB) → 스키마 reload → unmarkOrderCostSettled(앱).
-- 롤백 순서: 앱 롤백 먼저 → 함수 제거(아래 ROLLBACK 참조).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.zen_billing_statement_order_included(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'invalid_order_id';
  END IF;

  SELECT p.role INTO v_role
  FROM public.zen_profiles p
  WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;
  IF v_role NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') THEN
    RAISE EXCEPTION 'statement_inclusion_not_allowed: role=%', v_role;
  END IF;

  -- 상태 무관: DRAFT/ISSUED/CLOSED 어떤 헤더라도 항목이 있으면 포함으로 판정.
  RETURN EXISTS (
    SELECT 1
    FROM public.zen_billing_statement_items i
    WHERE i.order_id = p_order_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.zen_billing_statement_order_included(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zen_billing_statement_order_included(uuid) TO authenticated;

COMMENT ON FUNCTION public.zen_billing_statement_order_included(uuid) IS
  'TASK-B-382(#1463): 오더-청구서 포함 여부만 boolean 반환(SECURITY DEFINER, ADMIN/MANAGER/ZENITH_SUPER_ADMIN 전용, 비허용 역할은 예외). RLS 정책 신설 없음.';

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- ROLLBACK (주석 해제 후 실행 — 앱 RPC 호출 제거를 먼저 배포할 것)
-- ============================================================================
-- REVOKE ALL ON FUNCTION public.zen_billing_statement_order_included(uuid) FROM authenticated;
-- DROP FUNCTION IF EXISTS public.zen_billing_statement_order_included(uuid);
-- NOTIFY pgrst, 'reload schema';
-- ============================================================================
