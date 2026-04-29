import { FaqSection } from "@/components/support/FaqSection";
import { SupportHeader } from "@/components/support/SupportHeader";
import { requireAuth } from "@/lib/auth/guards";

export default async function FaqPage() {
  const { profile } = await requireAuth();
  const isAdmin = profile?.role === 'ADMIN';

  return (
    <div className="container py-8">
      <SupportHeader 
        title="자주 묻는 질문" 
        description="도움이 필요하신가요? 가장 자주 발생하는 질문들을 모았습니다."
      />
      <FaqSection isAdmin={isAdmin} />
    </div>
  );
}
