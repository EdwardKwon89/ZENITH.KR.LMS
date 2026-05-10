-- AUDIT-S3: Corporate Member Management & Soft Delete

-- 1. Add is_active column to zen_profiles (Soft Delete support)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='zen_profiles' AND COLUMN_NAME='is_active') THEN
        ALTER TABLE zen_profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 2. Create zen_departments table
CREATE TABLE IF NOT EXISTS zen_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES zen_organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS on zen_departments
ALTER TABLE zen_departments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for zen_departments
-- View: Members of the same organization or ADMIN
DROP POLICY IF EXISTS "Users can view their own organization's departments" ON zen_departments;
CREATE POLICY "Users can view their own organization's departments" ON zen_departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM zen_profiles 
            WHERE zen_profiles.id = auth.uid() 
            AND (zen_profiles.org_id = zen_departments.org_id OR zen_profiles.role = 'ADMIN')
        )
    );

-- Manage: CORPORATE role of the same organization or ADMIN
DROP POLICY IF EXISTS "Corporate admins or system admins can manage departments" ON zen_departments;
CREATE POLICY "Corporate admins or system admins can manage departments" ON zen_departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM zen_profiles 
            WHERE zen_profiles.id = auth.uid() 
            AND (
                (zen_profiles.org_id = zen_departments.org_id AND zen_profiles.role = 'CORPORATE') 
                OR zen_profiles.role = 'ADMIN'
            )
        )
    );
