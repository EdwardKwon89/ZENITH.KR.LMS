-- IMP-049: Merge dual profiles/zen_profiles tables
-- Moves grade_code from profiles to zen_profiles, drops profiles table,
-- creates a backward-compatible VIEW for existing RLS policies.
--
-- Migration steps:
--   M1: ADD COLUMN grade_code TO zen_profiles + FK + INDEX
--   M2: Migrate grade_code data from profiles → zen_profiles
--   M3: Drop ALL FK constraints referencing profiles(id), recreate → zen_profiles(id)
--   M4: DROP TRIGGER set_profile_updated_at ON profiles
--   M5: Update handle_new_user trigger — remove profiles INSERT, add grade_code
--   M6: Backup grade_code, DROP TABLE profiles
--   M7: CREATE VIEW profiles AS SELECT … FROM zen_profiles (RLS compat)
--
-- Rollback (see end of file)

BEGIN;

-- ============================================================
-- M1: Add grade_code column to zen_profiles
-- ============================================================
ALTER TABLE public.zen_profiles
  ADD COLUMN IF NOT EXISTS grade_code TEXT;

ALTER TABLE public.zen_profiles
  ADD CONSTRAINT zen_profiles_grade_code_fkey
  FOREIGN KEY (grade_code) REFERENCES public.grade_master(grade_code);

CREATE INDEX IF NOT EXISTS idx_zen_profiles_grade_code
  ON public.zen_profiles(grade_code);

-- ============================================================
-- M2: Migrate grade_code data from profiles → zen_profiles
-- ============================================================
UPDATE public.zen_profiles zp
  SET grade_code = p.grade_code
  FROM public.profiles p
  WHERE zp.id = p.id
    AND p.grade_code IS NOT NULL;

-- Set default grade_code for rows that don't have one yet
UPDATE public.zen_profiles
  SET grade_code = 'IRON'
  WHERE grade_code IS NULL;

-- ============================================================
-- M3: Drop ALL FK constraints referencing profiles(id)
--      then recreate pointing to zen_profiles(id)
-- ============================================================
DO $$
DECLARE
  fk RECORD;
  cnt INT := 0;
BEGIN
  FOR fk IN
    SELECT tc.constraint_name, tc.table_schema, tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_catalog = kcu.constraint_catalog
     AND tc.constraint_schema  = kcu.constraint_schema
     AND tc.constraint_name    = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_catalog = ccu.constraint_catalog
     AND tc.constraint_schema  = ccu.constraint_schema
     AND tc.constraint_name    = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name   = 'profiles'
      AND ccu.table_schema = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      fk.table_schema, fk.table_name, fk.constraint_name
    );
    RAISE NOTICE 'Dropped FK % on %.%(%): OK',
      fk.constraint_name, fk.table_schema, fk.table_name, fk.column_name;
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'Total FKs dropped referencing profiles(id): %', cnt;
END $$;

-- Recreate known FKs pointing to zen_profiles(id)
-- (Tables not listed here no longer need an FK — their RLS handles authz)

ALTER TABLE public.zen_error_logs
  DROP CONSTRAINT IF EXISTS zen_error_logs_user_id_fkey;
ALTER TABLE public.zen_error_logs
  ADD CONSTRAINT zen_error_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.zen_profiles(id);

ALTER TABLE public.zen_orders
  DROP CONSTRAINT IF EXISTS zen_orders_created_by_fkey;
ALTER TABLE public.zen_orders
  ADD CONSTRAINT zen_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.zen_profiles(id);

ALTER TABLE public.zen_faq
  DROP CONSTRAINT IF EXISTS zen_faq_created_by_fkey;
ALTER TABLE public.zen_faq
  ADD CONSTRAINT zen_faq_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.zen_profiles(id);

ALTER TABLE public.zen_feature_flags
  DROP CONSTRAINT IF EXISTS zen_feature_flags_updated_by_fkey;
ALTER TABLE public.zen_feature_flags
  ADD CONSTRAINT zen_feature_flags_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.zen_profiles(id);

ALTER TABLE public.zen_notices
  DROP CONSTRAINT IF EXISTS zen_notices_created_by_fkey;
ALTER TABLE public.zen_notices
  ADD CONSTRAINT zen_notices_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.zen_profiles(id);

ALTER TABLE public.zen_notifications
  DROP CONSTRAINT IF EXISTS zen_notifications_user_id_fkey;
ALTER TABLE public.zen_notifications
  ADD CONSTRAINT zen_notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.zen_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.zen_param_audit_log
  DROP CONSTRAINT IF EXISTS zen_param_audit_log_changed_by_fkey;
