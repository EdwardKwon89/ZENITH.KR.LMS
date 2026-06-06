import { requireAuth } from "@/lib/auth/guards";
import { getAssignedOrders } from "@/app/actions/operations/assigned-orders";
import AssignedOrdersClient from "./assigned-orders-client";

export default async function AssignedOrdersPage() {
  const { profile } = await requireAuth();
  const orders = await getAssignedOrders();

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">할당 오더</h1>
      </div>
      <AssignedOrdersClient
        initialOrders={orders}
        userRole={profile?.role || 'GUEST'}
      />
    </div>
  );
}
