'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building, Plus, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateAgencyShipperGrade } from '@/app/actions/agency/shippers';

const TYPE_BADGE: Record<string, string> = {
  INDIVIDUAL: 'bg-stone-100 text-stone-800',
  CORPORATE: 'bg-slate-100 text-slate-800',
};

interface AgencyShippersClientProps {
  shippers: any[];
  t: (key: string) => string;
}

export function AgencyShippersClient({ shippers, t }: AgencyShippersClientProps) {
  const [localShippers, setLocalShippers] = useState(shippers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrade, setEditGrade] = useState('');
  const [editRate, setEditRate] = useState(0);
  const [error, setError] = useState('');

  const startEdit = (shipper: any) => {
    setEditingId(shipper.id);
    setEditGrade(shipper.grade || '');
    setEditRate(shipper.discount_rate);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditGrade('');
    setEditRate(0);
    setError('');
  };

  const saveEdit = async (id: string) => {
    setError('');
    try {
      await updateAgencyShipperGrade(id, editGrade, editRate);
      setLocalShippers((prev) => prev.map((s) => (s.id === id ? { ...s, grade: editGrade || null, discount_rate: editRate } : s)));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || t('submit_error'));
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 min-h-screen animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('description')}</p>
        </div>
        <Link
          href="/agency/shippers/new"
          className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus size={16} /> {t('new_shipper')}
        </Link>
      </header>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto p-1"><ChevronLeft size={14} /></button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">{t('table_name')}</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">{t('table_type')}</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">{t('table_grade')}</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">{t('table_discount')}</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">{t('table_status')}</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">{t('table_created')}</th>
                <th className="text-right px-4 py-3 font-bold text-slate-600 text-[10px] uppercase tracking-widest">관리</th>
              </tr>
            </thead>
            <tbody>
              {localShippers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center text-slate-400">
                    <Building size={32} className="mx-auto mb-2 text-slate-200" />
                    {t('empty')}
                  </td>
                </tr>
              ) : localShippers.map((shipper) => (
                <tr key={shipper.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {shipper.shipper?.name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider", TYPE_BADGE[shipper.shipper_type] || 'bg-slate-100 text-slate-600')}>
                      {t(`type_${shipper.shipper_type}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === shipper.id ? (
                      <input
                        value={editGrade}
                        onChange={(e) => setEditGrade(e.target.value)}
                        className="w-24 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder={t('grade_placeholder')}
                      />
                    ) : (
                      <span className="text-slate-700">{shipper.grade || <span className="text-slate-400">{t('grade_placeholder')}</span>}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === shipper.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editRate * 100}
                          onChange={(e) => setEditRate(Number(e.target.value) / 100)}
                          min={0}
                          max={99.99}
                          step={0.1}
                          className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    ) : (
                      <span className="text-slate-700">{(shipper.discount_rate * 100).toFixed(1)}%</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                      shipper.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    )}>
                      {shipper.is_active ? t('status_active') : t('status_inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {shipper.created_at ? new Date(shipper.created_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === shipper.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={cancelEdit} className="px-2 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                          취소
                        </button>
                        <button onClick={() => saveEdit(shipper.id)} className="px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                          저장
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(shipper)}
                        className="px-2 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        수정
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
