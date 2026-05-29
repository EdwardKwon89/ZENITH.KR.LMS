ALTER TABLE public.zen_route_options ADD COLUMN IF NOT EXISTS recommended_for jsonb DEFAULT '[]'::jsonb;
