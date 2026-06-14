-- Phase 7 UPS 특송: 기존 테이블 컬럼 확장
-- zen_organizations / zen_orders / zen_order_packages
-- TASK-138 IMP-110

-- 1. zen_organizations: 고객별 부피중량상수 (판매가 계산용)
--    원가 계산은 시스템 고정 6000 사용
ALTER TABLE public.zen_organizations
  ADD COLUMN IF NOT EXISTS volumetric_divisor INT DEFAULT 5000
    CHECK (volumetric_divisor IN (5000, 5500, 6000));

COMMENT ON COLUMN public.zen_organizations.volumetric_divisor
  IS 'UPS 부피중량 계산 상수 (판매가): 5000/5500/6000. 원가는 시스템 고정 6000.';

-- 2. zen_orders: UPS 배송 방식 및 픽업 정보
ALTER TABLE public.zen_orders
  ADD COLUMN IF NOT EXISTS delivery_method       VARCHAR(10)
    CHECK (delivery_method IN ('DIRECT','PICKUP')),
  ADD COLUMN IF NOT EXISTS pickup_location       TEXT,
  ADD COLUMN IF NOT EXISTS pickup_contact_name   TEXT,
  ADD COLUMN IF NOT EXISTS pickup_contact_tel    TEXT;

COMMENT ON COLUMN public.zen_orders.delivery_method
  IS 'UPS 배송 방식: DIRECT=직접배송, PICKUP=픽업';
COMMENT ON COLUMN public.zen_orders.pickup_location
  IS 'PICKUP 선택 시 픽업 장소';

-- 3. zen_order_packages: REF_NO 필드 (국내 + 국제 운송번호)
ALTER TABLE public.zen_order_packages
  ADD COLUMN IF NOT EXISTS ref_seq              INT,
  ADD COLUMN IF NOT EXISTS domestic_ref_no      TEXT,
  ADD COLUMN IF NOT EXISTS intl_ref_no          TEXT,
  ADD COLUMN IF NOT EXISTS intl_ref_issued_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intl_ref_locked      BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.zen_order_packages.ref_seq
  IS '오더 내 패키지 순번 (01, 02, 03...)';
COMMENT ON COLUMN public.zen_order_packages.domestic_ref_no
  IS '국내 택배 운송번호 (직접배송 시 입고 스캔)';
COMMENT ON COLUMN public.zen_order_packages.intl_ref_no
  IS 'UPS 국제 운송번호 (IBC/Pactrak Manifest API 발부)';
COMMENT ON COLUMN public.zen_order_packages.intl_ref_locked
  IS 'UPS 번호 발부 후 변경 불가 잠금. TRUE 시 수정 금지.';

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_order_packages_domestic_ref ON public.zen_order_packages(domestic_ref_no) WHERE domestic_ref_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_packages_intl_ref ON public.zen_order_packages(intl_ref_no) WHERE intl_ref_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_vol_divisor ON public.zen_organizations(volumetric_divisor);
