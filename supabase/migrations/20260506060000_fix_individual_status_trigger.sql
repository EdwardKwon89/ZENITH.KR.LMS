-- WBS 1.3: Fix Individual User Initial Status
-- [W] Execution Agent / [A] Audit Agent

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_org_id UUID;
    final_org_type TEXT;
    final_role TEXT;
    final_status TEXT := 'PENDING'; -- 기본 상태
BEGIN
    -- [A] 데이터 추출 및 개인/법인 분기
    IF (new.raw_user_meta_data->>'is_new_org')::boolean = true THEN
        -- 신규 법인 생성
        INSERT INTO public.zen_organizations (name, biz_no, type, status)
        VALUES (
            new.raw_user_meta_data->>'org_name',
            new.raw_user_meta_data->>'business_number',
            COALESCE(new.raw_user_meta_data->>'org_type', 'SHIPPER'),
            'PENDING'
        )
        RETURNING id INTO target_org_id;
        
        final_org_type := COALESCE(new.raw_user_meta_data->>'org_type', 'SHIPPER');
        final_role := 'ADMIN'; 

    ELSIF (new.raw_user_meta_data->>'org_id') IS NOT NULL THEN
        -- 기존 법인 합류
        target_org_id := (new.raw_user_meta_data->>'org_id')::UUID;
        SELECT type INTO final_org_type FROM public.zen_organizations WHERE id = target_org_id;
        final_role := 'MEMBER';

    ELSE
        -- 개인 회원 (Master Edward님의 지침에 따라 SHIPPER 고정)
        final_org_type := 'SHIPPER';
        final_role := 'INDIVIDUAL';
        final_status := 'ACTIVE'; -- 개인 회원은 즉시 활성화
    END IF;

    -- [B] public.zen_profiles 테이블 생성
    INSERT INTO public.zen_profiles (id, email, full_name, role, status, org_id)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        final_role,
        final_status,
        target_org_id
    );

    -- [C] auth.users의 raw_app_meta_data 동기화
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || 
        jsonb_build_object(
            'org_type', final_org_type,
            'role', final_role,
            'status', final_status
        )
    WHERE id = new.id;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
