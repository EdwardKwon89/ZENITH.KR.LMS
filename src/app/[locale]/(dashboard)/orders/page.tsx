// src/app/[locale]/(dashboard)/orders/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function OrdersPage() {
  const t = await getTranslations('Navigation');
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{t('orders')}</h1>
      <p className="mt-4 text-slate-600 italic">Order management module is under construction.</p>
    </div>
  );
}
