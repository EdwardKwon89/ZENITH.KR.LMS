-- 20260813010000_iss1091_hs_code_lookups_cache.sql
-- TASK-B-293 (Issue #1091): HS Code 조회 캐시 테이블
--
-- 배경: /api/hs-lookup이 매 요청마다 Claude Haiku를 재호출해 동일 품목명도 비용 발생.
--       캐시 키는 품목명 단독(lower(trim)) — HS Code 6자리는 국제 공통표준이라 목적지 무관,
--       키에 목적지 포함 시 재사용률만 떨어진다. 조회 결과는 조직/화주 무관 전역 공유 캐시.

CREATE TABLE public.zen_hs_code_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name_normalized TEXT UNIQUE NOT NULL, -- lower(trim(item_name))
  hs_code TEXT NOT NULL,
  confidence TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT ON public.zen_hs_code_lookups TO authenticated;
GRANT ALL ON public.zen_hs_code_lookups TO service_role;

ALTER TABLE public.zen_hs_code_lookups ENABLE ROW LEVEL SECURITY;

-- READ: 모든 authenticated 허용 (전역 캐시 조회 목적 — 품목명+HS코드로 개인정보 아님)
DROP POLICY IF EXISTS "Authenticated users can read hs code cache" ON public.zen_hs_code_lookups;
CREATE POLICY "Authenticated users can read hs code cache"
ON public.zen_hs_code_lookups FOR SELECT
TO authenticated
USING (true);
