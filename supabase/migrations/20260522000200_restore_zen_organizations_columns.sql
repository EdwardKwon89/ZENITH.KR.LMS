-- Restore columns dropped by remote schema to keep compatibility with server actions and handle_new_user trigger
ALTER TABLE public.zen_organizations ADD COLUMN IF NOT EXISTS biz_no text;
ALTER TABLE public.zen_organizations ADD COLUMN IF NOT EXISTS corporate_id text;
ALTER TABLE public.zen_organizations ADD COLUMN IF NOT EXISTS rep_name text;
ALTER TABLE public.zen_organizations ADD COLUMN IF NOT EXISTS approval_date timestamp with time zone;
ALTER TABLE public.zen_organizations ADD COLUMN IF NOT EXISTS approval_comment text;
