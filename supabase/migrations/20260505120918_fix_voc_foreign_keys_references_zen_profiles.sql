
-- Fix zen_voc foreign key pointing to wrong table (profiles -> zen_profiles)
ALTER TABLE public.zen_voc DROP CONSTRAINT IF EXISTS zen_voc_created_by_fkey;
ALTER TABLE public.zen_voc ADD CONSTRAINT zen_voc_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.zen_profiles(id);

-- Fix zen_voc_answers foreign key pointing to wrong table (profiles -> zen_profiles)
ALTER TABLE public.zen_voc_answers DROP CONSTRAINT IF EXISTS zen_voc_answers_answered_by_fkey;
ALTER TABLE public.zen_voc_answers ADD CONSTRAINT zen_voc_answers_answered_by_fkey 
  FOREIGN KEY (answered_by) REFERENCES public.zen_profiles(id);
