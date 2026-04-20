
-- 1. UAT 조직 상태를 보완 요청(SUPPLEMENT_REQUIRED)으로 전환
UPDATE public.organizations 
SET status = 'SUPPLEMENT_REQUIRED'
WHERE org_name_ko = 'UAT Test Corp';

-- 2. 관련 로그나 사유가 필요하다면 추가 (필요 시)
-- (현재는 상태 변경만으로도 가입 신청 수정 버튼 활성화 가능)
