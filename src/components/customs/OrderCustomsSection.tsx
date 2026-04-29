import React from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck, Clock, CheckCircle, AlertCircle, XCircle, FileText } from 'lucide-react';
import { CustomsDeclaration, CustomsStatus } from '@/lib/customs/types';
import { format } from 'date-fns';

interface OrderCustomsSectionProps {
  declaration: CustomsDeclaration | null;
}

export default function OrderCustomsSection({ declaration }: OrderCustomsSectionProps) {
  const t = useTranslations('Customs');

  if (!declaration) {
    return (
      <section className="bg-white dark:bg-neutral-900/50 rounded-[2.5rem] border border-slate-100 dark:border-neutral-800 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            {t('my_customs')}
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="w-12 h-12 text-slate-200 dark:text-neutral-700 mb-4" />
          <p className="text-slate-500 dark:text-neutral-400">
            준비된 통관 정보가 없습니다.
          </p>
        </div>
      </section>
    );
  }

  const getStatusIcon = (status: CustomsStatus) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-5 h-5 text-slate-400" />;
      case 'SUBMITTED': return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'APPROVED': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'HELD': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'REJECTED': return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusClass = (status: CustomsStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'APPROVED': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'HELD': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'REJECTED': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  return (
    <section className="bg-white dark:bg-neutral-900/50 rounded-[2.5rem] border border-slate-100 dark:border-neutral-800 p-8 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <ShieldCheck className="w-24 h-24" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-500" />
          {t('my_customs')}
        </h2>
        <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${getStatusClass(declaration.status)}`}>
          {getStatusIcon(declaration.status)}
          {t(`customs_status_${declaration.status.toLowerCase()}`)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">{t('declaration_no')}</p>
            <p className="font-mono text-sm font-semibold">{declaration.declaration_no || '-'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Cargo</p>
            <p className="text-sm line-clamp-1">{declaration.cargo_description}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Timeline</p>
              <div className="space-y-1">
                <p className="text-[11px] flex justify-between gap-4">
                  <span className="text-slate-500">Created:</span>
                  <span className="font-medium">{format(new Date(declaration.created_at), 'yyyy-MM-dd HH:mm')}</span>
                </p>
                {declaration.submitted_at && (
                  <p className="text-[11px] flex justify-between gap-4">
                    <span className="text-slate-500">Submitted:</span>
                    <span className="font-medium">{format(new Date(declaration.submitted_at), 'yyyy-MM-dd HH:mm')}</span>
                  </p>
                )}
                {declaration.resolved_at && (
                  <p className="text-[11px] flex justify-between gap-4">
                    <span className="text-slate-500">Resolved:</span>
                    <span className="font-medium">{format(new Date(declaration.resolved_at), 'yyyy-MM-dd HH:mm')}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {declaration.admin_note && (
        <div className="mt-6 p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl border border-slate-100 dark:border-neutral-800">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Official Note
          </p>
          <p className="text-xs text-slate-600 dark:text-neutral-300 italic">
            "{declaration.admin_note}"
          </p>
        </div>
      )}
    </section>
  );
}
