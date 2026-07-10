'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { ShipperUpsRatesData } from '@/app/actions/shipper/ups-rates';

interface Props {
  data: ShipperUpsRatesData;
}

export default function ShipperUpsRatesClient({ data }: Props) {
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');

  const filtered = useMemo(() => {
    return data.rates.filter((r) => {
      if (zoneFilter) {
        const zone = data.zones.find((z) => z.id === zoneFilter);
        if (!zone || !r.zone.zone_code.includes(zone.zone_code)) return false;
      }
      if (productFilter) {
        const prod = data.products.find((p) => p.id === productFilter);
        if (!prod || !r.product.product_code.includes(prod.product_code)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const zoneStr = `${r.zone.zone_code} ${r.zone.zone_name}`.toLowerCase();
        const prodStr = `${r.product.product_code} ${r.product.product_name}`.toLowerCase();
        if (!zoneStr.includes(q) && !prodStr.includes(q)) return false;
      }
      return true;
    });
  }, [data.rates, zoneFilter, productFilter, search]);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">UPS Rate Inquiry</h1>
        <p className="text-xs text-slate-400 mt-1">
          Final freight rates applicable to you &middot; all prices include applicable discounts
        </p>
      </div>

      <div className="flex gap-3 flex-wrap mb-4">
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
              <th className="text-right px-3 py-2">Unit Price</th>
              <th className="text-right px-3 py-2">Final Freight</th>
              <th className="text-center px-3 py-2">Currency</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/50">
                <td className="px-3 py-2 font-medium">{r.zone.zone_code}</td>
                <td className="px-3 py-2">{r.product.product_code}</td>
                <td className="px-3 py-2 text-right">{r.weight_kg}</td>
                <td className="px-3 py-2 text-right">{r.platform_selling_price.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-bold text-brand-600">{r.final_freight.toLocaleString()}</td>
                <td className="px-3 py-2 text-center">{r.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-400 mt-1">{filtered.length} rows</p>
    </div>
  );
}
