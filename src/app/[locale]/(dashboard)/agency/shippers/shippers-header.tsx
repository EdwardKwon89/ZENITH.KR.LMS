'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

interface ShippersHeaderProps {
  t: (key: string) => string;
}

export function ShippersHeader({ t }: ShippersHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('description')}</p>
      </div>
      <Link href="/agency/shippers/new"
        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">
        <Plus size={16} /> {t('new_shipper')}
      </Link>
    </header>
  );
}
