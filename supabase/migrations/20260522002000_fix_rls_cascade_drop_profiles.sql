-- =============================================================================
-- 20260522002000_fix_rls_cascade_drop_profiles.sql
-- Description: Restore RLS policies lost by CASCADE when profiles table was
--              dropped in imp049_merge_dual_profiles (20260521200000).
--              All policies are recreated using zen_profiles (the canonical table).
-- Root Cause:  DROP TABLE public.profiles CASCADE in M6 of IMP-049 silently
--              dropped every policy that referenced profiles.id or profiles.role,
--              leaving zen_order_costs, zen_invoices, zen_tax_invoices, etc. with
--              RLS enabled but zero policies → all authenticated reads return 0 rows.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. zen_order_costs
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Shippers can view their order costs" ON public.zen_order_costs;
CREATE POLICY "Shippers can view their order costs" ON public.zen_order_costs
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    JOIN public.zen_profiles ON zen_profiles.org_id = zen_orders.shipper_id
    WHERE zen_orders.id = zen_order_costs.order_id
    AND (zen_profiles.id = auth.uid()
         OR zen_profiles.role::text = ANY(ARRAY['ADMIN', 'ZENITH_SUPER_ADMIN']))
  )
  OR EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role::text = ANY(ARRAY['ADMIN', 'ZENITH_SUPER_ADMIN'])
  )
);

DROP POLICY IF EXISTS "Admins can manage order costs" ON public.zen_order_costs;
CREATE POLICY "Admins can manage order costs" ON public.zen_order_costs
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role::text = ANY(ARRAY['ADMIN', 'ZENITH_SUPER_ADMIN'])
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. zen_invoices
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.zen_invoices;
CREATE POLICY "Admins can manage all invoices" ON public.zen_invoices
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role::text = ANY(ARRAY['ADMIN', 'ZENITH_SUPER_ADMIN'])
  )
);

DROP POLICY IF EXISTS "Shippers can view their own invoices" ON public.zen_invoices;
CREATE POLICY "Shippers can view their own invoices" ON public.zen_invoices
FOR SELECT TO public
USING (
  shipper_id IN (
    SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE id = auth.uid()
    AND role::text = ANY(ARRAY['ADMIN', 'ZENITH_SUPER_ADMIN'])
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. zen_tax_invoices
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can issue and update tax invoices" ON public.zen_tax_invoices;
CREATE POLICY "Admins can issue and update tax invoices" ON public.zen_tax_invoices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
  )
);

DROP POLICY IF EXISTS "Shippers can view their own tax invoices" ON public.zen_tax_invoices;
CREATE POLICY "Shippers can view their own tax invoices" ON public.zen_tax_invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_invoices
    JOIN public.zen_profiles ON zen_profiles.id = auth.uid()
    WHERE zen_invoices.id = zen_tax_invoices.invoice_id
    AND (zen_profiles.org_id = zen_invoices.shipper_id
         OR zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. zen_invoice_pdf_history
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their organization's invoice PDF history" ON public.zen_invoice_pdf_history;
CREATE POLICY "Users can view their organization's invoice PDF history" ON public.zen_invoice_pdf_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_invoices i
    JOIN public.zen_profiles p ON p.org_id = i.shipper_id
    WHERE i.id = zen_invoice_pdf_history.invoice_id
    AND (p.id = auth.uid() OR p.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  )
);

DROP POLICY IF EXISTS "Admins and Partners can create invoice PDF history" ON public.zen_invoice_pdf_history;
CREATE POLICY "Admins and Partners can create invoice PDF history" ON public.zen_invoice_pdf_history
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'PARTNER')
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. zen_tracking_configs
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view tracking of their own zen_orders" ON public.zen_tracking_configs;
CREATE POLICY "Users can view tracking of their own zen_orders" ON public.zen_tracking_configs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders o
    WHERE o.id = zen_tracking_configs.order_id
    AND (o.shipper_id = auth.uid()
         OR o.shipper_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "Admins have full access to tracking configs" ON public.zen_tracking_configs;
CREATE POLICY "Admins have full access to tracking configs" ON public.zen_tracking_configs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. zen_tracking_events
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage tracking events" ON public.zen_tracking_events;
CREATE POLICY "Admins can manage tracking events" ON public.zen_tracking_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role::text = ANY(ARRAY['ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'])
  )
);

