-- UAT-02-02: common_codes / common_code_groups RLS 정책 누락으로
-- getCommonCodesByGroup()가 빈 배열 반환 → STATUS/TYPE 콤보박스 empty
CREATE POLICY "Authenticated users can view common_codes"
ON public.common_codes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view common_code_groups"
ON public.common_code_groups FOR SELECT
TO authenticated
USING (true);
