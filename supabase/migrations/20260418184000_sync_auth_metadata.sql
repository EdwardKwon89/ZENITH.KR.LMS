-- WBS 1.3: Auth Metadata Synchronization Trigger
-- [W] CTO / [A] Audit Agent

-- 1. handle_new_user 함수 고도화
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_org_id UUID;
    final_org_type TEXT;
    final_role TEXT;
    final_status TEXT := 'PENDING'; -- 기본 상태는 심사 대기
BEGIN
    -- [A] 데이터 추출 및 개인/법인 분기
    -- 개인 회원(is_new_org/org_id 없음)인 경우 SHIPPER로 고정
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
        final_role := 'ADMIN'; -- 조직 창설자는 관리자

    ELSIF (new.raw_user_meta_data->>'org_id') IS NOT NULL THEN
        -- 기존 법인 합류
        target_org_id := (new.raw_user_meta_data->>'org_id')::UUID;
        
        -- 조직 테이블에서 타입 조회
        SELECT type INTO final_org_type FROM public.zen_organizations WHERE id = target_org_id;
        final_role := 'MEMBER';

    ELSE
        -- 개인 회원 (Master Edward님의 지침에 따라 SHIPPER 고정)
        final_org_type := 'SHIPPER';
        final_role := 'USER';
        -- 개인 회원은 즉시 활성화할지, 심사할지 정책에 따라 다르나 안전을 위해 PENDING 기본값 유지
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

    -- [C] auth.users의 raw_app_meta_data에 시스템 권한 정보 동기화 (가장 중요)
    -- 시스템 미들웨어가 이를 참조하여 실시간 라우팅 가드 수행
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
-- 트리거 재등록 (존재하지 않을 경우를 대비)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
