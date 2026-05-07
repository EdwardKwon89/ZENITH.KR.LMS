-- [목적] E2E-09 조인 오류 해결 및 프로필 테이블 동기화 보강
-- [내용]
-- 1. grade_promotion_request 테이블의 user_id 외래 키를 public.zen_profiles로 변경 (PostgREST 조인 지원)
-- 2. handle_new_user 트리거에서 profiles와 zen_profiles 양쪽 모두를 생성하도록 보정

BEGIN;

-- 1. 외래 키 제약 조건 변경
ALTER TABLE public.grade_promotion_request 
DROP CONSTRAINT IF EXISTS grade_promotion_request_user_id_fkey;

ALTER TABLE public.grade_promotion_request
ADD CONSTRAINT grade_promotion_request_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.zen_profiles(id) ON DELETE CASCADE;

-- 2. handle_new_user 트리거 보정
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

    -- [B] public.zen_profiles 테이블 생성 (신규 표준)
    INSERT INTO public.zen_profiles (id, email, full_name, role, status, org_id)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        final_role,
        final_status,
        target_org_id
    );

    -- [B-2] public.profiles 테이블 생성 (기존 호환성 유지)
    -- profiles 테이블에 id, email, full_name, role, status, org_id가 있는지 확인 필요하나
    -- 일반적으로 zenith 프로젝트에서는 zen_ 접두어가 붙은 것이 신규 표준임.
    -- 하지만 profiles 테이블도 사용 중이므로 최소한의 데이터는 넣어줌.
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
    ) ON CONFLICT (id) DO NOTHING;

    -- [C] auth.users의 raw_app_meta_data 동기화 (JWT 권한용)
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

COMMIT;
