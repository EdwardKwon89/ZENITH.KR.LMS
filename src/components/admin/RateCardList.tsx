'use client';

import React, { useState } from 'react';
import { ZenCard, ZenInput, ZenButton } from '@/components/ui/ZenUI';
import { 
  Ship, 
  Plane, 
  Box, 
  ChevronRight, 
  Trash2, 
  Edit3,
  Globe,
  MapPin,
  Truck,
  Calendar,
  User,
  Search,
  ListFilter,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  carrier?: {
    name: string;
    code: string;
  };
  origin_port?: {
    name: string;
    code: string;
  };
  dest_port?: {
    name: string;
    code: string;
  };
  surcharges?: Array<{
    surcharge_type: string;
    calc_type: string;
    amount: number;
    currency: string;
  }>;
  tiers?: Array<{
    weight_min: number;
    unit_price: number;
  }>;
}

interface RateCardListProps {
  rates: RateCard[];
  loading: boolean;
  onEdit?: (rate: RateCard) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  searchTerm?: string;
  onSearchChange?: (v: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (v: string) => void;
}

export const RateCardList: React.FC<RateCardListProps> = ({ 
  rates, 
  loading, 
  onEdit, 
  onDelete, 
  canEdit = false,
  canDelete = false,
  searchTerm = '',
  onSearchChange,
  statusFilter: externalStatusFilter,
  onStatusFilterChange,
}) => {
  const [localStatus, setLocalStatus] = useState('ACTIVE');
  const statusFilter = onStatusFilterChange ? externalStatusFilter! : localStatus;
  const handleStatusChange = (s: string) => onStatusFilterChange ? onStatusFilterChange(s) : setLocalStatus(s);
  const displayRates = statusFilter === 'ALL' ? rates : rates.filter(r => r.is_active);
  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-blue-500" />
            Registered Pricing Masters
          </h2>
          <p className="text-sm text-slate-400">시스템에 배포되어 현재 유효한 운송사별 요율 정보 목록입니다.</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex gap-1 p-1 bg-slate-50 rounded-2xl border border-slate-300 overflow-hidden">
            {['ACTIVE', 'ALL'].map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all",
                  statusFilter === s
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-500"
                )}
              >
                {s}{s === 'ACTIVE' ? ` (${rates.filter(r => r.is_active).length})` : ` (${rates.length})`}
              </button>
            ))}
          </div>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <ZenInput
              placeholder="Search route or carrier..."
              className="pl-12 bg-slate-50 border-slate-300"
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
          <ZenButton variant="glass" className="aspect-square p-0 w-12 h-12 rounded-2xl">
            <ListFilter className="w-5 h-5 text-slate-500" />
          </ZenButton>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : displayRates.length === 0 ? (
        <ZenCard className="bg-slate-50 border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
          <Globe className="w-12 h-12 mb-4 opacity-5" />
          <p className="text-sm font-medium">검색된 요율 정보가 없습니다.</p>
        </ZenCard>
      ) : (
        <div className="space-y-4">
      {displayRates.map((rate) => (
        <ZenCard 
          key={rate.id} 
          className="bg-white border-slate-200 hover:border-blue-500/20 transition-all group p-0 overflow-hidden"
        >
          <div className="flex flex-col md:flex-row items-stretch">
            {/* Service Icon Tag */}
            <div className={cn(
              "w-2 md:w-1.5",
              rate.transport_mode === 'AIR' ? "bg-blue-500" : 
              rate.transport_mode === 'SEA' ? "bg-emerald-500" : "bg-amber-500"
            )} />

            <div className="flex-1 p-5 flex flex-col md:flex-row items-center gap-6">
              {/* Carrier Info */}
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors border border-slate-200">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carrier</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">
                    {rate.carrier?.name || rate.organizations?.name || 'Unknown Partner'}
                  </p>
                </div>
              </div>

              {/* Route Info */}
              <div className="flex-1 flex flex-col items-center justify-center gap-1">
                <div className="flex items-center justify-center gap-6 w-full">
                  <div className="text-center">
                    <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                      <MapPin className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Origin</span>
                    </div>
                    <p className="text-xl font-black text-slate-900 tracking-widest">{rate.origin_port?.name || rate.origin_port?.code || 'Any'}</p>
                  </div>

                  <div className="flex flex-col items-center gap-1 px-4">
                    <div className="flex items-center gap-1">
                      {rate.transport_mode === 'AIR' ? <Plane className="w-4 h-4 text-blue-500/40" /> : 
                       rate.transport_mode === 'SEA' ? <Ship className="w-4 h-4 text-emerald-500/40" /> : 
                       <Box className="w-4 h-4 text-amber-500/40" />}
                      <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </div>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">{rate.transport_mode}</span>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-end gap-1.5 text-blue-600 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Dest</span>
                      <Globe className="w-3 h-3" />
                    </div>
                    <p className="text-xl font-black text-slate-900 tracking-widest">{rate.dest_port?.name || rate.dest_port?.code || 'Any'}</p>
                  </div>
                </div>
                
                {/* Validity & Surcharge Summary */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
                    <span className="text-[9px] font-mono text-slate-400">
                      {rate.valid_from ? new Date(rate.valid_from).toLocaleDateString() : 'N/A'} - {String(rate.valid_until || '').startsWith('9999') ? 'UNTIL EXPIRED' : (rate.valid_until ? new Date(rate.valid_until).toLocaleDateString() : 'N/A')}
                    </span>
                  </div>
                  
                  {/* Surcharges Summary */}
                  {rate.surcharges && rate.surcharges.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {rate.surcharges.map((s, idx) => (
                        <div key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[8px] font-black uppercase tracking-wider">
                          {s.surcharge_type} {s.calc_type === 'PERCENT' ? `${s.amount}%` : `${s.currency || '$'}${s.amount}`}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-[8px] font-black uppercase tracking-wider">
                    {rate.currency || 'USD'}
                  </div>
                </div>
              </div>

              {/* Price & Status Info */}
              <div className="text-right min-w-[150px] space-y-2">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carrier Cost</p>
                  <p className="text-2xl font-mono font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                    <span className="text-xs text-slate-500 mr-1">{rate.currency || '$'}</span>
                    {(rate.carrier_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                {/* Status Badge */}
                <div className="flex justify-end">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-md border",
                    rate.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    "bg-amber-50 text-amber-700 border-amber-200"
                  )}>
                    {rate.is_active ? 'ACTIVE' : 'SUPERSEDED'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {(canEdit || canDelete) && (
                <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                  {canEdit && (
                    <button 
                      onClick={() => onEdit?.(rate)}
                      className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      onClick={() => onDelete?.(rate.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </ZenCard>
      ))}
    </div>
      )}
    </section>
  );
};
