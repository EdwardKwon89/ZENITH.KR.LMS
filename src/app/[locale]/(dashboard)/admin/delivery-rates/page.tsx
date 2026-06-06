import { requireAuth } from "@/lib/auth/guards";
import { getDeliveryRates } from "@/app/actions/admin/delivery-rates";
import { createClient } from "@/utils/supabase/server";
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
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">배송 서비스 요율</h1>
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
