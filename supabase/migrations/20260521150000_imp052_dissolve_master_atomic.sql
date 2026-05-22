-- 1. FK 제약 조건 변경 (ON DELETE CASCADE -> ON DELETE SET NULL)
ALTER TABLE public.zen_master_order_history 
  DROP CONSTRAINT IF EXISTS zen_master_order_history_master_order_id_fkey;

ALTER TABLE public.zen_master_order_history
  ADD CONSTRAINT zen_master_order_history_master_order_id_fkey 
  FOREIGN KEY (master_order_id) REFERENCES public.zen_master_orders(id) ON DELETE SET NULL;
  
ALTER TABLE public.zen_master_order_history 
  ALTER COLUMN master_order_id DROP NOT NULL;

-- 2. 백업용 master_no 컬럼 추가
ALTER TABLE public.zen_master_order_history
  ADD COLUMN IF NOT EXISTS master_no VARCHAR(50);

-- 3. dissolve_master_order_atomic RPC 함수 정의
CREATE OR REPLACE FUNCTION public.dissolve_master_order_atomic(
  p_master_order_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_master_no VARCHAR(50);
BEGIN
  -- 1. zen_master_orders에서 master_no를 조회하며 행 잠금 (FOR UPDATE)
  SELECT master_no INTO v_master_no
  FROM public.zen_master_orders
  WHERE id = p_master_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Master order not found: %', p_master_order_id;
  END IF;

  -- 2. 소속 하우스 오더들의 master_order_id = NULL, status = 'REGISTERED' 일괄 업데이트
  UPDATE public.zen_orders
  SET 
    master_order_id = NULL,
    status = 'REGISTERED'
  WHERE master_order_id = p_master_order_id;

  -- 3. zen_master_order_history에 해체 이력 삽입
  INSERT INTO public.zen_master_order_history (
    master_order_id,
    master_no,
    prev_status,
    next_status,
    reason,
    changed_by
  ) VALUES (
    p_master_order_id,
    v_master_no,
    'MASTERED',
    'DISSOLVED',
    'Master order dissolved',
    p_user_id
  );

  -- 4. zen_master_orders에서 master order 물리 삭제
  DELETE FROM public.zen_master_orders
  WHERE id = p_master_order_id;

END;
$$;
