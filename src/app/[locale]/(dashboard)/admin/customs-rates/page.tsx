import { requireAuth } from "@/lib/auth/guards";
import { getCustomsRates } from "@/app/actions/admin/customs-rates";
import { createClient } from "@/utils/supabase/server";
import CustomsRatesClient from "./customs-rates-client";

export default async function CustomsRatesPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { data: orgs } = await supabase
    .from('zen_organizations')
    .select('id, name')
    .eq('type', 'CUSTOMS')
    .order('name');

  const rates = await getCustomsRates();

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">통관 서비스 요율</h1>
      </div>
      <CustomsRatesClient
        initialRates={rates}
        organizations={orgs || []}
        userRole={profile?.role || 'GUEST'}
        userOrgId={profile?.org_id || ''}
      />
    </div>
  );
}
