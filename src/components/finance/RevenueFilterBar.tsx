'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ZenButton } from '@/components/ui/ZenUI';
import { Search, Filter, Calendar } from 'lucide-react';

interface RevenueFilterBarProps {
  organizations: { id: string; name: string }[];
  locale: string;
}

export default function RevenueFilterBar({ organizations, locale }: RevenueFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(searchParams.get('startDate') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState(searchParams.get('mode') || 'ALL');
  const [shipperId, setShipperId] = useState(searchParams.get('shipperId') || '');

  const handleApply = () => {
    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    if (mode !== 'ALL') params.set('mode', mode);
    if (shipperId) params.set('shipperId', shipperId);
    
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

      <div className="w-[160px]">
        <label className="block text-[10px] font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest flex items-center gap-1.5">
          <Filter size={12} className="text-indigo-500" /> Transport Mode
        </label>
        <select 
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="w-full bg-white/50 backdrop-blur-md border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none text-sm font-medium cursor-pointer"
        >
          <option value="ALL">All Modes</option>
          <option value="AIR">Air Freight</option>
          <option value="SEA">Sea Freight</option>
          <option value="CIR">CIR (Express)</option>
        </select>
      </div>

      <div className="w-[240px]">
        <label className="block text-[10px] font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest flex items-center gap-1.5">
          <Search size={12} className="text-emerald-500" /> Shipper (Company)
        </label>
        <select 
          value={shipperId}
          onChange={(e) => setShipperId(e.target.value)}
          className="w-full bg-white/50 backdrop-blur-md border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none text-sm font-medium cursor-pointer"
        >
          <option value="">All Shippers</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
      </div>

      <ZenButton 
        onClick={handleApply}
        className="px-8 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-200"
      >
        Search Reports
      </ZenButton>
    </div>
  );
}
