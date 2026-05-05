-- Standardize RLS policies to use zen_profiles instead of profiles
-- Created to fix E2E-05 failure where settlement costs were invisible due to wrong table reference

-- 1. zen_order_costs
DROP POLICY IF EXISTS "Shippers can view their order costs" ON zen_order_costs;
CREATE POLICY "Shippers can view their order costs" ON zen_order_costs
FOR SELECT TO public
USING (
  (EXISTS (
    SELECT 1 FROM zen_orders
    JOIN zen_profiles ON zen_profiles.org_id = zen_orders.shipper_id
    WHERE zen_orders.id = zen_order_costs.order_id
    AND (zen_profiles.id = auth.uid() OR zen_profiles.role::text = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text]))
  )) OR (
    EXISTS (
      SELECT 1 FROM zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role::text = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text])
    )
  )
);

-- 2. zen_invoices
DROP POLICY IF EXISTS "Admins can manage all invoices" ON zen_invoices;
CREATE POLICY "Admins can manage all invoices" ON zen_invoices
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role::text = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text])
  )
);

DROP POLICY IF EXISTS "Shippers can view their own invoices" ON zen_invoices;
CREATE POLICY "Shippers can view their own invoices" ON zen_invoices
FOR SELECT TO public
USING (
  shipper_id IN (
    SELECT org_id FROM zen_profiles
    WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM zen_profiles
    WHERE id = auth.uid()
    AND role::text = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text])
  )
);

-- 3. zen_incident_fees
DROP POLICY IF EXISTS "Admins can manage incident fees" ON zen_incident_fees;
CREATE POLICY "Admins can manage incident fees" ON zen_incident_fees
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role::text = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text])
  )
);

DROP POLICY IF EXISTS "Shippers can view their incident fees" ON zen_incident_fees;
CREATE POLICY "Shippers can view their incident fees" ON zen_incident_fees
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM zen_invoices
    JOIN zen_profiles ON zen_profiles.org_id = zen_invoices.shipper_id
    WHERE zen_invoices.id = zen_incident_fees.invoice_id
    AND zen_profiles.id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM zen_profiles
    WHERE id = auth.uid()
    AND role::text = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text])
  )
);

-- 4. zen_tracking_events
DROP POLICY IF EXISTS "Admins can manage tracking events" ON zen_tracking_events;
CREATE POLICY "Admins can manage tracking events" ON zen_tracking_events
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role::text = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text])
  )
);

DROP POLICY IF EXISTS "Users can view relevant tracking events" ON zen_tracking_events;
CREATE POLICY "Users can view relevant tracking events" ON zen_tracking_events
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM zen_orders o
    WHERE o.id = zen_tracking_events.order_id
    AND (o.shipper_id = auth.uid() OR o.shipper_id IN (
      SELECT org_id FROM zen_profiles WHERE id = auth.uid()
    ))
  )
);

-- 5. zen_tracking_raw_logs
DROP POLICY IF EXISTS "Admins have full access to tracking raw logs" ON zen_tracking_raw_logs;
CREATE POLICY "Admins have full access to tracking raw logs" ON zen_tracking_raw_logs
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role::text = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text])
  )
);

-- 6. zen_voc
DROP POLICY IF EXISTS "Admins can view all VOCs" ON zen_voc;
CREATE POLICY "Admins can view all VOCs" ON zen_voc
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role::text = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text])
  )
);

DROP POLICY IF EXISTS "Users can view own organization's VOCs" ON zen_voc;
CREATE POLICY "Users can view own organization's VOCs" ON zen_voc
FOR SELECT TO public
USING (
  org_id IN (
    SELECT org_id FROM zen_profiles
    WHERE id = auth.uid()
  )
);

-- 7. zen_tax_invoices
DROP POLICY IF EXISTS "Admins can issue and update tax invoices" ON zen_tax_invoices;
CREATE POLICY "Admins can issue and update tax invoices" ON zen_tax_invoices
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM zen_profiles
    WHERE zen_profiles.id = auth.uid()
    AND zen_profiles.role::text = 'ADMIN'::text
  )
);

DROP POLICY IF EXISTS "Shippers can view their own tax invoices" ON zen_tax_invoices;
CREATE POLICY "Shippers can view their own tax invoices" ON zen_tax_invoices
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM zen_invoices
    JOIN zen_profiles ON zen_profiles.id = auth.uid()
    WHERE zen_invoices.id = zen_tax_invoices.invoice_id
    AND (zen_profiles.org_id = zen_invoices.shipper_id OR zen_profiles.role::text = 'ADMIN'::text)
  )
);
