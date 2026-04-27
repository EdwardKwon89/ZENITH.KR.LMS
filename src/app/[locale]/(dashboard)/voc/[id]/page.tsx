import { getVocDetail } from '@/app/actions/voc';
import { requireAuth } from '@/lib/auth/guards';
import { getMessages } from 'next-intl/server';
import { ZenCard, ZenBadge, ZenButton } from '@/components/ui/ZenUI';
import { MessageSquare, User, CheckCircle2, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function UserVocDetailPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const { profile } = await requireAuth();
  const voc = await getVocDetail(id);
  const messages = await getMessages() as any;
  const t = messages.VOC;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'CLOSED': return 'success';
      default: return 'default';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-700">
      <Link href={`/${locale}/voc`} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 transition-colors group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to VOC List
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-brand-600">
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{voc.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <ZenBadge variant={getStatusBadgeVariant(voc.status)}>{voc.status}</ZenBadge>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Order #{voc.order_no} · {voc.type}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ZenCard className="p-8 space-y-8 bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl shadow-slate-200">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <User size={20} className="text-slate-400" />
          </div>
          <div className="flex-1 bg-slate-50/50 rounded-2xl p-6 border border-slate-100/50">
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{voc.description}</p>
            <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">
              Submitted on {new Date(voc.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-slate-100"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Responses</span>
            <div className="h-[1px] flex-1 bg-slate-100"></div>
          </div>

          {voc.answers.length > 0 ? (
            voc.answers.map((ans) => (
              <div key={ans.id} className="flex gap-4 justify-end">
                <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-6 shadow-xl shadow-slate-100 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{ans.content}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{ans.answered_by_name}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(ans.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                  <CheckCircle2 size={20} className="text-blue-600" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-200 mb-3">
                <Clock size={40} />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Waiting for Response</p>
              <p className="text-xs text-slate-400 mt-1">Our support team will get back to you soon.</p>
            </div>
          )}
        </div>
      </ZenCard>
    </div>
  );
}
