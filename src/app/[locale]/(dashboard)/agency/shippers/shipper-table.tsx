'use client';

import { Building } from 'lucide-react';
import { ShipperTableRow } from './shipper-table-row';

interface ShipperTableProps {
  shippers: any[];
  editingId: string | null;
  editGrade: string;
  editRate: number;
  onEdit: (shipper: any) => void;
  onCancel: () => void;
  onSave: (id: string) => void;
  onGradeChange: (v: string) => void;
  onRateChange: (v: number) => void;
  t: (key: string) => string;
}

export function ShipperTable({ shippers, editingId, editGrade, editRate, onEdit, onCancel, onSave, onGradeChange, onRateChange, t }: ShipperTableProps) {
  return (
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
            {shippers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-20 text-center text-slate-400">
                  <Building size={32} className="mx-auto mb-2 text-slate-200" />
                  {t('empty')}
                </td>
              </tr>
            ) : shippers.map((shipper) => (
              <ShipperTableRow
                key={shipper.id}
                shipper={shipper}
                isEditing={editingId === shipper.id}
                editGrade={editGrade}
                editRate={editRate}
                onEdit={() => onEdit(shipper)}
                onCancel={onCancel}
                onSave={() => onSave(shipper.id)}
                onGradeChange={onGradeChange}
                onRateChange={onRateChange}
                t={t}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
