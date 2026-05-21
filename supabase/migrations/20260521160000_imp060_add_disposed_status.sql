-- IMP-060: Add DISPOSED to order status CHECK constraint
-- DISPOSED is a terminal state for disposed/scrapped cargo after RETURNED

ALTER TABLE public.zen_orders DROP CONSTRAINT IF EXISTS zen_orders_status_check;

ALTER TABLE public.zen_orders ADD CONSTRAINT zen_orders_status_check 
CHECK (status = ANY (ARRAY[
    'REGISTERED'::text, 
    'PICKED_UP'::text, 
    'IN_TRANSIT'::text, 
    'ARRIVED'::text, 
    'DELIVERED'::text, 
    'RELEASED'::text, 
    'CANCELED'::text, 
    'CLAIMED'::text, 
    'PENDING'::text, 
    'CONFIRMED'::text, 
    'WAREHOUSED'::text, 
    'HELD'::text, 
    'PACKED'::text, 
    'SCHEDULED'::text, 
    'MASTERED'::text, 
    'RETURNED'::text,
    'DISPOSED'::text
]));
