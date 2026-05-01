import { requireAdmin } from "@/lib/auth/guards";
import { getSystemParams } from "@/app/actions/master";
import AdminSettingsClient from "./settings-client";

export default async function AdminSettingsPage() {
  // 1. 보안 검증
  await requireAdmin();

  // 2. 초기 데이터 로드
  const params = await getSystemParams();

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 min-h-screen">
      <AdminSettingsClient initialData={params} />
    </div>
  );
}
