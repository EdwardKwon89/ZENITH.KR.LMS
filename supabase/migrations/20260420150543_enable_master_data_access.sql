-- zen_ports 조회 정책 수립
CREATE POLICY "Allow authenticated to select zen_ports" 
ON public.zen_ports FOR SELECT 
TO authenticated 
USING (true);

-- zen_organizations 조회 정책 수립
CREATE POLICY "Allow authenticated to select zen_organizations" 
ON public.zen_organizations FOR SELECT 
TO authenticated 
USING (true);

-- 분석용 보조 정책 (필요시)
ALTER TABLE public.zen_ports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.zen_organizations FORCE ROW LEVEL SECURITY;;
