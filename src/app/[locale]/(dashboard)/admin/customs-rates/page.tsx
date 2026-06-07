import { requireAuth } from "@/lib/auth/guards";
import { getCustomsRates } from "@/app/actions/admin/customs-rates";
import { createClient } from "@/utils/supabase/server";
import { FileText } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
          <FileText size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">통관 서비스 요율</h1>
          <p className="text-xs font-medium text-slate-500">통관사별 국가 단위 요율 정보를 관리합니다.</p>
        </div>
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
