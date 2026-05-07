import { getVocList } from '@/app/actions/voc';
import { requireAuth } from '@/lib/auth/guards';
import { ZenCard, ZenButton, ZenBadge } from '@/components/ui/ZenUI';
import { MessageSquare, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getMessages } from 'next-intl/server';
import { VocStatus, VocType } from '@/app/actions/voc';

const PAGE_SIZE = 20;

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

  const page = typeof resolvedSearchParams.page === 'string'
    ? Math.max(1, parseInt(resolvedSearchParams.page) || 1)
    : 1;
  const status = typeof resolvedSearchParams.status === 'string'
    ? resolvedSearchParams.status as VocStatus
    : undefined;
  const type = typeof resolvedSearchParams.type === 'string'
    ? resolvedSearchParams.type as VocType
    : undefined;

  const { vocs, total } = await getVocList({
    status,
    type,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE
  });

  const displayTotal = total ?? 0;
  const displayVocs = vocs ?? [];
  const totalPages = Math.ceil(displayTotal / PAGE_SIZE);

  // URL helper — preserves existing filters
  const buildUrl = (params: Record<string, string | undefined>) => {
    const base = new URLSearchParams();
    if (status) base.set('status', status);
    if (type) base.set('type', type);
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined) base.delete(k);
      else base.set(k, v);
    });
    const qs = base.toString();
    return `/${locale}/voc${qs ? `?${qs}` : ''}`;
  };

  const getStatusBadgeVariant = (s: VocStatus) => {
    switch (s) {
      case 'OPEN': return 'info' as const;
      case 'IN_PROGRESS': return 'warning' as const;
      case 'CLOSED': return 'success' as const;
      default: return 'default' as const;
    }
  };

  const getStatusLabel = (s: VocStatus) => {
    switch (s) {
      case 'OPEN': return t?.status_open ?? 'OPEN';
      case 'IN_PROGRESS': return t?.status_in_progress ?? 'IN PROGRESS';
      case 'CLOSED': return t?.status_closed ?? 'CLOSED';
      default: return s;
    }
  };

  const getTypeLabel = (tp: VocType) => {
    switch (tp) {
      case 'DELAY': return t?.type_delay ?? 'Delay';
      case 'DAMAGE': return t?.type_damage ?? 'Damage';
      case 'MISDELIVERY': return t?.type_misdelivery ?? 'Misdelivery';
      case 'OTHER': return t?.type_other ?? 'Other';
      default: return tp;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Header Section ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t?.title ?? 'Voice of Customer'}
            </h1>
            <p className="text-slate-500 font-medium text-xs">
              Voice of Customer — We value your feedback
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="flex bg-white/50 backdrop-blur-md border border-white/20 p-1 rounded-xl shadow-sm">
            <Link
              href={buildUrl({ status: undefined, page: '1' })}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                !status ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:bg-white/30"
              )}
            >
              ALL
            </Link>
            <Link
              href={buildUrl({ status: 'OPEN', page: '1' })}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                status === 'OPEN' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:bg-white/30"
              )}
            >
              OPEN
            </Link>
            <Link
              href={buildUrl({ status: 'IN_PROGRESS', page: '1' })}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                status === 'IN_PROGRESS' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:bg-white/30"
              )}
            >
              IN PROGRESS
            </Link>
            <Link
              href={buildUrl({ status: 'CLOSED', page: '1' })}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                status === 'CLOSED' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:bg-white/30"
              )}
            >
              CLOSED
            </Link>
          </div>

          {/* VOC 접수하기 CTA — 오더 선택 페이지로 라우팅 */}
          <Link href={`/${locale}/orders?action=voc`} id="voc-create-btn">
            <ZenButton variant="tactile" className="flex items-center gap-2 text-xs px-4 py-2.5 font-bold">
              <Plus size={14} />
              {t?.create_voc ?? 'VOC 접수하기'}
            </ZenButton>
          </Link>
        </div>
      </div>

      {/* ── Stats Summary ───────────────────────────────────────── */}
      {displayTotal > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium px-1">
          <span className="font-bold text-slate-700">{displayTotal.toLocaleString()}</span>건의 VOC
          {status && <span>· 필터: <span className="text-brand-600 font-bold">{status}</span></span>}
          <span className="ml-auto">
            페이지 <span className="font-bold text-slate-700">{page}</span> / {totalPages}
          </span>
        </div>
      )}

      {/* ── VOC List ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4">
        {displayVocs.length > 0 ? (
          displayVocs.map((voc) => (
            <ZenCard key={voc.id} className="group hover:border-brand-200/50">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <ZenBadge variant={getStatusBadgeVariant(voc.status)} className="px-3 py-1">
                      {getStatusLabel(voc.status)}
                    </ZenBadge>
                    <span className="text-xs font-bold text-slate-400">#{voc.order_no}</span>
                    <span className="text-xs font-medium text-slate-400">·</span>
                    <span className="text-xs font-bold text-brand-500">{getTypeLabel(voc.type)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-brand-600 transition-colors truncate">
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
                      {new Date(voc.created_at).toLocaleString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <Link href={`/${locale}/voc/${voc.id}`} className="flex-shrink-0">
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
            <p className="text-slate-500 font-bold">{t?.empty_list ?? 'No VOC found'}</p>
            <p className="text-slate-400 text-xs mt-1">If you have any issues with your orders, please let us know.</p>
            <Link href={`/${locale}/orders?action=voc`} className="mt-6">
              <ZenButton variant="tactile" className="flex items-center gap-2 text-xs">
                <Plus size={14} />
                {t?.create_voc ?? 'VOC 접수하기'}
              </ZenButton>
            </Link>
          </ZenCard>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4" id="voc-pagination">
          {/* Prev */}
          <Link
            href={page > 1 ? buildUrl({ page: String(page - 1) }) : '#'}
            aria-disabled={page <= 1}
            className={cn(
              "flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg border transition-all",
              page <= 1
                ? "pointer-events-none border-slate-100 text-slate-300 bg-white"
                : "border-slate-200 text-slate-600 bg-white hover:border-brand-300 hover:text-brand-600"
            )}
          >
            <ChevronLeft size={14} />
            Prev
          </Link>

          {/* Page Numbers */}
          {buildPageNumbers(page, totalPages).map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className="px-2 py-2 text-xs text-slate-400 font-bold select-none">
                ···
              </span>
            ) : (
              <Link
                key={p}
                href={buildUrl({ page: String(p) })}
                className={cn(
                  "min-w-[36px] h-9 flex items-center justify-center text-xs font-bold rounded-lg border transition-all",
                  p === page
                    ? "border-brand-500 bg-brand-600 text-white shadow-sm shadow-brand-200"
                    : "border-slate-200 text-slate-600 bg-white hover:border-brand-300 hover:text-brand-600"
                )}
              >
                {p}
              </Link>
            )
          )}

          {/* Next */}
          <Link
            href={page < totalPages ? buildUrl({ page: String(page + 1) }) : '#'}
            aria-disabled={page >= totalPages}
            className={cn(
              "flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg border transition-all",
              page >= totalPages
                ? "pointer-events-none border-slate-100 text-slate-300 bg-white"
                : "border-slate-200 text-slate-600 bg-white hover:border-brand-300 hover:text-brand-600"
            )}
          >
            Next
            <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function cn(...inputs: (string | boolean | undefined | null)[]): string {
  return inputs.filter(Boolean).join(' ');
}

/** 표시할 페이지 번호 배열 생성 (슬라이딩 윈도우 + 말줄임표) */
function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [];
  const addPage = (p: number) => { if (!pages.includes(p)) pages.push(p); };

  // Always show first and last
  addPage(1);

  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);

  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) addPage(i);
  if (end < total - 1) pages.push('...');

  addPage(total);

  return pages;
}
