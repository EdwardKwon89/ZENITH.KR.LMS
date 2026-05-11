'use client';

import React from 'react';
import { ZenCard } from '@/components/ui/ZenUI';
import { 
  Ship, 
  Plane, 
  Box, 
  ChevronRight, 
  MoreVertical, 
  Trash2, 
  Edit3,
  Globe,
  MapPin,
  Truck,
  Calendar,
  User,
  Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RateCard {
  id: string;
  version_no: number;
  carrier_id: string;
  origin_port: string;
  destination_port: string;
  service_type: string;
  base_rate: number;
  status: string;
  valid_from: string;
  valid_to: string;
  organizations?: {
    name: string;
  };
  carrier?: {
    name: string;
    iata_code: string;
  };
  base_date_rule?: string;
  customer_id?: string;
  priority?: number;
  surcharges?: Array<{
    surcharge_type: string;
    calc_type: string;
    amount: number;
    currency: string;
  }>;
}

interface RateCardListProps {
  rates: RateCard[];
  loading: boolean;
  onEdit?: (rate: RateCard) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const RateCardList: React.FC<RateCardListProps> = ({ 
  rates, 
  loading, 
  onEdit, 
  onDelete, 
  canEdit = false,
  canDelete = false 
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (rates.length === 0) {
    return (
      <ZenCard className="bg-slate-50 border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
        <Globe className="w-12 h-12 mb-4 opacity-5" />
        <p className="text-sm font-medium">검색된 요율 정보가 없습니다.</p>
      </ZenCard>
    );
  }

  return (
    <div className="space-y-4">
      {rates.map((rate) => (
        <ZenCard 
          key={rate.id} 
          className="bg-white border-slate-200 hover:border-blue-500/20 transition-all group p-0 overflow-hidden"
        >
          <div className="flex flex-col md:flex-row items-stretch">
            {/* Service Icon Tag */}
            <div className={cn(
              "w-2 md:w-1.5",
              rate.service_type === 'AIR' ? "bg-blue-500" : 
              rate.service_type === 'SEA' ? "bg-emerald-500" : "bg-amber-500"
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
                    <span className="text-[9px] bg-blue-500/20 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">
                      v{rate.version_no}
                    </span>
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
                    <p className="text-xl font-black text-slate-900 tracking-widest">{rate.origin_port}</p>
                  </div>

                  <div className="flex flex-col items-center gap-1 px-4">
                    <div className="flex items-center gap-1">
                      {rate.service_type === 'AIR' ? <Plane className="w-4 h-4 text-blue-500/40" /> : 
                       rate.service_type === 'SEA' ? <Ship className="w-4 h-4 text-emerald-500/40" /> : 
                       <Box className="w-4 h-4 text-amber-500/40" />}
                      <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </div>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">{rate.service_type}</span>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-end gap-1.5 text-blue-600 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Dest</span>
                      <Globe className="w-3 h-3" />
                    </div>
                    <p className="text-xl font-black text-slate-900 tracking-widest">{rate.destination_port}</p>
                  </div>
                </div>
                
                {/* Validity & Surcharge Summary */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
                    <span className="text-[9px] font-mono text-slate-400">
                      {new Date(rate.valid_from).toLocaleDateString()} - {rate.valid_to.startsWith('9999') ? 'UNTIL EXPIRED' : new Date(rate.valid_to).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Surcharges Summary */}
                  {rate.surcharges && rate.surcharges.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {rate.surcharges.map((s, idx) => (
                        <div key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[8px] font-black uppercase tracking-wider">
                          {s.surcharge_type} {s.calc_type === 'PERCENT' ? `${s.amount}%` : `$${s.amount}`}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[8px] font-black uppercase tracking-wider">
                    <Calendar className="w-2.5 h-2.5" />
                    {rate.base_date_rule || 'RECEIPT_DATE'}
                  </div>

                  {rate.customer_id && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[8px] font-black uppercase tracking-wider">
                      <User className="w-2.5 h-2.5" />
                      Special
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Status Info */}
              <div className="text-right min-w-[150px] space-y-2">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Rate</p>
                  <p className="text-2xl font-mono font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                    <span className="text-xs text-slate-500 mr-1">$</span>
                    {rate.base_rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                {/* Status Badge */}
                <div className="flex justify-end">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-md border",
                    rate.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    rate.status === 'SUPERSEDED' ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-slate-100 text-slate-500 border-slate-300"
                  )}>
                    {rate.status}
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
  );
};
