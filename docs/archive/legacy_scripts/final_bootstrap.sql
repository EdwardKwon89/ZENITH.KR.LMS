
-- 1. 관리자 권한 부여
UPDATE public.profiles 
SET role = 'ADMIN', status = 'ACTIVE' 
WHERE email = 'governance_master@zenith.kr';

UPDATE public.organizations 
SET org_type = 'PLATFORM', status = 'ACTIVE' 
WHERE org_name_ko = 'ZENITH GOVERNANCE';

-- 2. 테스트 사용자 PENDING 상태 구축 (유저가 없는 경우 프로필 생성)
DO $BODY$
DECLARE
    v_tester_id UUID;
    v_org_id UUID;
BEGIN
    SELECT id INTO v_tester_id FROM auth.users WHERE email = 'test_corp_001@zenith.kr';
    
    IF v_tester_id IS NOT NULL THEN
        -- 조직 확인 또는 생성
        SELECT id INTO v_org_id FROM public.organizations WHERE org_name_ko = 'UAT Test Corp';
        IF v_org_id IS NULL THEN
            INSERT INTO public.organizations (org_name_ko, biz_no, org_type, status)
            VALUES ('UAT Test Corp', '123-45-67890', 'SHIPPER', 'PENDING')
            RETURNING id INTO v_org_id;
        END IF;

        -- 프로필 및 조직 연결
        INSERT INTO public.profiles (id, email, full_name, role, status, org_id)
        VALUES (v_tester_id, 'test_corp_001@zenith.kr', 'UAT Tester', 'MEMBER', 'PENDING', v_org_id)
        ON CONFLICT (id) DO UPDATE SET status = 'PENDING', org_id = v_org_id;

        -- 증빙 서류 레코드 주입
        IF NOT EXISTS (SELECT 1 FROM public.organization_documents WHERE org_id = v_org_id) THEN
            INSERT INTO public.organization_documents (org_id, doc_type, file_path, status)
            VALUES (v_org_id, 'BUSINESS_LICENSE', 'uat/dummy_biz_reg.pdf', 'PENDING');
        END IF;
    END IF;
END $BODY$;
