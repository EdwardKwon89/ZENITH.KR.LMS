'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ZenButton } from '@/components/ui/ZenUI';
import { Search, Filter, Calendar, MapPin } from 'lucide-react';

interface CostFilterBarProps {
  locale: string;
}

export default function CostFilterBar({ locale }: CostFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(searchParams.get('startDate') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || new Date().toISOString().split('T')[0]);
  const [serviceType, setServiceType] = useState(searchParams.get('serviceType') || 'ALL');
  const [route, setRoute] = useState(searchParams.get('route') || '');

  const handleApply = () => {
    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    if (serviceType !== 'ALL') params.set('serviceType', serviceType);
    if (route) params.set('route', route);
    
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="p-5 zen-glass rounded-2xl flex flex-wrap gap-6 items-end border-white/20 shadow-xl animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex-1 min-w-[300px] grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest flex items-center gap-1.5">
            <Calendar size={12} className="text-blue-500" /> Start Date
          </label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-white/50 backdrop-blur-md border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest flex items-center gap-1.5">
            <Calendar size={12} className="text-rose-500" /> End Date
          </label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-white/50 backdrop-blur-md border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
          />
        </div>
      </div>

      <div className="w-[180px]">
        <label className="block text-[10px] font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest flex items-center gap-1.5">
          <Filter size={12} className="text-indigo-500" /> Service Category
        </label>
        <select 
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className="w-full bg-white/50 backdrop-blur-md border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none text-sm font-medium cursor-pointer"
        >
          <option value="ALL">All Costs</option>
          <option value="FREIGHT">Ocean/Air Freight</option>
          <option value="TRUCKING">Inland Trucking</option>
          <option value="CUSTOMS">Customs Clearance</option>
          <option value="WHS">Warehousing</option>
          <option value="FUEL_SURCHARGE">Fuel Surcharge</option>
        </select>
      </div>

      <div className="w-[220px]">
        <label className="block text-[10px] font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest flex items-center gap-1.5">
          <MapPin size={12} className="text-emerald-500" /> Route (Origin-Dest)
        </label>
        <div className="relative">
          <input 
            type="text" 
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="e.g. ICN-LAX"
            className="w-full bg-white/50 backdrop-blur-md border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        </div>
      </div>

      <ZenButton 
        onClick={handleApply}
        className="px-8 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-200"
      >
        Filter Costs
      </ZenButton>
    </div>
  );
}
