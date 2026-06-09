import { requireAdmin } from "@/lib/auth/guards";
import { getOrganizationsAdmin } from "@/app/actions/organization";
import ManageOrganizationsClient from "./manage-organizations-client";

export default async function ManageOrganizationsPage() {
  await requireAdmin();
  const { organizations, total } = await getOrganizationsAdmin({ page: 1, pageSize: 50 });

  const orgTypes = ['CARRIER', 'CUSTOMS', 'DELIVERY', 'SHIPPER', 'PLATFORM', 'CORPORATE', 'INDIVIDUAL'] as const;
  const orgStatuses = ['ACTIVE', 'PENDING', 'SUSPENDED', 'SUPPLEMENT_REQUIRED'] as const;

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 min-h-screen">
      <ManageOrganizationsClient
        initialOrganizations={organizations}
        initialTotal={total}
        orgTypes={orgTypes}
        orgStatuses={orgStatuses}
      />
    </div>
  );
}
