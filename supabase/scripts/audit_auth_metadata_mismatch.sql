-- Issue #340: Auth app_metadata vs zen_profiles DB 불일치 전수 점검
-- 사용법: supabase db query -f supabase/scripts/audit_auth_metadata_mismatch.sql

-- 1. role/org_id/status 불일치 체크
SELECT
  au.id,
  au.email,
  au.raw_app_meta_data->>'role' AS jwt_role,
  zp.role AS db_role,
  au.raw_app_meta_data->>'org_id' AS jwt_org_id,
  zp.org_id AS db_org_id,
  au.raw_app_meta_data->>'org_type' AS jwt_org_type,
  zo.type AS db_org_type,
  au.raw_app_meta_data->>'status' AS jwt_status,
  zp.status AS db_status
FROM auth.users au
LEFT JOIN public.zen_profiles zp ON zp.id = au.id
LEFT JOIN public.zen_organizations zo ON zo.id = zp.org_id
WHERE
  zp.id IS NOT NULL
  AND (
    COALESCE(au.raw_app_meta_data->>'role', '') != COALESCE(zp.role, '')
    OR COALESCE(au.raw_app_meta_data->>'org_id', '') != COALESCE(zp.org_id::text, '')
    OR COALESCE(au.raw_app_meta_data->>'status', '') != COALESCE(zp.status, '')
  )
ORDER BY au.email;

-- 2. org_id 누락 체크 (profile에는 있지만 JWT에는 없는 경우)
SELECT
  au.id,
  au.email,
  zp.role,
  zp.org_id,
  au.raw_app_meta_data->>'org_id' AS jwt_org_id
FROM auth.users au
JOIN public.zen_profiles zp ON zp.id = au.id
WHERE
  zp.org_id IS NOT NULL
  AND (au.raw_app_meta_data->>'org_id') IS NULL
ORDER BY au.email;

-- 3. profile이 없는 auth user 체크 (고아 계정)
SELECT
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at
FROM auth.users au
LEFT JOIN public.zen_profiles zp ON zp.id = au.id
WHERE zp.id IS NULL
ORDER BY au.created_at DESC;
