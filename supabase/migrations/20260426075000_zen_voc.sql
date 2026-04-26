-- ==========================================
-- VOC (Voice of Customer) 관련 테이블 생성
-- ==========================================

-- 1. VOC 접수 테이블
CREATE TABLE IF NOT EXISTS zen_voc (
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
CREATE TABLE IF NOT EXISTS zen_voc_answers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voc_id      uuid NOT NULL REFERENCES zen_voc(id) ON DELETE CASCADE,
  answered_by uuid NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. updated_at 트리거 적용 (기존 handle_updated_at 함수 재활용)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_zen_voc') THEN
    CREATE TRIGGER handle_updated_at_zen_voc
    BEFORE UPDATE ON zen_voc
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;

-- 4. RLS 정책 활성화
ALTER TABLE zen_voc ENABLE ROW LEVEL SECURITY;
ALTER TABLE zen_voc_answers ENABLE ROW LEVEL SECURITY;

-- 5. zen_voc RLS 정책 (기본)
-- User: 본인 조직의 VOC만 조회
DROP POLICY IF EXISTS "Users can view own organization's VOCs" ON zen_voc;
CREATE POLICY "Users can view own organization's VOCs"
ON zen_voc FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- User: VOC 등록 (본인 조직 오더에 대해서만)
DROP POLICY IF EXISTS "Users can create VOCs for own organization orders" ON zen_voc;
CREATE POLICY "Users can create VOCs for own organization orders"
ON zen_voc FOR INSERT
WITH CHECK (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);
