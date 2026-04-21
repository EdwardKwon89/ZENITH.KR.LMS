-- 20260421_add_dummy_shipper.sql
-- 시스템 개인 사용자용 더미 화주 조직 생성

INSERT INTO public.zen_organizations (
    id, 
    name, 
    type, 
    status, 
    created_at, 
    updated_at
)
VALUES (
    'e8b8a8b8-c8b8-48b8-a8b8-d8b8a8b8c8d8', -- 시스템 전용 더미 ID
    'SYSTEM_INDIVIDUAL_SHIPPER',
    'SHIPPER',
    'ACTIVE',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 확인
SELECT * FROM public.zen_organizations WHERE id = 'e8b8a8b8-c8b8-48b8-a8b8-d8b8a8b8c8d8';
