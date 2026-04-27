import { getVocList } from '@/app/actions/voc';
import { requireAuth } from '@/lib/auth/guards';
import { ZenCard, ZenButton, ZenBadge } from '@/components/ui/ZenUI';
import { MessageSquare, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { getMessages } from 'next-intl/server';
import { VocStatus, VocType } from '@/app/actions/voc';

export default async function VocPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const { profile } = await requireAuth();
  const messages = await getMessages() as any;
  const t = messages.VOC;

  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status as VocStatus : undefined;
  const type = typeof resolvedSearchParams.type === 'string' ? resolvedSearchParams.type as VocType : undefined;

  const { vocs, total } = await getVocList({
    status,
    type,
    limit: 20,
    offset: (page - 1) * 20
  });

  const getStatusBadgeVariant = (status: VocStatus) => {
    switch (status) {
      case 'OPEN': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'CLOSED': return 'success';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: VocStatus) => {
    switch (status) {
      case 'OPEN': return t.status_open;
      case 'IN_PROGRESS': return t.status_in_progress;
      case 'CLOSED': return t.status_closed;
      default: return status;
    }
  };

  const getTypeLabel = (type: VocType) => {
    switch (type) {
      case 'DELAY': return t.type_delay;
      case 'DAMAGE': return t.type_damage;
      case 'MISDELIVERY': return t.type_misdelivery;
      case 'OTHER': return t.type_other;
      default: return type;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.title}</h1>
            <p className="text-slate-500 font-medium text-xs">Voice of Customer - We value your feedback</p>
          </div>
        </div>
        <div className="flex gap-2">
           {/* Filtering UI (Simplified for now) */}
           <div className="flex bg-white/50 backdrop-blur-md border border-white/20 p-1 rounded-xl shadow-sm">
              <Link href={`/${locale}/voc`} className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", !status ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:bg-white/30")}>ALL</Link>
              <Link href={`/${locale}/voc?status=OPEN`} className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", status === 'OPEN' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:bg-white/30")}>OPEN</Link>
              <Link href={`/${locale}/voc?status=CLOSED`} className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", status === 'CLOSED' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:bg-white/30")}>CLOSED</Link>
           </div>
        </div>
      </div>

      {/* VOC List Grid */}
      <div className="grid grid-cols-1 gap-4">
        {vocs.length > 0 ? (
          vocs.map((voc) => (
            <ZenCard key={voc.id} className="group hover:border-brand-200/50">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <ZenBadge variant={getStatusBadgeVariant(voc.status)} className="px-3 py-1">
                      {getStatusLabel(voc.status)}
                    </ZenBadge>
                    <span className="text-xs font-bold text-slate-400">#{voc.order_no}</span>
                    <span className="text-xs font-medium text-slate-400">·</span>
                    <span className="text-xs font-bold text-brand-500">{getTypeLabel(voc.type)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-brand-600 transition-colors">
                    {voc.title}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {voc.description}
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MessageSquare size={14} />
                      <span className="text-xs font-bold">{voc.answer_count} Answers</span>
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium">
                      {new Date(voc.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Link href={`/${locale}/voc/${voc.id}`}>
                  <ZenButton variant="glass" className="text-xs py-2 px-4 whitespace-nowrap">
                    VIEW DETAILS
                  </ZenButton>
                </Link>
              </div>
            </ZenCard>
          ))
        ) : (
          <ZenCard className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-slate-200 bg-slate-50/30">
            <div className="p-4 bg-white rounded-full shadow-sm mb-4 text-slate-300">
              <MessageSquare size={48} />
            </div>
            <p className="text-slate-500 font-bold">{t.empty_list}</p>
            <p className="text-slate-400 text-xs mt-1">If you have any issues with your orders, please let us know.</p>
          </ZenCard>
        )}
      </div>

      {/* Simple Pagination */}
      {total > 20 && (
        <div className="flex justify-center pt-4">
           {/* Pagination component would go here */}
        </div>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
