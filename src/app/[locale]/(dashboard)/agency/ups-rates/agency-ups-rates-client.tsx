'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, TrendingUp, Fuel, DollarSign, Layers } from 'lucide-react';
import type { AgencyUpsRatesData } from '@/app/actions/agency/ups-rates';

type TabKey = 'baseRates' | 'tierRates' | 'fuelSurcharge' | 'otherCharges';

interface Props {
  data: AgencyUpsRatesData;
  t_rates: string;
}

export default function AgencyUpsRatesClient({ data, t_rates }: Props) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabKey>('baseRates');

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'baseRates', label: 'Base Rates', icon: <Layers size={14} /> },
    { key: 'tierRates', label: 'Weight Tier Rates', icon: <TrendingUp size={14} /> },
    { key: 'fuelSurcharge', label: 'Fuel Surcharge', icon: <Fuel size={14} /> },
    { key: 'otherCharges', label: 'Other Charges', icon: <DollarSign size={14} /> },
  ];

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">{t_rates}</h1>
        <p className="text-xs text-slate-400 mt-1">
          {data.agencyName} &middot; Discount Rate: <span className="font-semibold text-brand-600">{data.discountRate * 100}%</span>
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-lg transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-800 border border-b-white border-slate-200 -mb-px shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'baseRates' && <BaseRatesTab data={data} key="baseRates" />}
        {activeTab === 'tierRates' && <TierRatesTab data={data} key="tierRates" />}
        {activeTab === 'fuelSurcharge' && <FuelSurchargeTab data={data} key="fuelSurcharge" />}
        {activeTab === 'otherCharges' && <OtherChargesTab data={data} key="otherCharges" />}
      </AnimatePresence>
    </div>
  );
}

function BaseRatesTab({ data }: { data: AgencyUpsRatesData }) {
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');

  const filtered = useMemo(() => {
    return data.baseRates.filter((r) => {
      if (zoneFilter && r.zone_id !== zoneFilter) return false;
      if (productFilter && r.product_id !== productFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const zone = `${r.zone?.zone_code ?? ''} ${r.zone?.zone_name ?? ''}`.toLowerCase();
        const product = `${r.product?.product_code ?? ''} ${r.product?.product_name ?? ''}`.toLowerCase();
        if (!zone.includes(q) && !product.includes(q)) return false;
      }
      return true;
    });
  }, [data.baseRates, zoneFilter, productFilter, search]);

  const agencyCost = (sellingPrice: number) =>
    Math.round(sellingPrice * (1 - data.discountRate) * 100) / 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search zone or product..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none"
        >
          <option value="">All Zones</option>
          {data.zones.map((z) => (
            <option key={z.id} value={z.id}>{z.zone_code} - {z.zone_name}</option>
          ))}
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none"
        >
          <option value="">All Products</option>
          {data.products.map((p) => (
            <option key={p.id} value={p.id}>{p.product_code} - {p.product_name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-semibold">
              <th className="text-left px-3 py-2">Zone</th>
              <th className="text-left px-3 py-2">Product</th>
              <th className="text-right px-3 py-2">Weight (kg)</th>
              <th className="text-right px-3 py-2">Platform Selling</th>
              <th className="text-right px-3 py-2">Agency Cost ({data.discountRate * 100}% off)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                <td className="px-3 py-2 font-medium">{r.zone?.zone_code ?? '-'}</td>
                <td className="px-3 py-2">{r.product?.product_code ?? '-'}</td>
                <td className="px-3 py-2 text-right">{r.weight_kg}</td>
                <td className="px-3 py-2 text-right">{r.selling_price.toLocaleString()} {r.currency}</td>
                <td className="px-3 py-2 text-right font-semibold text-brand-600">
                  {agencyCost(r.selling_price).toLocaleString()} {r.currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-400">{filtered.length} rows</p>
    </motion.div>
  );
}

function TierRatesTab({ data }: { data: AgencyUpsRatesData }) {
  const agencyRate = (sellingRate: number) =>
    Math.round(sellingRate * (1 - data.discountRate) * 100) / 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-semibold">
              <th className="text-left px-3 py-2">Zone</th>
              <th className="text-left px-3 py-2">Product</th>
              <th className="text-right px-3 py-2">Min Kg</th>
              <th className="text-right px-3 py-2">Max Kg</th>
              <th className="text-right px-3 py-2">Platform /kg Selling</th>
              <th className="text-right px-3 py-2">Agency /kg Cost</th>
            </tr>
          </thead>
          <tbody>
            {data.weightTierRates.map((r) => {
              const selling = Number(r.price_per_kg_selling);
              return (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-medium">{r.zone?.zone_code ?? '-'}</td>
                  <td className="px-3 py-2">{r.product?.product_code ?? '-'}</td>
                  <td className="px-3 py-2 text-right">{r.tier_min_kg}</td>
                  <td className="px-3 py-2 text-right">{r.tier_max_kg ?? '∞'}</td>
                  <td className="px-3 py-2 text-right">{selling.toLocaleString()} {r.currency}</td>
                  <td className="px-3 py-2 text-right font-semibold text-brand-600">
                    {agencyRate(selling).toLocaleString()} {r.currency}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function FuelSurchargeTab({ data }: { data: AgencyUpsRatesData }) {
  const fs = data.fuelSurcharge;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {fs ? (
        <div className="rounded-xl border border-slate-200 p-4 max-w-md">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400 mb-1">Effective Week</p>
              <p className="font-semibold">{fs.effective_week}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Product</p>
              <p className="font-semibold">{fs.product_id ?? 'All'}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Platform Selling Rate</p>
              <p className="font-semibold">{(fs.selling_rate * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Platform Cost Rate</p>
              <p className="font-semibold">{(fs.cost_rate * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Agency Fuel Surcharge</p>
              <p className="font-semibold text-brand-600">
                {(fs.selling_rate * 100).toFixed(1)}%
                <span className="text-[9px] text-slate-400 ml-1">(same as platform)</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">No fuel surcharge data available</p>
      )}
    </motion.div>
  );
}

function OtherChargesTab({ data }: { data: AgencyUpsRatesData }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-semibold">
              <th className="text-left px-3 py-2">Code</th>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-center px-3 py-2">Unit</th>
              <th className="text-right px-3 py-2">Platform Selling</th>
              <th className="text-right px-3 py-2">Platform Cost</th>
            </tr>
          </thead>
          <tbody>
            {data.otherCharges.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                <td className="px-3 py-2 font-mono">{c.charge_code}</td>
                <td className="px-3 py-2">{c.charge_name}</td>
                <td className="px-3 py-2 text-center">{c.unit}</td>
                <td className="px-3 py-2 text-right">{c.selling_price?.toLocaleString() ?? '-'} {c.currency}</td>
                <td className="px-3 py-2 text-right">{c.cost_price?.toLocaleString() ?? '-'} {c.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Manage your selling prices at <a href="/agency/other-charges" className="text-brand-600 underline">Other Charges</a>
      </p>
    </motion.div>
  );
}
