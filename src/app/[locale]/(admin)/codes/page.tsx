// src/app/[locale]/(admin)/codes/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function CodesPage() {
  const t = await getTranslations('Navigation');
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{t('system')} - Master Codes</h1>
      <p className="mt-4 text-slate-600">Standardizing ISO, IATA, and Local codes across the system.</p>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-20 text-center text-slate-400">
        Master Code Table Component Placeholder
      </div>
    </div>
  );
}
