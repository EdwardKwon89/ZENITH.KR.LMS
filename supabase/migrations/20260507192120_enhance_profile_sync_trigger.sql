-- [목적] E2E-10 권한 오류 해결을 위한 프로필 동기화 트리거 보완 (v2: zen_profiles 컬럼명 수정)
-- [내용] handle_new_user 트리거에서 profiles 및 zen_profiles 테이블 삽입 시 ON CONFLICT DO UPDATE 적용

BEGIN;

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
        -- 개인 회원 (SHIPPER 고정)
        final_org_type := 'SHIPPER';
        final_role := 'INDIVIDUAL';
        final_status := 'ACTIVE'; -- 개인 회원은 즉시 활성화
    END IF;

    -- [B] public.zen_profiles 테이블 생성/갱신 (신규 표준)
    -- zen_profiles는 updated_at 컬럼이 없음
    INSERT INTO public.zen_profiles (id, email, full_name, role, status, org_id)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        final_role,
        final_status,
        target_org_id
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        org_id = EXCLUDED.org_id;

    -- [B-2] public.profiles 테이블 생성/갱신 (기존 호환성 유지)
    INSERT INTO public.profiles (id, email, full_name, role, status, org_id, grade_code, is_approved)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        final_role,
        final_status,
        target_org_id,
        'IRON', -- 초기 등급
        (final_status = 'ACTIVE') -- ACTIVE면 승인된 것으로 간주
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        org_id = EXCLUDED.org_id,
        is_approved = EXCLUDED.is_approved,
        updated_at = NOW();

    -- [C] auth.users의 raw_app_meta_data 동기화 (JWT 권한용)
    UPDATE auth.users
    SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'org_id', target_org_id,
            'role', final_role,
            'org_type', final_org_type
        )
    WHERE id = new.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
