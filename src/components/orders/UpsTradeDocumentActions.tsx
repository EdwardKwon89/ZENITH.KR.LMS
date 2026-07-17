'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileText, XCircle, Loader2, Send } from 'lucide-react';
import { fetchShxkTradeDocument, voidUpsLabel, previewShxkPayload, issueUpsLabel } from '@/app/actions/operations/ups-labels';
import { toast } from 'sonner';

type PreviewAction = 'CREATEORDER' | 'WAYBILL' | 'INVOICE' | 'CUSTOMS' | 'VOID';

interface UpsTradeDocumentActionsProps {
  orderId: string;
  hasActiveLabel: boolean;
}

const DOC_BUTTONS = [
  { key: 'waybill', docType: 'WAYBILL' as const },
  { key: 'logistics_invoice', docType: 'INVOICE' as const },
  { key: 'customs_declaration_shxk', docType: 'CUSTOMS' as const },
];

function PreviewPopup({ payload, action, onConfirm, onCancel }: {
  payload: Record<string, unknown>;
  action: PreviewAction;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-200 font-bold text-sm text-gray-800">
          SHXK Payload Preview — {action}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs font-mono bg-gray-50 p-3 rounded-lg border border-gray-200 whitespace-pre-wrap break-all">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultPopup({ result, action, onConfirm }: {
  result: Record<string, unknown>;
  action: PreviewAction;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onConfirm}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-200 font-bold text-sm text-gray-800">
          SHXK Response — {action}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs font-mono bg-gray-50 p-3 rounded-lg border border-gray-200 whitespace-pre-wrap break-all">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UpsTradeDocumentActions({ orderId, hasActiveLabel }: UpsTradeDocumentActionsProps) {
  const t = useTranslations('Documents');
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [previewState, setPreviewState] = useState<{ action: PreviewAction; payload: Record<string, unknown> } | null>(null);
  const [resultState, setResultState] = useState<{ action: PreviewAction; result: Record<string, unknown> } | null>(null);
  const router = useRouter();

  const handlePreview = async (action: PreviewAction) => {
    const res = await previewShxkPayload(orderId, action);
    if (res.success && res.payload) {
      setPreviewState({ action, payload: res.payload });
    } else {
      toast.error(res.error || '미리보기 생성에 실패했습니다.');
    }
  };

  const handleConfirmPreview = async () => {
    if (!previewState) return;
    const { action } = previewState;
    setPreviewState(null);

    if (action === 'CREATEORDER') {
      setCreateLoading(true);
      try {
        const res = await issueUpsLabel(orderId);
        if (res.success) {
          toast.success(`라벨 발급 성공: trackingNo=${res.data?.tracking_number}, referenceNo=${res.data?.reference_no}`);
          router.refresh();
        } else {
          toast.error(res.error || '라벨 발급에 실패했습니다.');
        }
      } catch (err: any) {
        toast.error(err.message || '라벨 발급에 실패했습니다.');
      } finally {
        setCreateLoading(false);
      }
      return;
    }

    if (action === 'VOID') {
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
      return;
    }

    const docKey = action === 'WAYBILL' ? 'waybill' : action === 'INVOICE' ? 'logistics_invoice' : 'customs_declaration_shxk';
    setLoadingDoc(docKey);
    try {
      const res = await fetchShxkTradeDocument(orderId, action as 'WAYBILL' | 'INVOICE' | 'CUSTOMS');
      setResultState({ action, result: res as Record<string, unknown> });
    } catch (err: any) {
      toast.error(err.message || '문서 조회에 실패했습니다.');
    } finally {
      setLoadingDoc(null);
    }
  };

  return (
    <>
      {previewState && (
        <PreviewPopup
          payload={previewState.payload}
          action={previewState.action}
          onConfirm={handleConfirmPreview}
          onCancel={() => setPreviewState(null)}
        />
      )}
      {resultState && (
        <ResultPopup
          result={resultState.result}
          action={resultState.action}
          onConfirm={() => setResultState(null)}
        />
      )}
      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={() => handlePreview('CREATEORDER')}
          disabled={createLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          {createLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Send size={12} />
          )}
          {t('createorder_test')}
        </button>
        {hasActiveLabel && (
          <>
            {DOC_BUTTONS.map(({ key, docType }) => (
              <button
                key={key}
                onClick={() => handlePreview(docType)}
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
              onClick={() => handlePreview('VOID')}
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
          </>
        )}
      </div>
    </>
  );
}
