-- E2E 테스트 관리자 계정 보정 마이그레이션
-- [목적] admin@zenith.kr 계정이 zen_profiles에 누락되어 있거나 권한 정보가 JWT에 반영되지 않는 문제 해결

DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- 이메일로 관리자 ID 조회
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@zenith.kr';

    IF admin_id IS NOT NULL THEN
        -- 1. zen_profiles 테이블에 관리자 프로필 생성 또는 업데이트
        INSERT INTO public.zen_profiles (id, email, full_name, role, status)
        VALUES (admin_id, 'admin@zenith.kr', 'System Admin', 'ADMIN', 'ACTIVE')
        ON CONFLICT (id) DO UPDATE 
        SET role = 'ADMIN', 
            status = 'ACTIVE',
            full_name = EXCLUDED.full_name;

        -- 2. auth.users 테이블의 메타데이터 보정 (JWT 발급 시 반영됨)
        -- raw_app_meta_data: 시스템 권한 정보 (role, status)
        UPDATE auth.users
        SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
            'role', 'ADMIN',
            'status', 'ACTIVE',
            'org_type', 'PLATFORM'
        )
        WHERE id = admin_id;

        -- raw_user_meta_data: 사용자 프로필 정보 동기화
        UPDATE auth.users
        SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
            'role', 'ADMIN',
            'status', 'ACTIVE',
            'full_name', 'System Admin'
        )
        WHERE id = admin_id;
    ELSE
        RAISE NOTICE 'Admin user (admin@zenith.kr) not found in auth.users';
    END IF;

END $$;
