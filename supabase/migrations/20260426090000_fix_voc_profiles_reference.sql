-- Fix zen_voc policies to use zen_profiles instead of profiles
-- 원인: 기존 정책에서 zen_profiles 대신 profiles 테이블을 참조하고 있어 RLS 검증 실패 발생
-- 해결: 모든 정책에서 zen_profiles를 참조하도록 수정

-- 1. INSERT 정책 수정 (화주용)
DROP POLICY IF EXISTS "Users can create VOCs for own organization orders" ON public.zen_voc;
DROP POLICY IF EXISTS "Users can create VOCs for own organization zen_orders" ON public.zen_voc;

CREATE POLICY "Users can create VOCs for own organization zen_orders"
ON public.zen_voc FOR INSERT
WITH CHECK (
  org_id IN (
    SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()
  )
);

-- 2. UPDATE 정책 수정 (관리자용)
DROP POLICY IF EXISTS "Admins can update VOC status" ON public.zen_voc;
CREATE POLICY "Admins can update VOC status" ON public.zen_voc
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
  );

-- 2.1 SELECT 정책 (관리자용)
DROP POLICY IF EXISTS "Admins can view all VOCs" ON public.zen_voc;
CREATE POLICY "Admins can view all VOCs" ON public.zen_voc
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
  );

-- 3. zen_voc_answers 정책 수정
DROP POLICY IF EXISTS "Admins can manage VOC answers" ON public.zen_voc_answers;
CREATE POLICY "Admins can manage VOC answers" ON public.zen_voc_answers
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
  );

DROP POLICY IF EXISTS "Users can view answers for own organization VOCs" ON public.zen_voc_answers;
CREATE POLICY "Users can view answers for own organization VOCs"
ON public.zen_voc_answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_voc v
    JOIN public.zen_profiles p ON v.org_id = p.org_id
    WHERE v.id = public.zen_voc_answers.voc_id AND p.id = auth.uid()
  )
);
