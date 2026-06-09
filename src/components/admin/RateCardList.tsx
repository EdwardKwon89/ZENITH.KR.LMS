'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Edit3, Trash2, Plane, Ship, Truck, Box, ArrowRight } from 'lucide-react';
import { ZenBadge } from '@/components/ui/ZenUI';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import { cn } from '@/lib/utils';
import type { RateTiers } from '@/components/admin/RateTierEditor';

interface RateCard {
  id: string;
  carrier_id: string;
  transport_mode: string;
  currency: string;
  is_active: boolean;
  carrier_cost?: number;
  margin_rate?: number;
  platform_fee_rate?: number;
  origin_port_id?: string;
  dest_port_id?: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
  carrier?: { name: string; code: string };
  origin_port?: { name: string; code: string };
  dest_port?: { name: string; code: string };
  surcharges?: Array<{ surcharge_type: string; calc_type: string; amount: number; currency: string }>;
  tiers?: RateTiers;
}

const MODE_CONFIG: Record<string, { label: string; icon: React.ElementType; colorClass: string }> = {
  AIR:  { label: '항공', icon: Plane, colorClass: 'text-blue-600 bg-blue-50 border-blue-200' },
  SEA:  { label: '해운', icon: Ship,  colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  LAND: { label: '육상', icon: Truck, colorClass: 'text-amber-600 bg-amber-50 border-amber-200' },
  EXP:  { label: '특송', icon: Box,   colorClass: 'text-purple-600 bg-purple-50 border-purple-200' },
};

interface RateCardListProps {
  rates: RateCard[];
  loading: boolean;
  onEdit?: (rate: RateCard) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  actions?: React.ReactNode;
  filterBar?: React.ReactNode;
}

export const RateCardList: React.FC<RateCardListProps> = ({
  rates,
  loading,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  actions,
  filterBar,
}) => {
  const columns: ColumnDef<RateCard>[] = [
    {
      accessorKey: 'carrier',
      header: '운송사',
      cell: ({ row }) => {
        const cfg = MODE_CONFIG[row.original.transport_mode] ?? MODE_CONFIG.LAND;
        const Icon = cfg.icon;
        return (
          <div className="flex items-center gap-2.5">
            <div className={cn('p-1.5 rounded-lg border', cfg.colorClass)}>
              <Icon size={14} />
            </div>
            <span className="font-medium text-slate-900">
              {row.original.carrier?.name || row.original.carrier?.code || '-'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'transport_mode',
      header: '운송수단',
      cell: ({ row }) => {
        const cfg = MODE_CONFIG[row.original.transport_mode] ?? MODE_CONFIG.LAND;
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border', cfg.colorClass)}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      id: 'route',
      header: '항로',
      cell: ({ row }) => {
        const origin = row.original.origin_port?.code || '-';
        const dest = row.original.dest_port?.code || '-';
        return (
          <div className="flex items-center gap-1.5">
            <ZenBadge variant="default" className="font-mono">{origin}</ZenBadge>
            <ArrowRight size={12} className="text-slate-400" />
            <ZenBadge variant="default" className="font-mono">{dest}</ZenBadge>
          </div>
        );
      },
    },
    {
      id: 'tiers_summary',
      header: '중량구간(Slab)',
      cell: ({ row }) => {
        const tiers = row.original.tiers;
        if (!tiers?.weight_slabs?.length && !tiers?.cbm_slabs?.length)
          return <span className="text-xs text-slate-400">미설정</span>;
        const prices = (tiers?.weight_slabs ?? []).map(t => t.unit_price);
        const minP = prices.length ? Math.min(...prices) : 0;
        const maxP = prices.length ? Math.max(...prices) : 0;
        return (
          <span className="text-xs font-mono text-slate-700">
            <span className="text-slate-400">
              W:{tiers?.weight_slabs?.length ?? 0} C:{tiers?.cbm_slabs?.length ?? 0} ·
            </span>
            {prices.length ? (minP === maxP ? `${minP.toFixed(2)}/kg` : `${minP.toFixed(2)}–${maxP.toFixed(2)}/kg`) : '-'}
          </span>
        );
      },
    },
    {
      id: 'surcharges_count',
      header: '부대비용',
      cell: ({ row }) => {
        const count = row.original.surcharges?.length ?? 0;
        return count === 0
          ? <span className="text-xs text-slate-400">없음</span>
          : <ZenBadge variant="info">{count}건</ZenBadge>;
      },
    },
    {
      accessorKey: 'currency',
      header: '통화',
      cell: ({ row }) => <ZenBadge variant="info">{row.original.currency}</ZenBadge>,
    },
    {
      id: 'validity',
      header: '유효기간',
      cell: ({ row }) => {
        const until = row.original.valid_until;
        const isUnlimited = String(until || '').startsWith('9999');
        return (
          <span className="text-xs text-slate-500 font-mono">
            {row.original.valid_from} ~ {isUnlimited ? '무기한' : (until ?? '-')}
          </span>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: '상태',
      cell: ({ row }) => (
        <ZenBadge variant={row.original.is_active ? 'success' : 'default'}>
          {row.original.is_active ? '활성' : '만료'}
        </ZenBadge>
      ),
    },
    ...(canEdit || canDelete ? [{
      id: 'actions',
      header: '관리',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          {canEdit && (
            <button
              onClick={() => onEdit?.(row.original)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors"
            >
              <Edit3 size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete?.(row.original.id)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <ZenDataGrid
      columns={columns}
      data={rates}
      loading={loading}
      title={filterBar}
      actions={actions}
    />
  );
};
