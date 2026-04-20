
-- 1. 관리자 조직 및 프로필 강제 셋업
DO $BOOTSTRAP$
DECLARE
    v_admin_id UUID;
    v_admin_org_id UUID;
    v_tester_id UUID;
    v_tester_org_id UUID;
BEGIN
    -- 관리자 데이터 (governance_master)
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'governance_master@zenith.kr';
    IF v_admin_id IS NOT NULL THEN
        -- 조직 생성/확인
        SELECT id INTO v_admin_org_id FROM public.organizations WHERE org_name_ko = 'ZENITH GOVERNANCE';
        IF v_admin_org_id IS NULL THEN
            INSERT INTO public.organizations (org_name_ko, biz_no, org_type, status)
            VALUES ('ZENITH GOVERNANCE', '999-99-99999', 'PLATFORM', 'ACTIVE')
            RETURNING id INTO v_admin_org_id;
        ELSE
            UPDATE public.organizations SET status = 'ACTIVE', org_type = 'PLATFORM' WHERE id = v_admin_org_id;
        END IF;

        -- 프로필 주입 (ADMIN 권한)
        INSERT INTO public.profiles (id, email, full_name, role, status, org_id)
        VALUES (v_admin_id, 'governance_master@zenith.kr', 'Governance Master', 'ADMIN', 'ACTIVE', v_admin_org_id)
        ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', status = 'ACTIVE', org_id = v_admin_org_id;
    END IF;

    -- 테스터 데이터 (test_corp_001)
    SELECT id INTO v_tester_id FROM auth.users WHERE email = 'test_corp_001@zenith.kr';
    IF v_tester_id IS NOT NULL THEN
        -- 조직 생성/확인
        SELECT id INTO v_tester_org_id FROM public.organizations WHERE org_name_ko = 'UAT Test Corp';
        IF v_tester_org_id IS NULL THEN
            INSERT INTO public.organizations (org_name_ko, biz_no, org_type, status)
            VALUES ('UAT Test Corp', '123-45-67890', 'SHIPPER', 'PENDING')
            RETURNING id INTO v_tester_org_id;
        ELSE
            UPDATE public.organizations SET status = 'PENDING', org_type = 'SHIPPER' WHERE id = v_tester_org_id;
        END IF;

        -- 프로필 주입 (MEMBER 권한, 가입 대기 상태)
        INSERT INTO public.profiles (id, email, full_name, role, status, org_id)
        VALUES (v_tester_id, 'test_corp_001@zenith.kr', 'UAT Tester', 'MEMBER', 'PENDING', v_tester_org_id)
        ON CONFLICT (id) DO UPDATE SET status = 'PENDING', org_id = v_tester_org_id;

        -- 증빙 서류 강제 주입 (보완 요청 테스트용)
        DELETE FROM public.organization_documents WHERE org_id = v_tester_org_id;
        INSERT INTO public.organization_documents (org_id, doc_type, file_path, status)
        VALUES (v_tester_org_id, 'BUSINESS_LICENSE', 'uat/dummy_biz_reg.pdf', 'PENDING');
    END IF;
END $BOOTSTRAP$;
