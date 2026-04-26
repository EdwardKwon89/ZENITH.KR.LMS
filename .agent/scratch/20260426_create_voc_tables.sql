-- ==========================================
-- VOC (Voice of Customer) 관련 테이블 생성
-- ==========================================

-- 1. VOC 접수 테이블
CREATE TABLE zen_voc (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES zen_orders(id) ON DELETE RESTRICT,
  org_id      uuid NOT NULL REFERENCES zen_organizations(id),
  created_by  uuid NOT NULL REFERENCES profiles(id),
  type        TEXT NOT NULL CHECK (type IN ('DELAY','DAMAGE','MISDELIVERY','OTHER')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','CLOSED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. VOC 답변 이력 테이블
CREATE TABLE zen_voc_answers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voc_id      uuid NOT NULL REFERENCES zen_voc(id) ON DELETE CASCADE,
  answered_by uuid NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. updated_at 트리거 적용 (기존 handle_updated_at 함수 재활용)
CREATE TRIGGER handle_updated_at_zen_voc
BEFORE UPDATE ON zen_voc
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- 4. RLS 정책 활성화
ALTER TABLE zen_voc ENABLE ROW LEVEL SECURITY;
ALTER TABLE zen_voc_answers ENABLE ROW LEVEL SECURITY;

-- 5. zen_voc RLS 정책
-- User: 본인 조직의 VOC만 조회
CREATE POLICY "Users can view own organization's VOCs"
ON zen_voc FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- Admin: 모든 VOC 조회
CREATE POLICY "Admins can view all VOCs"
ON zen_voc FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('ZENITH_ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
  )
);

-- User: VOC 등록 (본인 조직 오더에 대해서만)
CREATE POLICY "Users can create VOCs for own organization orders"
ON zen_voc FOR INSERT
WITH CHECK (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- Admin: VOC 상태 업데이트 (status 변경 전용)
CREATE POLICY "Admins can update VOC status"
ON zen_voc FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('ZENITH_ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('ZENITH_ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
  )
);

-- 6. zen_voc_answers RLS 정책
-- Admin: 답변 조회 및 등록 가능
CREATE POLICY "Admins can manage VOC answers"
ON zen_voc_answers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('ZENITH_ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('ZENITH_ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
  )
);

-- User: 본인 조직 VOC에 달린 답변 조회 허용
CREATE POLICY "Users can view answers for own organization VOCs"
ON zen_voc_answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM zen_voc v
    JOIN profiles p ON v.org_id = p.org_id
    WHERE v.id = zen_voc_answers.voc_id AND p.id = auth.uid()
  )
);
