-- 20260609230000_fix_handle_new_user_role_from_metadata.sql
-- TASK-129 DEF-018: read role from raw_user_meta_data instead of hardcoding 'ADMIN'
-- This allows CARRIER org creators to get CARRIER role from login/actions.ts

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_org_id UUID;
    final_org_type TEXT;
    final_role TEXT;
    final_status TEXT := 'PENDING';
BEGIN
    IF (new.raw_user_meta_data->>'is_new_org')::boolean = true THEN
        INSERT INTO public.zen_organizations (name, biz_no, type, status)
        VALUES (
            new.raw_user_meta_data->>'org_name',
            new.raw_user_meta_data->>'business_number',
            COALESCE(new.raw_user_meta_data->>'org_type', 'SHIPPER'),
            'PENDING'
        )
        RETURNING id INTO target_org_id;
        final_org_type := COALESCE(new.raw_user_meta_data->>'org_type', 'SHIPPER');
        final_role := COALESCE(new.raw_user_meta_data->>'role', 'ADMIN');
    ELSIF (new.raw_user_meta_data->>'org_id') IS NOT NULL THEN
        target_org_id := (new.raw_user_meta_data->>'org_id')::UUID;
        SELECT type INTO final_org_type FROM public.zen_organizations WHERE id = target_org_id;
        final_role := 'MEMBER';
    ELSE
        final_org_type := 'SHIPPER';
        final_role := 'INDIVIDUAL';
        final_status := 'ACTIVE';
    END IF;

    -- Single INSERT into zen_profiles (profiles table was removed)
    INSERT INTO public.zen_profiles (id, email, full_name, role, status, org_id, grade_code)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        final_role,
        final_status,
        target_org_id,
        'IRON'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        org_id = EXCLUDED.org_id;

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
