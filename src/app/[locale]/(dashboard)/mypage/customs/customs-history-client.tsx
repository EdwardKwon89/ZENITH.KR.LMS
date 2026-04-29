"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { ColumnDef } from '@tanstack/react-table';
import { 
  FileCheck, 
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { CustomsDeclaration, CustomsStatus } from '@/lib/customs/types';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import { ZenBadge } from '@/components/ui/ZenUI';

interface CustomsHistoryClientProps {
  initialData: CustomsDeclaration[];
  initialTotal: number;
}

export default function CustomsHistoryClient({ 
  initialData, 
  initialTotal 
}: CustomsHistoryClientProps) {
  const t = useTranslations('Customs');
  const params = useParams();
  const locale = params.locale as string;

  const columns: ColumnDef<CustomsDeclaration>[] = [
    {
      accessorKey: 'order_no',
      header: 'Order #',
      cell: ({ row }) => (
        <Link 
          href={`/${locale}/orders/${row.original.order_id}`}
          className="text-blue-600 hover:underline font-bold flex items-center gap-1"
        >
          {row.getValue('order_no')}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    },
    {
      accessorKey: 'declaration_no',
      header: t('declaration_no'),
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('declaration_no') || '-'}</span>,
    },
    {
      accessorKey: 'cargo_description',
      header: 'Cargo',
      cell: ({ row }) => <span className="truncate max-w-[200px] block">{row.getValue('cargo_description')}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as CustomsStatus;
        const statusKey = status.toLowerCase();
        
        switch (status) {
          case 'PENDING':
            return <ZenBadge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />{t(`customs_status_${statusKey}`)}</ZenBadge>;
          case 'SUBMITTED':
            return <ZenBadge variant="info" className="gap-1 animate-pulse"><Clock className="w-3 h-3" />{t(`customs_status_${statusKey}`)}</ZenBadge>;
          case 'APPROVED':
            return <ZenBadge variant="success" className="gap-1"><CheckCircle className="w-3 h-3" />{t(`customs_status_${statusKey}`)}</ZenBadge>;
          case 'HELD':
            return <ZenBadge variant="warning" className="gap-1"><AlertCircle className="w-3 h-3" />{t(`customs_status_${statusKey}`)}</ZenBadge>;
          case 'REJECTED':
            return <ZenBadge variant="error" className="gap-1"><XCircle className="w-3 h-3" />{t(`customs_status_${statusKey}`)}</ZenBadge>;
          default:
            return <ZenBadge>{status}</ZenBadge>;
        }
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-slate-500 text-xs">
          {new Date(row.getValue('created_at')).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-neutral-900/50 rounded-[2rem] border border-slate-100 dark:border-neutral-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
            <FileCheck className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold">Customs Declarations</h2>
        </div>
      </div>

      <ZenDataGrid 
        data={initialData} 
        columns={columns} 
      />
      
      {initialTotal === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileCheck className="w-16 h-16 text-slate-100 dark:text-neutral-800 mb-4" />
          <p className="text-slate-400 font-medium">통관 신고 내역이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
