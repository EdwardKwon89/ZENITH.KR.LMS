'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCommonCodesByGroup } from '@/app/actions/master';

interface FilterBarProps {
  locale: string;
}

export default function OrderFilterBar({ locale }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [statuses, setStatuses] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('order_type') || '');

  useEffect(() => {
    async function loadCodes() {
      const [sData, tData] = await Promise.all([
        getCommonCodesByGroup('ORDER_STATUS'),
        getCommonCodesByGroup('ORDER_TYPE')
      ]);
      setStatuses(sData);
      setTypes(tData);
    }
    loadCodes();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set('search', search); else params.delete('search');
    if (selectedStatus) params.set('status', selectedStatus); else params.delete('status');
    if (selectedType) params.set('order_type', selectedType); else params.delete('order_type');
    params.set('page', '1'); // 필터 변경 시 첫 페이지로
    
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="mb-6 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-white/60 mb-1 ml-1 uppercase tracking-wider">Search</label>
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Order No, Recipient..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      <div className="w-[180px]">
        <label className="block text-xs font-medium text-white/60 mb-1 ml-1 uppercase tracking-wider">Status</label>
        <select 
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
        >
          <option value="" className="bg-slate-900">All Status</option>
          {statuses.map(s => (
            <option key={s.code_value} value={s.code_value} className="bg-slate-900">
              {locale === 'ko' ? s.code_name_ko : s.code_name_en}
            </option>
          ))}
        </select>
      </div>

      <div className="w-[180px]">
        <label className="block text-xs font-medium text-white/60 mb-1 ml-1 uppercase tracking-wider">Type</label>
        <select 
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
        >
          <option value="" className="bg-slate-900">All Types</option>
          {types.map(t => (
            <option key={t.code_value} value={t.code_value} className="bg-slate-900">
              {locale === 'ko' ? t.code_name_ko : t.code_name_en}
            </option>
          ))}
        </select>
      </div>

      <button 
        onClick={handleSearch}
        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all"
      >
        Apply Filters
      </button>
    </div>
  );
}
