-- Phase 5 Sprint 12: CCL 통관 관리 시스템 스키마

-- 1. 통관 어댑터 정보 테이블
CREATE TABLE IF NOT EXISTS customs_adapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adapter_code TEXT UNIQUE NOT NULL, -- 'MANUAL', 'UNIPASS', etc.
  adapter_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 통관 신고 정보 테이블
CREATE TABLE IF NOT EXISTS customs_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  adapter_type TEXT NOT NULL DEFAULT 'MANUAL', -- 'MANUAL' | 'EXTERNAL'
  status TEXT NOT NULL DEFAULT 'PENDING',
  -- PENDING / SUBMITTED / APPROVED / HELD / REJECTED
  declaration_no TEXT, -- 관세청 신고번호
  cargo_description TEXT,
  declared_value NUMERIC(18,2),
  currency_code TEXT DEFAULT 'USD',
  admin_note TEXT,
  submitted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 기본 시드 데이터 삽입
INSERT INTO customs_adapters (adapter_code, adapter_name) 
VALUES ('MANUAL', '수동 처리')
ON CONFLICT (adapter_code) DO NOTHING;

-- 4. RLS (Row Level Security) 설정
ALTER TABLE customs_adapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE customs_declarations ENABLE ROW LEVEL SECURITY;

-- 4-1. customs_adapters: 모든 인증된 사용자 조회 가능
CREATE POLICY "Allow select for authenticated users on customs_adapters"
  ON customs_adapters FOR SELECT
  TO authenticated
  USING (true);

-- 4-2. customs_declarations: Admin은 전체 접근, User는 본인 오더 건만 조회
CREATE POLICY "Allow all access for admin on customs_declarations"
  ON customs_declarations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "Allow select for owners on customs_declarations"
  ON customs_declarations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = customs_declarations.order_id AND shipper_id = auth.uid()
    )
  );

-- 5. Updated At 트리거 추가 (기존 core_functions.sql의 handle_updated_at 사용 가정)
CREATE TRIGGER set_updated_at_customs_adapters
  BEFORE UPDATE ON customs_adapters
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_customs_declarations
  BEFORE UPDATE ON customs_declarations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
