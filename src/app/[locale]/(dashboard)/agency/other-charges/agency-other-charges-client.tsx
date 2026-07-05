'use client';

import { useState } from 'react';
import { Plus, Edit2, XCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZenBadge } from '@/components/ui/ZenUI';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import {
  upsertAgencyOtherCharge,
  deactivateAgencyOtherCharge,
} from '@/app/actions/agency/other-charges';
import type { AgencyOtherChargeRow } from '@/app/actions/agency/other-charges';
import type { UpsOtherCharge } from '@/types/ups';
import type { ColumnDef } from '@tanstack/react-table';

interface Props {
  charges: AgencyOtherChargeRow[];
  allOtherCharges: UpsOtherCharge[];
  agencyOrgId: string;
}

export function AgencyOtherChargesClient({ charges, allOtherCharges, agencyOrgId }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<AgencyOtherChargeRow | null>(null);
  const [form, setForm] = useState({ other_charge_id: '', selling_price: 0, cost_price: 0 });
  const [loading, setLoading] = useState(false);

  const registeredChargeIds = new Set(charges.map(c => c.other_charge_id));
  const availableCharges = allOtherCharges.filter(c => !registeredChargeIds.has(c.id));

  const resetForm = () => {
    setForm({ other_charge_id: '', selling_price: 0, cost_price: 0 });
    setEditingCharge(null);
  };

  const openNew = () => { resetForm(); setIsModalOpen(true); };

  const openEdit = (charge: AgencyOtherChargeRow) => {
    setForm({ other_charge_id: charge.other_charge_id, selling_price: charge.selling_price, cost_price: charge.cost_price });
    setEditingCharge(charge);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.other_charge_id) return;
    setLoading(true);
    try {
      const { error } = await upsertAgencyOtherCharge(agencyOrgId, {
        other_charge_id: form.other_charge_id,
        selling_price: form.selling_price,
        cost_price: form.cost_price,
      });
      if (error) throw new Error(error);
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('비활성화하시겠습니까?')) return;
    setLoading(true);
    try {
      await deactivateAgencyOtherCharge(id);
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const chargeMap = Object.fromEntries(allOtherCharges.map(c => [c.id, c]));

  const columns: ColumnDef<AgencyOtherChargeRow>[] = [
    { id: 'code', header: '코드', cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.other_charge?.charge_code}</ZenBadge> },
    { id: 'name', header: '명칭', cell: ({ row }) => <span className="text-sm font-medium">{row.original.other_charge?.charge_name}</span> },
    { id: 'unit', header: '단위', cell: ({ row }) => <span className="text-xs font-mono">{row.original.other_charge?.unit}</span> },
    { accessorKey: 'selling_price', header: '판매가', cell: ({ row }) => <span className="font-mono text-sm">{row.original.selling_price.toLocaleString()}원</span> },
    { accessorKey: 'cost_price', header: '원가', cell: ({ row }) => <span className="font-mono text-sm text-slate-500">{row.original.cost_price.toLocaleString()}원</span> },
    { id: 'status', header: '상태', cell: ({ row }) => <ZenBadge variant={row.original.is_active ? 'success' : 'default'}>{row.original.is_active ? '활성' : '비활성'}</ZenBadge> },
    { id: 'actions', header: '관리', cell: ({ row }: any) => (
      <div className="flex items-center gap-2">
        <button onClick={() => openEdit(row.original)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors"><Edit2 size={16} /></button>
        <button onClick={() => handleDelete(row.original.id)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openNew} disabled={availableCharges.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold shadow-sm disabled:opacity-50">
          <Plus size={18} /> 부가요금 등록
        </button>
      </div>

      <ZenDataGrid columns={columns} data={charges} />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">{editingCharge ? '부가요금 수정' : '부가요금 등록'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><XCircle size={20} className="text-slate-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                {!editingCharge && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">부가요금 코드</label>
                    <select value={form.other_charge_id} onChange={e => setForm({ ...form, other_charge_id: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                      <option value="">선택</option>
                      {availableCharges.map(c => <option key={c.id} value={c.id}>{c.charge_code} — {c.charge_name}</option>)}
                    </select>
                  </div>
                )}
                {editingCharge && (
                  <p className="text-sm font-medium text-slate-700">{editingCharge.other_charge?.charge_code} — {editingCharge.other_charge?.charge_name}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">판매가</label>
                    <input type="number" step="0.01" min="0" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">원가</label>
                    <input type="number" step="0.01" min="0" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
                <p className="text-xs text-slate-400">※ 등록되지 않은 부가요금은 공통코드 기본값이 적용됩니다.</p>
                <button onClick={handleSubmit} disabled={loading || !form.other_charge_id}
                  className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold disabled:opacity-50">
                  {loading ? '저장 중...' : editingCharge ? '수정 완료' : '등록'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
