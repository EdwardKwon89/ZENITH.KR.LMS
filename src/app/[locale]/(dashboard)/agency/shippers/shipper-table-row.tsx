'use client';

import { cn } from '@/lib/utils';
import type { AgencyShipperRow } from '@/types/agency';
import { EditableGradeCell, EditableRateCell, ActionCell } from './editable-cell';

const TYPE_BADGE: Record<string, string> = {
  INDIVIDUAL: 'bg-stone-100 text-stone-800',
  CORPORATE: 'bg-slate-100 text-slate-800',
};

interface ShipperTableRowProps {
  shipper: AgencyShipperRow;
  t: (key: string) => string;
}

export function ShipperTableRow({ shipper, t }: ShipperTableRowProps) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 font-medium text-slate-900">{shipper.shipper?.name || '-'}</td>
      <td className="px-4 py-3">
        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider", TYPE_BADGE[shipper.shipper_type] || 'bg-slate-100 text-slate-600')}>
          {t(`type_${shipper.shipper_type}`)}
        </span>
      </td>
      <td className="px-4 py-3">
        <EditableGradeCell displayValue={shipper.grade} placeholder={t('grade_placeholder')} />
      </td>
      <td className="px-4 py-3">
        <EditableRateCell displayRate={shipper.discount_rate} />
      </td>
      <td className="px-4 py-3">
        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border",
          shipper.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200')}>
          {shipper.is_active ? t('status_active') : t('status_inactive')}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-500 text-xs">
        {shipper.created_at ? new Date(shipper.created_at).toLocaleDateString('ko-KR') : '-'}
      </td>
      <td className="px-4 py-3 text-right">
        <ActionCell shipperId={shipper.id} />
      </td>
    </tr>
  );
}
