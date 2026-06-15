'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ZenCard } from '@/components/ui/ZenUI';

export function ProductsTab() {
  const t = useTranslations('admin.ups_rates.products');
  return <ZenCard className="p-6"><h2 className="text-lg font-bold">{t('title')}</h2><p className="text-sm text-slate-500 mt-2">{t('coming_soon')}</p></ZenCard>;
}

export function BaseRatesTab() {
  const t = useTranslations('admin.ups_rates.base_rates');
  return <ZenCard className="p-6"><h2 className="text-lg font-bold">{t('title')}</h2><p className="text-sm text-slate-500 mt-2">{t('coming_soon')}</p></ZenCard>;
}

export function FuelTab() {
  const t = useTranslations('admin.ups_rates.fuel');
  return <ZenCard className="p-6"><h2 className="text-lg font-bold">{t('title')}</h2><p className="text-sm text-slate-500 mt-2">{t('coming_soon')}</p></ZenCard>;
}

export function OtherChargesTab() {
  const t = useTranslations('admin.ups_rates.oc');
  return <ZenCard className="p-6"><h2 className="text-lg font-bold">{t('title')}</h2><p className="text-sm text-slate-500 mt-2">{t('coming_soon')}</p></ZenCard>;
}
