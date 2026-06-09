"use client";

import { useState, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, XCircle, Edit2, Trash2, Truck } from "lucide-react";
import { USER_ROLES } from "@/lib/auth/rbac";
import { ZenBadge } from "@/components/ui/ZenUI";
import ZenDataGrid from "@/components/ui/ZenDataGrid";
import {
  createDeliveryRate,
  updateDeliveryRate,
  deleteDeliveryRate,
} from "@/app/actions/admin/delivery-rates";
import type { DeliveryRate, CreateDeliveryRateData } from "@/app/actions/admin/delivery-rates";

interface Organization { id: string; name: string; }

interface Props {
  initialRates: DeliveryRate[];
  organizations: Organization[];
  userRole: string;
  userOrgId: string;
}

type TabType = 'LOCAL' | 'TOTAL';

const EMPTY_FORM = (serviceType: TabType, orgId: string): CreateDeliveryRateData => ({
  org_id: orgId, service_type: serviceType, country_code: null, transport_mode: null,
  origin_code: null, dest_code: null, currency: 'USD',
  cost_per_kg: null, cost_per_cbm: null, transit_days: null,
  valid_from: '', valid_until: null,
});

export default function DeliveryRatesClient({ initialRates, organizations, userRole, userOrgId }: Props) {
  const [rates, setRates] = useState(initialRates);
  const [activeTab, setActiveTab] = useState<TabType>('LOCAL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<DeliveryRate | null>(null);
  const [form, setForm] = useState<CreateDeliveryRateData>(EMPTY_FORM('LOCAL', userRole === USER_ROLES.DELIVERY_AGENT ? userOrgId : ''));
  const [loading, setLoading] = useState(false);

  const canEdit = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.MANAGER || userRole === USER_ROLES.DELIVERY_AGENT;
  const isAgent = userRole === USER_ROLES.DELIVERY_AGENT;
  const orgMap = Object.fromEntries(organizations.map(o => [o.id, o.name]));

  const filteredRates = rates.filter(r => {
    if (r.service_type !== activeTab) return false;
    if (userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.MANAGER) return true;
    if (isAgent) return r.org_id === userOrgId;
    return r.is_active;
  });

  const resetForm = useCallback((serviceType: TabType) => {
    setForm(EMPTY_FORM(serviceType, isAgent ? userOrgId : ''));
    setEditingRate(null);
  }, [isAgent, userOrgId]);

  const openNew = () => { resetForm(activeTab); setIsModalOpen(true); };

  const openEdit = (rate: DeliveryRate) => {
    setForm({
      org_id: rate.org_id, service_type: rate.service_type as TabType,
      country_code: rate.country_code, transport_mode: rate.transport_mode,
      origin_code: rate.origin_code, dest_code: rate.dest_code, currency: rate.currency,
      cost_per_kg: rate.cost_per_kg, cost_per_cbm: rate.cost_per_cbm,
      transit_days: rate.transit_days, valid_from: rate.valid_from, valid_until: rate.valid_until,
    });
    setEditingRate(rate);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.org_id || !form.valid_from) return;
    setLoading(true);
    try {
      if (editingRate) {
        const { error } = await updateDeliveryRate(editingRate.id, form);
        if (error) throw new Error(error);
      } else {
        const { error } = await createDeliveryRate(form);
        if (error) throw new Error(error);
      }
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 요율을 비활성화하시겠습니까?')) return;
    setLoading(true);
    try {
      const { error } = await deleteDeliveryRate(id);
      if (error) throw new Error(error);
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const localColumns: ColumnDef<DeliveryRate>[] = [
    {
      id: "org_id",
      accessorFn: (row) => orgMap[row.org_id] || row.org_id,
      header: "배송사",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500"><Truck size={14} /></div>
          <span className="font-medium text-slate-900">{orgMap[row.original.org_id] || row.original.org_id}</span>
        </div>
      ),
    },
    {
      accessorKey: "country_code",
      header: "국가",
      cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.country_code ?? '-'}</ZenBadge>,
    },
    {
      accessorKey: "cost_per_kg",
      header: "무게/kg",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.cost_per_kg?.toLocaleString() ?? '-'}</span>,
    },
    {
      accessorKey: "cost_per_cbm",
      header: "부피/CBM",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.cost_per_cbm?.toLocaleString() ?? '-'}</span>,
    },
    {
      accessorKey: "currency",
      header: "통화",
      cell: ({ row }) => <ZenBadge variant="info">{row.original.currency}</ZenBadge>,
    },
    {
      accessorKey: "transit_days",
      header: "소요일",
      cell: ({ row }) => <span className="text-sm">{row.original.transit_days ?? '-'} 일</span>,
    },
    {
      id: "validity",
      header: "유효기간",
      cell: ({ row }) => (
        <span className="text-xs text-slate-500 font-mono">
          {row.original.valid_from} ~ {row.original.valid_until ?? '무기한'}
        </span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "상태",
      cell: ({ row }) => <ZenBadge variant={row.original.is_active ? "success" : "default"}>{row.original.is_active ? "활성" : "만료"}</ZenBadge>,
    },
  ];

  const totalColumns: ColumnDef<DeliveryRate>[] = [
    {
      id: "org_id",
      accessorFn: (row) => orgMap[row.org_id] || row.org_id,
      header: "배송사",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500"><Truck size={14} /></div>
          <span className="font-medium text-slate-900">{orgMap[row.original.org_id] || row.original.org_id}</span>
        </div>
      ),
    },
    {
      accessorKey: "transport_mode",
      header: "운송수단",
      cell: ({ row }) => <ZenBadge variant="default">{row.original.transport_mode ?? '-'}</ZenBadge>,
    },
    {
      id: "route",
      header: "노선",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ZenBadge variant="default" className="font-mono">{row.original.origin_code ?? '-'}</ZenBadge>
          <span className="text-slate-300">→</span>
          <ZenBadge variant="default" className="font-mono">{row.original.dest_code ?? '-'}</ZenBadge>
        </div>
      ),
    },
    {
      accessorKey: "cost_per_kg",
      header: "무게/kg",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.cost_per_kg?.toLocaleString() ?? '-'}</span>,
    },
    {
      accessorKey: "cost_per_cbm",
      header: "부피/CBM",
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.cost_per_cbm?.toLocaleString() ?? '-'}</span>,
    },
    {
      accessorKey: "currency",
      header: "통화",
      cell: ({ row }) => <ZenBadge variant="info">{row.original.currency}</ZenBadge>,
    },
    {
      id: "validity",
      header: "유효기간",
      cell: ({ row }) => (
        <span className="text-xs text-slate-500 font-mono">
          {row.original.valid_from} ~ {row.original.valid_until ?? '무기한'}
        </span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "상태",
      cell: ({ row }) => <ZenBadge variant={row.original.is_active ? "success" : "default"}>{row.original.is_active ? "활성" : "만료"}</ZenBadge>,
    },
  ];

  const actionCol: ColumnDef<DeliveryRate> = {
    id: "actions",
    header: "관리",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <button onClick={() => openEdit(row.original)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors">
          <Edit2 size={16} />
        </button>
        <button onClick={() => handleDelete(row.original.id)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    ),
  };

  const columns = canEdit
    ? [...(activeTab === 'LOCAL' ? localColumns : totalColumns), actionCol]
    : (activeTab === 'LOCAL' ? localColumns : totalColumns);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-slate-50 rounded-2xl border border-slate-200 self-start">
        {([{ key: 'LOCAL', label: '배송(Local)' }, { key: 'TOTAL', label: '배송(Total)' }] as { key: TabType; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); resetForm(tab.key); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ZenDataGrid
        columns={columns}
        data={filteredRates}
        actions={
          canEdit ? (
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold shadow-sm hover:shadow-brand-500/20"
            >
              <Plus size={18} />
              새 요율 등록
            </button>
          ) : undefined
        }
      />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingRate ? '배송 요율 수정' : '배송 요율 등록'} ({activeTab === 'LOCAL' ? 'Local' : 'Total'})
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {!isAgent && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">배송사 조직</label>
                    <select value={form.org_id} onChange={e => setForm({ ...form, org_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all">
                      <option value="">선택</option>
                      {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                )}
                {activeTab === 'LOCAL' ? (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">국가 코드</label>
                    <input type="text" value={form.country_code ?? ''} maxLength={3}
                      onChange={e => setForm({ ...form, country_code: e.target.value.toUpperCase() || null })}
                      placeholder="KR, US, JP..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-mono" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">운송수단</label>
                      <select value={form.transport_mode ?? ''} onChange={e => setForm({ ...form, transport_mode: e.target.value || null })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all">
                        <option value="">선택</option>
                        <option value="AIR">항공</option>
                        <option value="SEA">해상</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">출발항</label>
                      <input type="text" value={form.origin_code ?? ''} onChange={e => setForm({ ...form, origin_code: e.target.value.toUpperCase() || null })}
                        placeholder="ICN, LAX..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">도착항</label>
                      <input type="text" value={form.dest_code ?? ''} onChange={e => setForm({ ...form, dest_code: e.target.value.toUpperCase() || null })}
                        placeholder="NRT, JFK..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-mono" />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "무게/kg", key: "cost_per_kg" },
                    { label: "부피/CBM", key: "cost_per_cbm" },
                    { label: "소요일", key: "transit_days" },
                  ].map(({ label, key }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
                      <input type="number" value={(form as any)[key] ?? ''}
                        onChange={e => setForm({ ...form, [key]: e.target.value ? Number(e.target.value) : null })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all" />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">통화</label>
                  <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all">
                    {['USD', 'KRW', 'JPY', 'CNY'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">시작일</label>
                    <input type="date" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">종료일 (선택)</label>
                    <input type="date" value={form.valid_until ?? ''} onChange={e => setForm({ ...form, valid_until: e.target.value || null })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all" />
                  </div>
                </div>
                <div className="pt-2">
                  <button onClick={handleSubmit}
                    disabled={loading || !form.org_id || !form.valid_from}
                    className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50">
                    {loading ? '저장 중...' : editingRate ? '수정 완료' : '등록'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
