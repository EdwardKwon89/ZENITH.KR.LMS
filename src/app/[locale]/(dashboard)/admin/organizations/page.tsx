import { requireAdmin } from "@/lib/auth/guards";
import { getOrganizations } from "@/app/actions/organization";
import OrganizationApprovalClient from "./organizations-client";

export default async function AdminOrganizationsPage() {
  // 1. 보안 검증 (ADMIN이 아닐 경우 리다이렉트)
  await requireAdmin();

  // 2. 초기 데이터 로드 (PENDING, SUPPLEMENT_REQUIRED 상태 우선)
  const initialData = await getOrganizations(['PENDING', 'SUPPLEMENT_REQUIRED']);

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 min-h-screen">
      {/* 클라이언트 사이드 법인 승인 로직 */}
      <OrganizationApprovalClient initialData={initialData} />
    </div>
  );
}
