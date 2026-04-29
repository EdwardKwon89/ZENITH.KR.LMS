-- ==========================================
-- 고객지원 포털 (Support Portal) 관련 테이블 생성
-- ==========================================

-- 1. 1:1 문의 (QnA)
CREATE TABLE IF NOT EXISTS zen_qna (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid REFERENCES zen_orders(id) ON DELETE SET NULL,
  org_id      uuid NOT NULL REFERENCES zen_organizations(id),
  created_by  uuid NOT NULL REFERENCES zen_profiles(id),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','IN_PROGRESS','ANSWERED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 문의 답변 (QnA Answers)
CREATE TABLE IF NOT EXISTS zen_qna_answers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qna_id      uuid NOT NULL REFERENCES zen_qna(id) ON DELETE CASCADE,
  answered_by uuid NOT NULL REFERENCES zen_profiles(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 자주 묻는 질문 (FAQ)
CREATE TABLE IF NOT EXISTS zen_faq (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL CHECK (category IN ('ORDER','INVOICE','TRACKING','ROUTING','GENERAL')),
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  order_no    INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  uuid REFERENCES zen_profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 공지사항 (Notice)
CREATE TABLE IF NOT EXISTS zen_notices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  is_important BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by   uuid NOT NULL REFERENCES zen_profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 트리거 적용
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_zen_qna') THEN
    CREATE TRIGGER handle_updated_at_zen_qna BEFORE UPDATE ON zen_qna FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_zen_faq') THEN
    CREATE TRIGGER handle_updated_at_zen_faq BEFORE UPDATE ON zen_faq FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_zen_notices') THEN
    CREATE TRIGGER handle_updated_at_zen_notices BEFORE UPDATE ON zen_notices FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;

-- RLS 활성화
ALTER TABLE zen_qna ENABLE ROW LEVEL SECURITY;
ALTER TABLE zen_qna_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE zen_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE zen_notices ENABLE ROW LEVEL SECURITY;

-- zen_qna Policies
CREATE POLICY "Users can view own organization's QnAs" ON zen_qna FOR SELECT USING (
  org_id IN (SELECT org_id FROM zen_profiles WHERE id = auth.uid()) OR 
  (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'ADMIN'
);

CREATE POLICY "Users can create QnAs for own organization" ON zen_qna FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can update QnA status" ON zen_qna FOR UPDATE USING (
  (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'ADMIN'
) WITH CHECK (
  (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- zen_qna_answers Policies
CREATE POLICY "Admins can insert answers" ON zen_qna_answers FOR INSERT WITH CHECK (
  (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'ADMIN'
);

CREATE POLICY "Users can view answers for accessible QnAs" ON zen_qna_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM zen_qna q WHERE q.id = qna_id) OR
  (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- zen_faq Policies
CREATE POLICY "Users can view active FAQs" ON zen_faq FOR SELECT USING (
  is_active = true OR (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'ADMIN'
);

CREATE POLICY "Admins can manage FAQs" ON zen_faq FOR ALL USING (
  (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'ADMIN'
) WITH CHECK (
  (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- zen_notices Policies
CREATE POLICY "Users can view published notices" ON zen_notices FOR SELECT USING (
  is_published = true OR (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'ADMIN'
);

CREATE POLICY "Admins can manage notices" ON zen_notices FOR ALL USING (
  (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'ADMIN'
) WITH CHECK (
  (SELECT role FROM zen_profiles WHERE id = auth.uid()) = 'ADMIN'
);
