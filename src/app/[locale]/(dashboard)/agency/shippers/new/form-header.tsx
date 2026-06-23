'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export function FormHeader({ t }: { t: (key: string) => string }) {
  return (
    <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-slate-100 px-8 py-3 mb-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/agency/shippers" className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
              {t('new_title')}
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70 ml-3.5">{t('new_description')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
