"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ColumnDef } from '@tanstack/react-table';
import { 
  FileCheck, 
  Search, 
  Filter, 
  MoreHorizontal, 
  ExternalLink, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  XCircle,
  Eye
} from 'lucide-react';
import { ZenCard, ZenButton, ZenBadge, ZenInput } from '@/components/ui/ZenUI';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import { CustomsDeclaration, CustomsStatus } from '@/lib/customs/types';
import { getDeclarations, submitDeclaration, updateDeclarationStatus } from '@/app/actions/customs';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomsClientProps {
  initialData: CustomsDeclaration[];
  initialTotal: number;
}

export default function CustomsClient({ initialData, initialTotal }: CustomsClientProps) {
  const t = useTranslations('Customs');
  const [data, setData] = useState<CustomsDeclaration[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomsStatus | 'ALL'>('ALL');
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState<CustomsDeclaration | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = async (status?: CustomsStatus | 'ALL') => {
    setLoading(true);
    try {
      const result = await getDeclarations({
        status: status === 'ALL' ? undefined : status as CustomsStatus,
      });
      setData(result.declarations);
      setTotal(result.total);
    } catch (error) {
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (status: CustomsStatus | 'ALL') => {
    setActiveTab(status);
    fetchData(status);
  };

  const handleSubmit = async (id: string) => {
    if (!confirm('관세청에 신고를 제출하시겠습니까?')) return;
    
    setLoading(true);
    try {
      const result = await submitDeclaration(id);
      if (result.success) {
        toast.success('신고가 성공적으로 제출되었습니다.');
        fetchData(activeTab);
      } else {
        toast.error(result.error || '제출에 실패했습니다.');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, payload: { status: CustomsStatus; declarationNo?: string; adminNote?: string }) => {
    setIsUpdating(true);
    try {
      const result = await updateDeclarationStatus({
        id,
        ...payload
      });
      if (result.success) {
        toast.success('상태가 업데이트되었습니다.');
        setIsModalOpen(false);
        fetchData(activeTab);
      } else {
        toast.error(result.error || '업데이트에 실패했습니다.');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: CustomsStatus) => {
    switch (status) {
      case 'PENDING': return <ZenBadge variant="warning">{t('customs_status_pending')}</ZenBadge>;
      case 'SUBMITTED': return <ZenBadge variant="info">{t('customs_status_submitted')}</ZenBadge>;
      case 'APPROVED': return <ZenBadge variant="success">{t('customs_status_approved')}</ZenBadge>;
      case 'HELD': return <ZenBadge variant="danger">{t('customs_status_held')}</ZenBadge>;
      case 'REJECTED': return <ZenBadge variant="danger">{t('customs_status_rejected')}</ZenBadge>;
      default: return <ZenBadge>{status}</ZenBadge>;
    }
  };

  const columns: ColumnDef<CustomsDeclaration>[] = [
    {
      accessorKey: 'order_no',
      header: '오더번호',
      cell: ({ row }) => <span className="font-bold text-blue-600">#{row.original.order_no}</span>
    },
    {
      accessorKey: 'shipper_name',
      header: '화주',
    },
    {
      accessorKey: 'cargo_description',
      header: '화물 설명',
      cell: ({ row }) => <span className="truncate max-w-[200px] block">{row.original.cargo_description}</span>
    },
    {
      accessorKey: 'declared_value',
      header: '신고금액',
      cell: ({ row }) => (
        <span>
          {row.original.declared_value?.toLocaleString()} {row.original.currency_code}
        </span>
      )
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => getStatusBadge(row.original.status as CustomsStatus)
    },
    {
      accessorKey: 'declaration_no',
      header: '신고번호',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.declaration_no || '-'}</span>
    },
    {
      accessorKey: 'created_at',
      header: '생성일',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString()
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex gap-2">
            <ZenButton 
              variant="glass" 
              className="p-2 h-auto"
              onClick={() => {
                setSelectedItem(item);
                setIsModalOpen(true);
              }}
            >
              <Eye size={16} />
            </ZenButton>
            {item.status === 'PENDING' && (
              <ZenButton 
                variant="tactile" 
                className="p-2 h-auto bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => handleSubmit(item.id)}
              >
                <Send size={16} />
              </ZenButton>
            )}
          </div>
        );
      }
    }
  ];

  const TABS: (CustomsStatus | 'ALL')[] = ['ALL', 'PENDING', 'SUBMITTED', 'APPROVED', 'HELD', 'REJECTED'];

  return (
    <div className="space-y-6">
      {/* Status Tabs */}
      <div className="flex p-1 bg-slate-100/50 rounded-2xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === tab 
                ? "bg-white text-brand-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-white hover:shadow-sm"
            )}
          >
            {tab === 'ALL' ? '전체' : t(`customs_status_${tab.toLowerCase()}`)}
          </button>
        ))}
      </div>

      <ZenDataGrid 
        columns={columns} 
        data={data} 
        loading={loading}
      />

      {/* Detail & Action Modal */}
      <AnimatePresence>
        {isModalOpen && selectedItem && (
          <CustomsDetailModal 
            item={selectedItem} 
            onClose={() => setIsModalOpen(false)} 
            onUpdate={handleUpdateStatus}
            isUpdating={isUpdating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CustomsDetailModal({ 
  item, 
  onClose, 
  onUpdate, 
  isUpdating 
}: { 
  item: CustomsDeclaration; 
  onClose: () => void; 
  onUpdate: (id: string, payload: any) => void;
  isUpdating: boolean;
}) {
  const t = useTranslations('Customs');
  const [status, setStatus] = useState<CustomsStatus>(item.status as CustomsStatus);
  const [declarationNo, setDeclarationNo] = useState(item.declaration_no || '');
  const [adminNote, setAdminNote] = useState(item.admin_note || '');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl"
      >
        <ZenCard className="bg-white p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-xl font-bold text-slate-900">통관 신고 상세</h3>
              <p className="text-sm text-slate-500">Order #{item.order_no}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">화주</label>
                <p className="font-bold text-slate-900">{item.shipper_name}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">신고금액</label>
                <p className="font-bold text-slate-900">{item.declared_value?.toLocaleString()} {item.currency_code}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">화물 설명</label>
                <p className="text-slate-700">{item.cargo_description}</p>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">처리 상태</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CustomsStatus)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/10 focus:outline-none"
                >
                  <option value="PENDING">신고 대기</option>
                  <option value="SUBMITTED">신고 완료</option>
                  <option value="APPROVED">통관 승인</option>
                  <option value="HELD">보류</option>
                  <option value="REJECTED">통관 반려</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{t('declaration_no')}</label>
                <ZenInput 
                  value={declarationNo}
                  onChange={(e) => setDeclarationNo(e.target.value)}
                  placeholder="관세청 신고번호 입력"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">관리자 메모</label>
                <textarea 
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/10 focus:outline-none min-h-[100px]"
                  placeholder="상태 변경 사유 또는 특이사항"
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
            <ZenButton variant="ghost" onClick={onClose} className="flex-1">취ce</ZenButton>
            <ZenButton 
              variant="tactile" 
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => onUpdate(item.id, { status, declarationNo, adminNote })}
              loading={isUpdating}
            >
              상태 저장
            </ZenButton>
          </div>
        </ZenCard>
      </motion.div>
    </div>
  );
}
