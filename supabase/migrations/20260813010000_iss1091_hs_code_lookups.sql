-- 20260813010000_iss1091_hs_code_lookups.sql
-- TASK-B-293 (Issue #1091, P3): HS Code 조회 캐싱 테이블 신설
--
-- 배경: /api/hs-lookup이 항상 Claude Haiku를 호출해 동일 품목명도 재조회 비용 발생.
--       캐시 키는 품목명 단독(lower(trim(item_name))) — HS Code 6자리는 국제 공통표준이라
--       목적지 무관, 조회 결과는 전역 공유 캐시(개인정보 아님: 품목명+HS코드일 뿐).
-- READ/INSERT 모두 authenticated 허용(조회 API가 사용자 세션으로 실행되므로).

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

-- 전역 공유 캐시 조회 — 모든 인증 사용자 SELECT 허용
CREATE POLICY "Authenticated users can read hs code cache"
ON public.zen_hs_code_lookups FOR SELECT TO authenticated USING (true);

-- 캐시 INSERT는 조회 API(사용자 세션)가 수행 — INSERT 정책 필요
-- (설계 확정안의 GRANT INSERT 의도 반영. 정책 누락 시 RLS가 INSERT를 차단함)
CREATE POLICY "Authenticated users can insert hs code cache"
ON public.zen_hs_code_lookups FOR INSERT TO authenticated WITH CHECK (true);
