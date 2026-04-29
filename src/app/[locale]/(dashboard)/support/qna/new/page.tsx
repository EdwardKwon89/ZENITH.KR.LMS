import { QnaForm } from "@/components/support/QnaForm";
import { SupportHeader } from "@/components/support/SupportHeader";

export default async function NewQnaPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string; orderNo?: string }>;
}) {
  const { locale } = await params;
  const { orderId, orderNo } = await searchParams;

  return (
    <div className="container py-8">
      <SupportHeader 
        title="새 문의 작성" 
        description="문의하실 내용을 상세히 적어주시면 정확한 답변에 도움이 됩니다."
      />
      <QnaForm 
        locale={locale} 
        defaultOrderId={orderId} 
        defaultOrderNo={orderNo} 
      />
    </div>
  );
}
