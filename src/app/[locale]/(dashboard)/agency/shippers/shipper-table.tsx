'use client';

import type { AgencyShipperRow } from '@/types/agency';
import { ShipperTableRow } from './shipper-table-row';

interface ShipperTableProps {
  shippers: AgencyShipperRow[];
  editingId: string | null;
  editGrade: string;
  editRate: number;
  onEdit: (shipper: AgencyShipperRow) => void;
  onCancel: () => void;
  onSave: (id: string) => void;
  onGradeChange: (v: string) => void;
  onRateChange: (v: number) => void;
  t: (key: string) => string;
}

export function ShipperTable(props: ShipperTableProps) {
  const { shippers, editingId, editGrade, editRate, onEdit, onCancel, onSave, onGradeChange, onRateChange, t } = props;

  if (shippers.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
        <p className="text-slate-500 text-sm font-medium">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {['name', 'type', 'grade', 'discount_rate', 'status', 'created_at', 'actions'].map((col) => (
              <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {t(`col_${col}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shippers.map((shipper) => (
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