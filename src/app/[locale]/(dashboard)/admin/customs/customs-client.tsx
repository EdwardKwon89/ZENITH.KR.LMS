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
  Eye,
  Plus
} from 'lucide-react';
import { ZenCard, ZenButton, ZenBadge, ZenInput } from '@/components/ui/ZenUI';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import { CustomsDeclaration, CustomsStatus } from '@/lib/customs/types';
import { getDeclarations, submitDeclaration, updateDeclarationStatus, createDeclaration } from '@/app/actions/customs';
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
      const { data: success, error } = await submitDeclaration(id);
      if (error) {
        toast.error(error || '제출에 실패했습니다.');
      } else {
        toast.success('신고가 성공적으로 제출되었습니다.');
        fetchData(activeTab);
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
      const { data: success, error } = await updateDeclarationStatus({
        id,
        ...payload
      });
      if (error) {
        toast.error(error || '업데이트에 실패했습니다.');
      } else {
        toast.success('상태가 업데이트되었습니다.');
        setIsModalOpen(false);
        fetchData(activeTab);
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateDeclaration = async (payload: {
    orderId: string;
    cargoDescription: string;
    declaredValue: number;
    currencyCode: string;
  }) => {
    setIsCreating(true);
    try {
      const { data: id, error } = await createDeclaration(payload);
      if (error) {
        toast.error(error || '신고 생성에 실패했습니다.');
      } else {
        toast.success('신고가 성공적으로 생성되었습니다.');
        setIsCreateModalOpen(false);
        fetchData(activeTab);
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
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
                data-action="submit-declaration"
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
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">통관 관리</h2>
          <p className="text-muted-foreground">통관 신고 및 상태를 관리합니다.</p>
        </div>
        <ZenButton 
          variant="tactile" 
          className="bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={18} className="mr-2" />
          신고 생성
        </ZenButton>
      </div>

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

      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateDeclarationModal 
            onClose={() => setIsCreateModalOpen(false)} 
            onCreate={handleCreateDeclaration}
            isCreating={isCreating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateDeclarationModal({ 
  onClose, 
  onCreate, 
  isCreating 
}: { 
  onClose: () => void; 
  onCreate: (payload: any) => void;
  isCreating: boolean;
}) {
  const [orderId, setOrderId] = useState('');
  const [cargoDescription, setCargoDescription] = useState('');
  const [declaredValue, setDeclaredValue] = useState(0);
  const [currencyCode, setCurrencyCode] = useState('KRW');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg"
      >
        <ZenCard className="bg-white p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-xl font-bold text-slate-900">신규 통관 신고 생성</h3>
              <p className="text-sm text-slate-500">신고할 오더 정보를 입력하세요.</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Order ID</label>
              <ZenInput 
                id="order-id-input"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="오더의 UUID를 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">화물 설명</label>
              <ZenInput 
                id="cargo-description-input"
                value={cargoDescription}
                onChange={(e) => setCargoDescription(e.target.value)}
                placeholder="예: 전자제품, 의류 등"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">신고 금액</label>
                <ZenInput 
                  id="declared-value-input"
                  type="number"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">통화</label>
                <select 
                  id="currency-code-select"
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/10 focus:outline-none"
                >
                  <option value="KRW">KRW</option>
                  <option value="USD">USD</option>
                  <option value="JPY">JPY</option>
                  <option value="CNY">CNY</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
            <ZenButton variant="ghost" onClick={onClose} className="flex-1">취소</ZenButton>
            <ZenButton 
              id="submit-declaration-btn"
              variant="tactile" 
              className="flex-1 bg-brand-600 text-white hover:bg-brand-700"
              onClick={() => onCreate({ orderId, cargoDescription, declaredValue, currencyCode })}
              loading={isCreating}
              disabled={!orderId || !cargoDescription}
            >
              생성하기
            </ZenButton>
          </div>
        </ZenCard>
      </motion.div>
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
                  id="status-select"
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
                  id="admin-note-input"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/10 focus:outline-none min-h-[100px]"
                  placeholder="상태 변경 사유 또는 특이사항"
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
            <ZenButton variant="ghost" onClick={onClose} className="flex-1">취소</ZenButton>
            <ZenButton 
              id="save-status-btn"
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
