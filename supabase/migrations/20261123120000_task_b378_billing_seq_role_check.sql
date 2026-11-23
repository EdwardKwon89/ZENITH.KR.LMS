-- ============================================================================
-- TASK-B-378 (Issue #1452, 부모 #1449 B): next_billing_statement_seq
--   실행 권한(GRANT)·함수 내부 역할 검사를 청구서 생성 권한과 정렬
--
-- 배경: 이 함수는 청구서 생성 RPC 경로(create_billing_statement ←
--   create_billing_statement_with_items)에서만 실행되어야 한다. 기존(b359)은
--   SECURITY DEFINER로 내부 역할 검사가 없이 GRANT만 authenticated/service_role
--   허용 상태였다 → 본 마이그레이션은 **함수 본문에 두 RPC와 동일한 역할 검사**를
--   넣고 GRANT를 두 RPC와 동일한 형태로 명시한다.
--
--   · 역할 검사: zen_profiles via auth.uid(), 허용 ('ADMIN','ZENITH_SUPER_ADMIN','AGENCY'),
--     오류 코드 create_not_allowed: role=% — 두 RPC(b359 L189 / b360 L128)와 동일
--   · GRANT: 두 RPC와 동일 (REVOKE PUBLIC·anon·dashboard_user / GRANT authenticated·service_role).
--     dashboard_user는 방어적 명시이며 관측 가능한 privilege 값 변화는 없다(both false).
--   · **b359 마이그레이션은 수정하지 않는다** (신규 파일 + 롤백 SQL, 파일 단위 선적용 가능)
--
-- 적용: supabase db push / 마이그레이션 순서상 20261123100000(task_b375) 뒤.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.next_billing_statement_seq(p_year integer, p_month integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
  v_role text;
BEGIN
  IF p_year NOT BETWEEN 2000 AND 2100 OR p_month NOT BETWEEN 1 AND 12 THEN
    RAISE EXCEPTION 'invalid_period: %-%', p_year, p_month;
  END IF;

  -- TASK-B-378 (#1449 B): 청구서 생성 RPC와 동일한 내부 역할 검사
  -- (b359 create_billing_statement / b360 create_billing_statement_with_items와 동일:
  --  zen_profiles via auth.uid() → NOT IN ('ADMIN','ZENITH_SUPER_ADMIN','AGENCY')
  --  → create_not_allowed: role=%)
  SELECT p.role INTO v_role
  FROM public.zen_profiles p
  WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;
  IF v_role NOT IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'AGENCY') THEN
    RAISE EXCEPTION 'create_not_allowed: role=%', v_role;
  END IF;

  -- 단일 문장 원자 증분 (경쟁 시 한쪽이 UPDATE 후킹, 중복 불가)
  INSERT INTO public.zen_billing_statement_seq AS c (period_year, period_month, last_seq)
  VALUES (p_year, p_month, 1)
  ON CONFLICT (period_year, period_month)
  DO UPDATE SET last_seq = c.last_seq + 1
  RETURNING last_seq INTO v_next;
  RETURN v_next;
END;
$$;

-- GRANT 정렬: 청구서 생성 RPC 2종과 동일 (authenticated·service_role만 허용).
-- dashboard_user는 방어적 명시 REVOKE (기존에도 false, 관측값 변화 없음).
REVOKE ALL ON FUNCTION public.next_billing_statement_seq(integer, integer) FROM PUBLIC, anon, dashboard_user;
GRANT EXECUTE ON FUNCTION public.next_billing_statement_seq(integer, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.next_billing_statement_seq(integer, integer) IS
  'TASK-B-359 조건1: 월 seq 원자 증분 (유일한 카운터 접근 경로, SECURITY DEFINER) + TASK-B-378(#1449 B): 청구서 생성 RPC와 동일한 내부 역할 검사 (ADMIN/ZENITH_SUPER_ADMIN/AGENCY)';

-- ============================================================================
-- ROLLBACK (b359 원본 상태 복원 — 주석 해제 후 실행)
-- ============================================================================
/*
CREATE OR REPLACE FUNCTION public.next_billing_statement_seq(p_year integer, p_month integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_next integer;
BEGIN
  IF p_year NOT BETWEEN 2000 AND 2100 OR p_month NOT BETWEEN 1 AND 12 THEN
    RAISE EXCEPTION 'invalid_period: %-%', p_year, p_month;
  END IF;
  -- 단일 문장 원자 증분 (경쟁 시 한쪽이 UPDATE 후킹, 중복 불가)
  INSERT INTO public.zen_billing_statement_seq AS c (period_year, period_month, last_seq)
  VALUES (p_year, p_month, 1)
  ON CONFLICT (period_year, period_month)
  DO UPDATE SET last_seq = c.last_seq + 1
  RETURNING last_seq INTO v_next;
  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.next_billing_statement_seq(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_billing_statement_seq(integer, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.next_billing_statement_seq(integer, integer) IS
  'TASK-B-359 조건1: 월 seq 원자 증분 (유일한 카운터 접근 경로, SECURITY DEFINER)';
*/
