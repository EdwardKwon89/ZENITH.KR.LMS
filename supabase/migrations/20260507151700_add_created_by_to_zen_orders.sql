-- zen_orders 테이블에 created_by 컬럼 추가 (개인 화주 식별용)
ALTER TABLE public.zen_orders 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- 기존 데이터 보정 (shipper_id가 연결된 조직의 대표 사용자 등으로 채울 수 있으나, 테스트 환경이므로 현재 인증된 사용자로 업데이트할 수 있도록 정책만 열어둠)
-- 여기서는 단순히 컬럼만 추가하고, 이후 코드에서 처리하도록 함.

-- RLS 정책에서 created_by를 사용할 수 있도록 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_zen_orders_created_by ON public.zen_orders(created_by);

-- 주석 추가
COMMENT ON COLUMN public.zen_orders.created_by IS '주문을 생성한 사용자의 ID (개인 화주 식별용)';
