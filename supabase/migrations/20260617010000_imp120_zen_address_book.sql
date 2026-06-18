-- IMP-120: R5 주소록 — zen_address_book + zen_orders.recipient_address_local
-- Issue #23 / TASK-151

-- ============================================================
-- 1. zen_address_book 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS public.zen_address_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.zen_organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_address TEXT NOT NULL,
    recipient_address_local TEXT,
    recipient_phone TEXT,
    country_code TEXT,
    display_mode TEXT NOT NULL DEFAULT 'EN' CHECK (display_mode IN ('EN', 'BILINGUAL')),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- org_id / user_id 중 하나는 반드시 존재
    CONSTRAINT zen_address_book_owner_check CHECK (
        (org_id IS NOT NULL AND user_id IS NULL) OR
        (org_id IS NULL AND user_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.zen_address_book IS '조직/사용자별 수취인 주소록';

-- ============================================================
-- 2. zen_orders에 recipient_address_local 컬럼 추가
-- ============================================================
ALTER TABLE public.zen_orders
    ADD COLUMN IF NOT EXISTS recipient_address_local TEXT;

COMMENT ON COLUMN public.zen_orders.recipient_address_local IS '수취인 주소 현지어 표기';

-- ============================================================
-- 3. 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_zen_address_book_org_id ON public.zen_address_book(org_id);
CREATE INDEX IF NOT EXISTS idx_zen_address_book_user_id ON public.zen_address_book(user_id);
CREATE INDEX IF NOT EXISTS idx_zen_address_book_is_default ON public.zen_address_book(is_default);

-- ============================================================
-- 4. RLS 활성화
-- ============================================================
ALTER TABLE public.zen_address_book ENABLE ROW LEVEL SECURITY;

-- 기본 차단 정책
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'zen_address_book' AND policyname = 'zen_address_book_default_deny'
    ) THEN
        CREATE POLICY zen_address_book_default_deny ON public.zen_address_book
            FOR ALL TO authenticated
            USING (false);
    END IF;
END $$;

-- 조직 멤버 접근 정책
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'zen_address_book' AND policyname = 'zen_address_book_org_member_access'
    ) THEN
        CREATE POLICY zen_address_book_org_member_access ON public.zen_address_book
            FOR ALL TO authenticated
            USING (
                org_id IS NOT NULL AND
                EXISTS (
                    SELECT 1 FROM public.zen_organization_members om
                    WHERE om.org_id = zen_address_book.org_id
                      AND om.user_id = auth.uid()
                      AND om.status = 'ACTIVE'
                )
            );
    END IF;
END $$;

-- 개인 사용자 접근 정책
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'zen_address_book' AND policyname = 'zen_address_book_user_access'
    ) THEN
        CREATE POLICY zen_address_book_user_access ON public.zen_address_book
            FOR ALL TO authenticated
            USING (
                user_id IS NOT NULL AND user_id = auth.uid()
            );
    END IF;
END $$;

-- ============================================================
-- 5. updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_zen_address_book_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_zen_address_book_updated_at ON public.zen_address_book;
CREATE TRIGGER trg_zen_address_book_updated_at
    BEFORE UPDATE ON public.zen_address_book
    FOR EACH ROW
    EXECUTE FUNCTION public.update_zen_address_book_updated_at();
