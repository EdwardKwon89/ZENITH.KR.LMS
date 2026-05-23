ALTER TABLE public.zen_orders
    ADD COLUMN IF NOT EXISTS special_cargo_type TEXT
        DEFAULT 'NONE'
        CHECK (special_cargo_type IN ('NONE','DANGEROUS','FROZEN','VALUABLE','USED'));
COMMENT ON COLUMN public.zen_orders.special_cargo_type IS
    'NONE=일반, DANGEROUS=위험물, FROZEN=냉동/냉장, VALUABLE=고가품, USED=중고품';
