import { requireAdmin } from "@/lib/auth/guards";
import { getCommonCodes } from "@/app/actions/master";
import CommonCodeClient from "./codes-client";

export default async function CommonCodesPage() {
  // 1. 보안 검증 (ADMIN이 아닐 경우 리다이렉트)
  await requireAdmin();

  // 2. 초기 데이터 로드
  const codes = await getCommonCodes();

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">
          공통 코드 관리
        </h1>
        <p className="text-slate-500">
          시스템 전반에서 사용되는 표준 물류 코드를 구성하고 관리합니다.
        </p>
      </div>

      {/* 클라이언트 사이드 데이터 그리드 및 CRUD 로직 */}
      <CommonCodeClient initialData={codes} />
    </div>
  );
}
