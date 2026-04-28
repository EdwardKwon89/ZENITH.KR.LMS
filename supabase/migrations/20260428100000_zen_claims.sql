-- [PH8-DB-01] 클레임 처리 및 사고비 관리를 위한 스키마 확장
-- Created: 2026-04-28 (KST)
-- Worker: Riley (Antigravity) | Auditor: Aiden (User)

-- 1. 클레임 테이블 생성
CREATE TABLE IF NOT EXISTS public.zen_claims (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  org_id       uuid NOT NULL REFERENCES public.zen_organizations(id),
  created_by   uuid NOT NULL REFERENCES public.zen_profiles(id),
  reason_code  TEXT NOT NULL CHECK (reason_code IN ('DELAY','DAMAGE','MISDELIVERY')),
  description  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'OPEN'
                 CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','CLOSED')),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 사고 비용 테이블 생성
CREATE TABLE IF NOT EXISTS public.zen_incident_fees (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id    uuid NOT NULL REFERENCES public.zen_claims(id) ON DELETE CASCADE,
  invoice_id  uuid REFERENCES public.zen_invoices(id),
  fee_amount  NUMERIC(18,4) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  created_by  uuid NOT NULL REFERENCES public.zen_profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 오더 상태 제약 조건 업데이트 ('CLAIMED' 추가)
-- 기존 제약 조건을 제거하고 새로 추가 (PostgreSQL 12+ 방식)
DO $$
BEGIN
    -- 기존 제약 조건이 있으면 삭제
    ALTER TABLE public.zen_orders DROP CONSTRAINT IF EXISTS zen_orders_status_check;
    
    -- 신규 제약 조건 추가
    ALTER TABLE public.zen_orders ADD CONSTRAINT zen_orders_status_check 
    CHECK (status IN ('REGISTERED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'RELEASED', 'CANCELED', 'CLAIMED', 'PENDING', 'CONFIRMED', 'WAREHOUSED', 'HELD'));
END $$;

-- 4. 보안 설정 (RLS)
ALTER TABLE public.zen_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_incident_fees ENABLE ROW LEVEL SECURITY;

-- 4.1 zen_claims RLS
-- 화주: 본인 조직의 클레임만 조회 가능, 등록 가능
CREATE POLICY "Shippers can view their own claims" ON public.zen_claims
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles 
            WHERE zen_profiles.id = auth.uid() 
            AND (zen_profiles.org_id = zen_claims.org_id OR zen_profiles.role = 'ADMIN')
        )
    );

CREATE POLICY "Shippers can insert their own claims" ON public.zen_claims
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.zen_profiles 
            WHERE zen_profiles.id = auth.uid() 
            AND zen_profiles.org_id = zen_claims.org_id
        )
    );

-- 어드민: 전체 CRUD
CREATE POLICY "Admins have full access to claims" ON public.zen_claims
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles 
            WHERE zen_profiles.id = auth.uid() 
            AND zen_profiles.role = 'ADMIN'
        )
    );

-- 4.2 zen_incident_fees RLS
-- 화주: 본인 조직과 연계된 사고비 조회 가능
CREATE POLICY "Shippers can view their own incident fees" ON public.zen_incident_fees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_claims 
            JOIN public.zen_profiles ON zen_profiles.org_id = zen_claims.org_id
            WHERE zen_claims.id = zen_incident_fees.claim_id 
            AND (zen_profiles.id = auth.uid() OR zen_profiles.role = 'ADMIN')
        )
    );

-- 어드민: 전체 CRUD
CREATE POLICY "Admins have full access to incident fees" ON public.zen_incident_fees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles 
            WHERE zen_profiles.id = auth.uid() 
            AND zen_profiles.role = 'ADMIN'
        )
    );

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_zen_claims_order_id ON public.zen_claims(order_id);
CREATE INDEX IF NOT EXISTS idx_zen_claims_org_id ON public.zen_claims(org_id);
CREATE INDEX IF NOT EXISTS idx_zen_incident_fees_claim_id ON public.zen_incident_fees(claim_id);
CREATE INDEX IF NOT EXISTS idx_zen_incident_fees_invoice_id ON public.zen_incident_fees(invoice_id);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_zen_claims_updated_at
BEFORE UPDATE ON public.zen_claims
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
