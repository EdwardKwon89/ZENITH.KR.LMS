'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCommonCodesByGroup } from '@/app/actions/master';
import { Plus } from 'lucide-react';
import { ZenButton } from '@/components/ui/ZenUI';
import Link from 'next/link';

interface FilterBarProps {
  locale: string;
}

export default function OrderFilterBar({ locale }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);
  
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

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedType) params.set('order_type', selectedType);
      params.set('page', '1');
      router.push(`?${params.toString()}`);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, selectedStatus, selectedType]);

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Order No, Recipient, Shipper..."
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
        />
      </div>

      <div className="w-[180px]">
        <select 
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none text-sm cursor-pointer"
        >
          <option value="">All Status</option>
          {statuses.map(s => (
            <option key={s.code_value} value={s.code_value}>
              {locale === 'ko' ? s.code_name_ko : s.code_name_en}
            </option>
          ))}
        </select>
      </div>

      <div className="w-[180px]">
        <select 
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none text-sm cursor-pointer"
        >
          <option value="">All Types</option>
          {types.map(t => (
            <option key={t.code_value} value={t.code_value}>
              {locale === 'ko' ? t.code_name_ko : t.code_name_en}
            </option>
          ))}
        </select>
      </div>

      <Link href="/orders/new">
        <ZenButton variant="ghost" className="bg-brand-600 text-white hover:bg-brand-700 px-6 py-2 text-xs font-bold rounded-xl shadow-lg shadow-brand-100 transition-all h-[40px]">
          <Plus size={14} className="mr-1" /> CREATE NEW ORDER
        </ZenButton>
      </Link>
    </div>
  );
}
