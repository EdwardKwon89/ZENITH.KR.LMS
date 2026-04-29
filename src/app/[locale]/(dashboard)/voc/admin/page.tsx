import { getVocList } from '@/app/actions/voc';
import { requireAdmin } from '@/lib/auth/guards';
import { getMessages } from 'next-intl/server';
import AdminVocClient from '../admin-client';
import { MessageSquare } from 'lucide-react';

export default async function AdminVocPage() {
  // 1. 보안 검증 (ADMIN이 아닐 경우 리다이렉트)
  const { profile } = await requireAdmin();
  
  // 2. 초기 데이터 로드
  const { vocs } = await getVocList();
  const messages = await getMessages() as any;
  const t = messages.VOC;

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200">
          <MessageSquare size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {t.title_admin}
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            Voice of Customer Governance & Response Center
          </p>
        </div>
      </div>

      <AdminVocClient initialVocs={vocs} t={t} />
    </div>
  );
}
