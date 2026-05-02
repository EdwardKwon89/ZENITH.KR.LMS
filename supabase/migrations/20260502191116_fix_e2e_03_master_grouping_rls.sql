-- Migration: Fix Master Order Grouping RLS
-- Description: Enable UPDATE on zen_orders for authenticated users to allow binding house orders to master orders.

-- [PH14-E2E-03] Fix: Master Order Grouping 실패 해결
-- zen_orders 테이블에 UPDATE 정책이 없어 house_order_id를 master_order_id에 바인딩하지 못하는 문제 해결

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'zen_orders' 
        AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON public.zen_orders
        FOR UPDATE TO authenticated
        USING (auth.role() = 'authenticated');
    END IF;
END $$;
