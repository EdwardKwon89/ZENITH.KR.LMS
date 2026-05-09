import { QnaDetail } from "@/components/support/QnaDetail";
import { requireAuth } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/auth/rbac";

export default async function QnaDetailPage({ 
  params
}: { 
  params: Promise<{ locale: string; id: string }> 
}) {
  const { locale, id } = await params;
  const { profile } = await requireAuth();
  const isAdmin = profile?.role === USER_ROLES.ADMIN || profile?.role === USER_ROLES.ZENITH_SUPER_ADMIN;

  return (
    <div className="container py-8">
      <QnaDetail qnaId={id} isAdmin={isAdmin} locale={locale} />
    </div>
  );
}
