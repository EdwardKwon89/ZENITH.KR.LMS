
-- 관리자 및 테스트용 이메일 목록
DO $$
DECLARE
    target_emails TEXT[] := ARRAY[
        'governance_master@zenith.kr',
        'test_corp_001@zenith.kr',
        'admin_zenith@zenith.kr',
        'test_admin_v2@zenith.kr',
        'admin_v4@zenith.kr'
    ];
BEGIN
    -- 1. 프로필 삭제
    DELETE FROM public.profiles WHERE email = ANY(target_emails);
    
    -- 2. 관련 조직 서류 삭제
    DELETE FROM public.organization_documents 
    WHERE org_id IN (SELECT id FROM public.organizations WHERE org_name_ko IN ('ZENITH GOVERNANCE', 'UAT Test Corp', 'ZENITH PLATFORM', 'ZENITH_LMS_ADMIN'));

    -- 3. 테스트 조직 삭제
    DELETE FROM public.organizations 
    WHERE org_name_ko IN ('ZENITH GOVERNANCE', 'UAT Test Corp', 'ZENITH PLATFORM', 'ZENITH_LMS_ADMIN');

    -- 4. Auth User 삭제
    DELETE FROM auth.users WHERE email = ANY(target_emails);
END $$;
