-- WBS 4.4.1.1 — zen_wallet, zen_wallet_transactions
-- 설계 명세: WBS 4.4.1 잔액(balance), 충전/차감/환불 이력, org_id 기반 RLS
-- Sprint 5 사전 DB 구성 (Aiden 병행업무 C)
-- 작성일: 2026-04-26

-- ============================================================
-- 1. zen_wallet — 조직별 선불 지갑 테이블
-- ============================================================
CREATE TABLE public.zen_wallet (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL UNIQUE REFERENCES public.zen_organizations(id) ON DELETE CASCADE,
  balance     NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency    TEXT NOT NULL DEFAULT 'USD',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.zen_wallet ENABLE ROW LEVEL SECURITY;

-- Admin: 전체 CRUD
CREATE POLICY "Admins can select zen_wallet" ON public.zen_wallet
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can insert zen_wallet" ON public.zen_wallet
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update zen_wallet" ON public.zen_wallet
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can delete zen_wallet" ON public.zen_wallet
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

-- User: 본인 org_id 행 SELECT (잔액 조회용)
CREATE POLICY "Users can read own org wallet" ON public.zen_wallet
  FOR SELECT USING (
    org_id = (
      SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()
    )
  );

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_zen_wallet_timestamp
  BEFORE UPDATE ON public.zen_wallet
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ============================================================
-- 2. zen_wallet_transactions — 지갑 거래 이력 테이블
-- ============================================================
CREATE TABLE public.zen_wallet_transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id     uuid NOT NULL REFERENCES public.zen_wallet(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('TOP_UP', 'DEDUCT', 'REFUND_REQUEST', 'REFUND')),
  amount        NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  status        TEXT NOT NULL DEFAULT 'COMPLETED'
                  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
  reference_id  uuid,  -- 연관 인보이스 등 외부 참조 (nullable)
  description   TEXT,
  created_by    uuid REFERENCES public.zen_profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.zen_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Admin: 전체 CRUD
CREATE POLICY "Admins can select zen_wallet_transactions" ON public.zen_wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can insert zen_wallet_transactions" ON public.zen_wallet_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update zen_wallet_transactions" ON public.zen_wallet_transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

-- User: 본인 wallet_id 이력 SELECT (충전·차감·환불 이력 조회용)
CREATE POLICY "Users can read own wallet transactions" ON public.zen_wallet_transactions
  FOR SELECT USING (
    wallet_id IN (
      SELECT w.id FROM public.zen_wallet w
      JOIN public.zen_profiles p ON p.org_id = w.org_id
      WHERE p.id = auth.uid()
    )
  );

-- User: 환불 신청 INSERT (type='REFUND_REQUEST', status='PENDING')
CREATE POLICY "Users can insert refund requests" ON public.zen_wallet_transactions
  FOR INSERT WITH CHECK (
    type = 'REFUND_REQUEST'
    AND status = 'PENDING'
    AND wallet_id IN (
      SELECT w.id FROM public.zen_wallet w
      JOIN public.zen_profiles p ON p.org_id = w.org_id
      WHERE p.id = auth.uid()
    )
  );

-- ============================================================
-- 3. 인덱스
-- ============================================================
CREATE INDEX idx_zen_wallet_transactions_wallet_id
  ON public.zen_wallet_transactions (wallet_id, created_at DESC);

CREATE INDEX idx_zen_wallet_transactions_status
  ON public.zen_wallet_transactions (status)
  WHERE status = 'PENDING';
