import { requireAuth } from "@/lib/auth/guards";
import { getDeliveryRates } from "@/app/actions/admin/delivery-rates";
import { createClient } from "@/utils/supabase/server";
import { Package } from "lucide-react";
import DeliveryRatesClient from "./delivery-rates-client";

export default async function DeliveryRatesPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { data: orgs } = await supabase
    .from('zen_organizations')
    .select('id, name')
    .eq('type', 'DELIVERY')
    .order('name');

  const rates = await getDeliveryRates();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
          <Package size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">배송 서비스 요율</h1>
          <p className="text-xs font-medium text-slate-500">배송사별 노선 단위 요율 정보를 관리합니다.</p>
        </div>
      </div>
      <DeliveryRatesClient
        initialRates={rates}
        organizations={orgs || []}
        userRole={profile?.role || 'GUEST'}
        userOrgId={profile?.org_id || ''}
      />
    </div>
  );
}
