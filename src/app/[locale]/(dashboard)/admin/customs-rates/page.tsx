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
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">통관 서비스 요율</h1>
        <p className="text-slate-500">통관사별 국가 단위 요율 정보를 관리합니다.</p>
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
