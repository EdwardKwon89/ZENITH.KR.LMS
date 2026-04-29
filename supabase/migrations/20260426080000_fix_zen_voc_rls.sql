-- BUG-SPR3-01: zen_voc Admin RLS 역할명 교정
-- 원인: 기존 정책에서 존재하지 않는 역할명(ZENITH_ADMIN, MANAGER)을 사용함
-- 수정: 실제 zen_profiles.role 값인 'ADMIN', 'ZENITH_SUPER_ADMIN'으로 교체

-- 1. zen_voc 정책 교정
DROP POLICY IF EXISTS "Admins can view all VOCs" ON public.zen_voc;
DROP POLICY IF EXISTS "Admins can update VOC status" ON public.zen_voc;

CREATE POLICY "Admins can view all VOCs" ON public.zen_voc
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  );

CREATE POLICY "Admins can update VOC status" ON public.zen_voc
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  );

-- 2. zen_voc_answers 정책 교정
DROP POLICY IF EXISTS "Admins can manage VOC answers" ON public.zen_voc_answers;
DROP POLICY IF EXISTS "Users can view answers for own organization VOCs" ON public.zen_voc_answers;

CREATE POLICY "Admins can manage VOC answers" ON public.zen_voc_answers
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  );

CREATE POLICY "Users can view answers for own organization VOCs"
ON public.zen_voc_answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_voc v
    JOIN public.zen_profiles p ON v.org_id = p.org_id
    WHERE v.id = public.zen_voc_answers.voc_id AND p.id = auth.uid()
  )
);
