import { QnaList } from "@/components/support/QnaList";
import { SupportHeader } from "@/components/support/SupportHeader";
import { requireAuth } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/auth/rbac";

export default async function QnaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { profile } = await requireAuth();
  const isAdmin = profile?.role === USER_ROLES.ADMIN || profile?.role === USER_ROLES.ZENITH_SUPER_ADMIN;

  return (
    <div className="container py-8">
      <SupportHeader 
        title="1:1 문의" 
        description={isAdmin ? "사용자들의 문의 내역을 관리하고 답변을 등록하세요." : "궁금한 사항을 문의하시면 전문가가 답변해 드립니다."}
      />
      <QnaList isAdmin={isAdmin} locale={locale} />
    </div>
  );
}