DROP POLICY IF EXISTS "Users can view relevant tracking events" ON public.zen_tracking_events;
CREATE POLICY "Users can view relevant tracking events" ON public.zen_tracking_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders o
    WHERE o.id = zen_tracking_events.order_id
    AND (o.shipper_id = auth.uid()
         OR o.shipper_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()))
  )
  OR EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. zen_voc
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all VOCs" ON public.zen_voc;
CREATE POLICY "Admins can view all VOCs" ON public.zen_voc
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
  )
);

DROP POLICY IF EXISTS "Users can view own organization's VOCs" ON public.zen_voc;
CREATE POLICY "Users can view own organization's VOCs" ON public.zen_voc
FOR SELECT
USING (
  org_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create VOCs for own organization zen_orders" ON public.zen_voc;
CREATE POLICY "Users can create VOCs for own organization zen_orders" ON public.zen_voc
FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can update VOC status" ON public.zen_voc;
CREATE POLICY "Admins can update VOC status" ON public.zen_voc
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. zen_voc_answers
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage VOC answers" ON public.zen_voc_answers;
CREATE POLICY "Admins can manage VOC answers" ON public.zen_voc_answers
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
);

DROP POLICY IF EXISTS "Users can view answers for own organization VOCs" ON public.zen_voc_answers;
CREATE POLICY "Users can view answers for own organization VOCs" ON public.zen_voc_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_voc v
    JOIN public.zen_profiles p ON v.org_id = p.org_id
    WHERE v.id = public.zen_voc_answers.voc_id AND p.id = auth.uid()
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. zen_qna
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own organization's QnAs" ON public.zen_qna;
CREATE POLICY "Users can view own organization's QnAs" ON public.zen_qna
FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Users can create QnAs for own organization" ON public.zen_qna;
CREATE POLICY "Users can create QnAs for own organization" ON public.zen_qna
FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can update QnA status" ON public.zen_qna;
CREATE POLICY "Admins can update QnA status" ON public.zen_qna
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. zen_qna_answers
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert answers" ON public.zen_qna_answers;
CREATE POLICY "Admins can insert answers" ON public.zen_qna_answers
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Users can view answers for accessible QnAs" ON public.zen_qna_answers;
CREATE POLICY "Users can view answers for accessible QnAs" ON public.zen_qna_answers
FOR SELECT USING (
  qna_id IN (
    SELECT id FROM public.zen_qna
    WHERE org_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. zen_faq
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view active FAQs" ON public.zen_faq;
CREATE POLICY "Users can view active FAQs" ON public.zen_faq
FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')));

DROP POLICY IF EXISTS "Admins can manage FAQs" ON public.zen_faq;
CREATE POLICY "Admins can manage FAQs" ON public.zen_faq
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. zen_notices
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view published notices" ON public.zen_notices;
CREATE POLICY "Users can view published notices" ON public.zen_notices
FOR SELECT USING (
  is_published = true
  OR EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Admins can manage notices" ON public.zen_notices;
CREATE POLICY "Admins can manage notices" ON public.zen_notices
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. zen_wallet
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can select zen_wallet" ON public.zen_wallet;
CREATE POLICY "Admins can select zen_wallet" ON public.zen_wallet
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Admins can insert zen_wallet" ON public.zen_wallet;
CREATE POLICY "Admins can insert zen_wallet" ON public.zen_wallet
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Admins can update zen_wallet" ON public.zen_wallet;
CREATE POLICY "Admins can update zen_wallet" ON public.zen_wallet
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Admins can delete zen_wallet" ON public.zen_wallet;
CREATE POLICY "Admins can delete zen_wallet" ON public.zen_wallet
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Users can read own org wallet" ON public.zen_wallet;
CREATE POLICY "Users can read own org wallet" ON public.zen_wallet
FOR SELECT USING (
  org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. zen_wallet_transactions
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can select zen_wallet_transactions" ON public.zen_wallet_transactions;
CREATE POLICY "Admins can select zen_wallet_transactions" ON public.zen_wallet_transactions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Admins can insert zen_wallet_transactions" ON public.zen_wallet_transactions;
CREATE POLICY "Admins can insert zen_wallet_transactions" ON public.zen_wallet_transactions
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Admins can update zen_wallet_transactions" ON public.zen_wallet_transactions;
CREATE POLICY "Admins can update zen_wallet_transactions" ON public.zen_wallet_transactions
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Users can read own wallet transactions" ON public.zen_wallet_transactions;
CREATE POLICY "Users can read own wallet transactions" ON public.zen_wallet_transactions
FOR SELECT USING (
  wallet_id IN (
    SELECT w.id FROM public.zen_wallet w
    JOIN public.zen_profiles p ON p.org_id = w.org_id
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert refund requests" ON public.zen_wallet_transactions;
CREATE POLICY "Users can insert refund requests" ON public.zen_wallet_transactions
FOR INSERT WITH CHECK (
  type = 'REFUND_REQUEST'
  AND status = 'PENDING'
  AND wallet_id IN (
    SELECT w.id FROM public.zen_wallet w
    JOIN public.zen_profiles p ON p.org_id = w.org_id
    WHERE p.id = auth.uid()
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. zen_feature_flags
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can select zen_feature_flags" ON public.zen_feature_flags;
CREATE POLICY "Admins can select zen_feature_flags" ON public.zen_feature_flags
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Admins can insert zen_feature_flags" ON public.zen_feature_flags;
CREATE POLICY "Admins can insert zen_feature_flags" ON public.zen_feature_flags
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Admins can update zen_feature_flags" ON public.zen_feature_flags;
CREATE POLICY "Admins can update zen_feature_flags" ON public.zen_feature_flags
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Admins can delete zen_feature_flags" ON public.zen_feature_flags;
CREATE POLICY "Admins can delete zen_feature_flags" ON public.zen_feature_flags
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.zen_profiles WHERE zen_profiles.id = auth.uid() AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Users can read own org feature flags" ON public.zen_feature_flags;
CREATE POLICY "Users can read own org feature flags" ON public.zen_feature_flags
FOR SELECT USING (
  org_id IS NULL
  OR org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. zen_inventory
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view inventory of their own organization" ON public.zen_inventory;
CREATE POLICY "Users can view inventory of their own organization" ON public.zen_inventory
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND (zen_profiles.org_id = zen_inventory.org_id OR zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  )
);

DROP POLICY IF EXISTS "Admins can update inventory" ON public.zen_inventory;
CREATE POLICY "Admins can update inventory" ON public.zen_inventory
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MEMBER', 'MANAGER')
  )
);

DROP POLICY IF EXISTS "Admins can insert inventory" ON public.zen_inventory;
CREATE POLICY "Admins can insert inventory" ON public.zen_inventory
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. zen_inventory_history
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view inventory history of their own organization" ON public.zen_inventory_history;
CREATE POLICY "Users can view inventory history of their own organization" ON public.zen_inventory_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND (zen_profiles.org_id = zen_inventory_history.org_id OR zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  )
);

DROP POLICY IF EXISTS "Allow inventory history inserts" ON public.zen_inventory_history;
CREATE POLICY "Allow inventory history inserts" ON public.zen_inventory_history
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER', 'MEMBER', 'PARTNER')
  )
);
