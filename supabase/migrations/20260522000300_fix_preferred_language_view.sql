-- Migration: Fix profiles VIEW — preferred_language column missing from zen_profiles
-- Timestamp: 20260522000300
-- Bug: imp049 CREATE OR REPLACE VIEW references preferred_language which doesn't exist
CREATE OR REPLACE VIEW public.profiles WITH (security_invoker = on) AS
SELECT
    id,
    org_id,
    email::character varying(255) AS email,
    full_name::character varying(100) AS full_name,
    role::character varying(20) AS role,
    grade_code::character varying(20) AS grade_code,
    NULL::boolean AS is_approved,
    created_at,
    NULL::timestamp with time zone AS updated_at,
    status,
    'ko'::text AS preferred_language
FROM public.zen_profiles;
