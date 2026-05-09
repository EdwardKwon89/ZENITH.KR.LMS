import { NoticeSection } from "@/components/support/NoticeSection";
import { SupportHeader } from "@/components/support/SupportHeader";
import { requireAuth } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/auth/rbac";

export default async function NoticePage() {
  const { profile } = await requireAuth();
  const isAdmin = profile?.role === USER_ROLES.ADMIN || profile?.role === USER_ROLES.ZENITH_SUPER_ADMIN;

  return (
    <div className="container py-8">
      <SupportHeader 
        title="공지사항" 
        description="ZENITH_LMS의 새로운 소식과 업데이트 안내를 확인하세요."
      />
      <NoticeSection isAdmin={isAdmin} />
    </div>
  );
}
