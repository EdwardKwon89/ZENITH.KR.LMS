-- Migration: Add preferred_language back to zen_profiles before merging profiles table
-- Timestamp: 20260521195900
-- Bug: imp049 view references preferred_language which doesn't exist on zen_profiles at that point in migrations

ALTER TABLE public.zen_profiles ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'ko';