ALTER TABLE public.zen_param_audit_log
  ADD CONSTRAINT zen_param_audit_log_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES public.zen_profiles(id);

ALTER TABLE public.zen_qna
  DROP CONSTRAINT IF EXISTS zen_qna_created_by_fkey;
ALTER TABLE public.zen_qna
  ADD CONSTRAINT zen_qna_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.zen_profiles(id);

ALTER TABLE public.zen_qna_answers
  DROP CONSTRAINT IF EXISTS zen_qna_answers_answered_by_fkey;
ALTER TABLE public.zen_qna_answers
  ADD CONSTRAINT zen_qna_answers_answered_by_fkey
  FOREIGN KEY (answered_by) REFERENCES public.zen_profiles(id);

ALTER TABLE public.zen_system_params
  DROP CONSTRAINT IF EXISTS zen_system_params_updated_by_fkey;
ALTER TABLE public.zen_system_params
  ADD CONSTRAINT zen_system_params_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.zen_profiles(id);

ALTER TABLE public.zen_wallet_transactions
  DROP CONSTRAINT IF EXISTS zen_wallet_transactions_created_by_fkey;
ALTER TABLE public.zen_wallet_transactions
  ADD CONSTRAINT zen_wallet_transactions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.zen_profiles(id);

-- These tables already have zen_profiles FKs from earlier fix migrations:
--   grade_promotion_request → zen_profiles(id) (20260506115337)
--   zen_voc                → zen_profiles(id) (20260505120918)
--   zen_voc_answers        → zen_profiles(id) (20260505120918)
-- Keep those — just ensure any stale profiles FKs are gone.
ALTER TABLE public.grade_promotion_request
  DROP CONSTRAINT IF EXISTS grade_promotion_request_user_id_fkey;
ALTER TABLE public.zen_voc
  DROP CONSTRAINT IF EXISTS zen_voc_created_by_fkey;
ALTER TABLE public.zen_voc_answers
  DROP CONSTRAINT IF EXISTS zen_voc_answers_answered_by_fkey;

-- ============================================================
-- M4: Drop trigger on profiles table
-- ============================================================
DROP TRIGGER IF EXISTS set_profile_updated_at ON public.profiles;

-- ============================================================
-- M5: Update handle_new_user trigger — remove profiles INSERT
-- ============================================================
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
        final_role := 'ADMIN';
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

-- ============================================================
-- M6: Backup grade_code, DROP TABLE profiles
-- ============================================================
-- Backup: ensure grade_code is preserved
CREATE TABLE IF NOT EXISTS public._profiles_grade_backup_20260521 AS
SELECT id, grade_code FROM public.zen_profiles WHERE grade_code IS NOT NULL;

DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================
-- M7: CREATE VIEW profiles AS SELECT … FROM zen_profiles
--      (RLS backward compatibility for ~60 existing policies)
-- ============================================================
CREATE OR REPLACE VIEW public.profiles WITH (security_invoker=true) AS
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
    preferred_language
FROM public.zen_profiles;

COMMIT;

-- ============================================================
-- ROLLBACK
-- ============================================================
-- /*
--   DROP VIEW IF EXISTS public.profiles CASCADE;
--   CREATE TABLE public.profiles (
--     id uuid NOT NULL,
--     org_id uuid,
--     email character varying(255),
--     full_name character varying(100),
--     role character varying(20) DEFAULT 'USER',
--     grade_code character varying(20) DEFAULT 'FAMILY',
--     is_approved boolean DEFAULT false,
--     created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
--     updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
--     status text DEFAULT 'ACTIVE',
--     preferred_language text DEFAULT 'ko'
--   );
--   INSERT INTO public.profiles (id, org_id, email, full_name, role, grade_code, status, preferred_language, created_at)
--     SELECT id, org_id, email, full_name, role, grade_code, status, preferred_language, created_at
--     FROM public.zen_profiles;
--
--   -- Recreate FK constraints on profiles
--   ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
--   ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
--   ALTER TABLE public.profiles ADD CONSTRAINT profiles_grade_code_fkey FOREIGN KEY (grade_code) REFERENCES public.grade_master(grade_code);
--   ALTER TABLE public.profiles ADD CONSTRAINT profiles_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
--   CREATE TRIGGER set_profile_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
--
--   -- Restore old handle_new_user trigger (with dual INSERT)
--   -- See: 20260507192120_enhance_profile_sync_trigger.sql
--
--   -- Note: FK constraints from other tables → profiles(id) were recreated
--   -- above pointing to zen_profiles(id). Rollback would need to drop those
--   -- and recreate them pointing to public.profiles(id).
-- */
