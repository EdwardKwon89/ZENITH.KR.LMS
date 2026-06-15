'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ZenCard } from '@/components/ui/ZenUI';
import { ZonesTab } from './ZonesTab';
import { ProductsTab } from './ProductsTab';
import { BaseRatesTab } from './OtherTabs';
import { FuelTab } from './OtherTabs';
import { OtherChargesTab } from './OtherTabs';

export function UpsRatesAdminPage() {
  const t = useTranslations('admin.ups_rates');
  const [activeTab, setActiveTab] = useState('zones');

  return (
    <div className="space-y-6">
      <ZenCard className="p-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('subtitle')}</p>
      </ZenCard>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="zones">{t('tabs.zones')}</TabsTrigger>
          <TabsTrigger value="products">{t('tabs.products')}</TabsTrigger>
          <TabsTrigger value="base-rates">{t('tabs.base_rates')}</TabsTrigger>
          <TabsTrigger value="fuel">{t('tabs.fuel')}</TabsTrigger>
          <TabsTrigger value="oc">{t('tabs.oc')}</TabsTrigger>
        </TabsList>

        <TabsContent value="zones">
          <ZonesTab />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="base-rates">
          <BaseRatesTab />
        </TabsContent>
        <TabsContent value="fuel">
          <FuelTab />
        </TabsContent>
        <TabsContent value="oc">
          <OtherChargesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
