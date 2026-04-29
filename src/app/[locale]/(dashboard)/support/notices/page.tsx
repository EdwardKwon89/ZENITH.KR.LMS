import { NoticeSection } from "@/components/support/NoticeSection";
import { SupportHeader } from "@/components/support/SupportHeader";
import { requireAuth } from "@/lib/auth/guards";

export default async function NoticePage() {
  const { profile } = await requireAuth();
  const isAdmin = profile?.role === 'ADMIN';

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
