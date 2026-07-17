'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileText, XCircle, Loader2 } from 'lucide-react';
import { fetchShxkTradeDocument, voidUpsLabel } from '@/app/actions/operations/ups-labels';
import { toast } from 'sonner';

interface UpsTradeDocumentActionsProps {
  orderId: string;
  hasActiveLabel: boolean;
}

const DOC_BUTTONS = [
  { key: 'waybill', docType: 'WAYBILL' as const },
  { key: 'logistics_invoice', docType: 'INVOICE' as const },
  { key: 'customs_declaration_shxk', docType: 'CUSTOMS' as const },
];

export default function UpsTradeDocumentActions({ orderId, hasActiveLabel }: UpsTradeDocumentActionsProps) {
  const t = useTranslations('Documents');
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  if (!hasActiveLabel) return null;

  const handleFetchDoc = async (docKey: string, docType: 'WAYBILL' | 'INVOICE' | 'CUSTOMS') => {
    setLoadingDoc(docKey);
    try {
      const res = await fetchShxkTradeDocument(orderId, docType);
      if (res.success && res.url) {
        window.open(res.url, '_blank');
      } else {
        toast.error(res.error || '문서 조회에 실패했습니다.');
      }
    } catch (err: any) {
      toast.error(err.message || '문서 조회에 실패했습니다.');
    } finally {
      setLoadingDoc(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('UPS 등록을 취소하시겠습니까? 발급된 라벨이 무효화됩니다.')) return;
    setCancelling(true);
    try {
      const res = await voidUpsLabel(orderId);
      if (res.success) {
        toast.success('UPS 등록이 취소되었습니다.');
        router.refresh();
      } else {
        toast.error(res.error || '취소에 실패했습니다.');
      }
    } catch (err: any) {
      toast.error(err.message || '취소에 실패했습니다.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {DOC_BUTTONS.map(({ key, docType }) => (
        <button
          key={key}
          onClick={() => handleFetchDoc(key, docType)}
          disabled={loadingDoc === key}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {loadingDoc === key ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <FileText size={12} />
          )}
          {t(key)}
        </button>
      ))}
      <button
        onClick={handleCancel}
        disabled={cancelling}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        {cancelling ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <XCircle size={12} />
        )}
        {t('ups_cancel_registration')}
      </button>
    </div>
  );
}
