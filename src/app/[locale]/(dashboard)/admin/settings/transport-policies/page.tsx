import { requireAuth } from "@/lib/auth/guards";
import { getTransportPolicies } from "@/app/actions/admin/transport-policies";
import { Settings } from "lucide-react";
import TransportPoliciesClient from "./transport-policies-client";

export default async function TransportPoliciesPage() {
  const { profile } = await requireAuth();
  const policies = await getTransportPolicies();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">요금 산정 정책</h1>
          <p className="text-xs font-medium text-slate-500">운송수단별 요금 산정 방식을 관리합니다.</p>
        </div>
      </div>
      <TransportPoliciesClient
        initialPolicies={policies}
        userRole={profile?.role || 'GUEST'}
      />
    </div>
  );
}
