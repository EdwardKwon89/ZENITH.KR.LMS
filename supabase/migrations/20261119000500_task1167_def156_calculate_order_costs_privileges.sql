-- TASK-1167 (Issue #1389 / DEF-156): IMP-035-RL 조치 복구 (멱등)
-- 이전 마이그레이션(IMP-105~108) 재정의 과정에서 유실된 SECURITY INVOKER / search_path 및 실행 권한 제한을 복구한다.
-- 계산 본문 로직은 변경하지 않는다.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'calculate_order_costs'
      AND pg_get_function_identity_arguments(p.oid) = 'p_order_id uuid'
  ) THEN
    ALTER FUNCTION public.calculate_order_costs(uuid)
      SECURITY INVOKER
      SET search_path = public;

    REVOKE ALL ON FUNCTION public.calculate_order_costs(uuid) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.calculate_order_costs(uuid) FROM anon;
    REVOKE ALL ON FUNCTION public.calculate_order_costs(uuid) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.calculate_order_costs(uuid) TO service_role;
  END IF;
END $$;
