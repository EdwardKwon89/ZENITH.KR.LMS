'use client';
import { logger } from '@/lib/logger';

import { useState } from 'react';
import { ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { withdrawUser } from '@/app/actions/member';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}

export default function WithdrawalModal({ isOpen, onClose, locale }: WithdrawalModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  async function handleWithdraw() {
    if (confirmText !== '탈퇴') {
      toast.error("'탈퇴'를 정확히 입력해 주세요.");
      return;
    }

    setIsPending(true);
    try {
      const res = await withdrawUser();
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('탈퇴 처리가 완료되었습니다. 이용해 주셔서 감사합니다.');
        // 탈퇴 후 로그인 페이지로 리다이렉트
        router.push(`/${locale}/login`);
      }
    } catch (err: any) {
      logger.error(err);
      toast.error('탈퇴 처리 중 오류가 발생했습니다.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        <div className="p-10 space-y-8">
          <div className="flex justify-between items-start">
            <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100 shadow-sm shadow-red-100/50">
              <AlertTriangle size={36} />
            </div>
            <button 
              onClick={onClose} 
              className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">정말 탈퇴하시겠습니까?</h2>
            <p className="text-slate-500 leading-relaxed font-medium">
              탈퇴 시 계정 정보 및 서비스 이용 내역이 모두 삭제되며, <span className="text-red-600 font-bold underline decoration-red-100 underline-offset-4">삭제된 정보는 복구가 불가능합니다.</span>
            </p>
          </div>

          <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">유의사항 확인</p>
            <ul className="text-xs text-slate-600 space-y-2.5 font-medium">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <span>미완료 오더나 미결제 정산 건이 있을 경우 탈퇴가 불가능할 수 있습니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <span>법령에 따라 일부 거래 정보는 일정 기간 보관될 수 있습니다.</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700 px-1">
              확인을 위해 아래에 <span className="text-red-600">"탈퇴"</span>를 입력해 주세요.
            </label>
            <ZenInput
              placeholder="탈퇴"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="h-14 rounded-2xl border-slate-200 bg-white focus:ring-red-500/20 focus:border-red-500 text-center text-lg font-bold tracking-widest placeholder:tracking-normal placeholder:font-normal"
            />
          </div>

          <div className="flex gap-4 pt-2">
            <ZenButton 
              variant="tactile" 
              onClick={onClose} 
              className="flex-1 h-14 rounded-2xl font-bold border-slate-200 bg-white hover:bg-slate-50 transition-all"
            >
              취소
            </ZenButton>
            <ZenButton
              onClick={handleWithdraw}
              disabled={isPending || confirmText !== '탈퇴'}
              className="flex-1 h-14 rounded-2xl font-bold bg-red-600 hover:bg-red-700 shadow-xl shadow-red-200 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {isPending ? <Loader2 size={20} className="animate-spin" /> : '회원 탈퇴'}
            </ZenButton>
          </div>
        </div>
      </div>
    </div>
  );
}
