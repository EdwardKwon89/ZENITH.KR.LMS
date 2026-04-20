
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_org_id UUID;
BEGIN
    -- 1. 법인 신규 생성인 경우
    IF (new.raw_user_meta_data->>'is_new_org')::boolean = true THEN
        INSERT INTO public.organizations (org_name_ko, biz_no, org_type, status)
        VALUES (
            new.raw_user_meta_data->>'org_name',
            new.raw_user_meta_data->>'business_number',
            COALESCE(new.raw_user_meta_data->>'org_type', 'SHIPPER'),
            'PENDING'
        )
        RETURNING id INTO target_org_id;
    -- 2. 이미 존재하는 조직에 합류하는 경우
    ELSIF (new.raw_user_meta_data->>'org_id') IS NOT NULL THEN
        target_org_id := (new.raw_user_meta_data->>'org_id')::UUID;
    END IF;

    -- 3. 프로필 생성
    INSERT INTO public.profiles (id, email, full_name, role, status, org_id)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        COALESCE(new.raw_user_meta_data->>'role', 'MEMBER'),
        'ACTIVE',
        target_org_id
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
