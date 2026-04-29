import { requireAuth } from "@/lib/auth/guards";
import TradeDocumentClient from "./TradeDocumentClient";

export default async function TradeDocumentsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <TradeDocumentClient locale={locale} />
    </div>
  );
}
