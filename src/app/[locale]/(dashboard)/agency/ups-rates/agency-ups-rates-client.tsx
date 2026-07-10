'use client';

import { useState } from 'react';
import { DollarSign, Fuel, FileText, Layers, Scale } from 'lucide-react';
import { ZenBadge } from '@/components/ui/ZenUI';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import type { UpsZoneWithCountries, UpsProduct } from '@/types/ups';
import type { PublicBaseRate, PublicFuelSurcharge, PublicOtherCharge, PublicWeightTierRate, PublicFreightMinimum } from '@/app/actions/ups/rates-public';
import type { ColumnDef } from '@tanstack/react-table';

interface PricingPolicy {
  id: string;
  agency_org_id: string;
  zone_id: string;
  discount_rate: number;
  is_active: boolean;
}

type TabKey = 'baseRates' | 'fuelSurcharges' | 'otherCharges' | 'weightTierRates' | 'freightMinimums';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'baseRates', label: '기준요금', icon: DollarSign },
  { key: 'fuelSurcharges', label: '유류할증', icon: Fuel },
  { key: 'otherCharges', label: '부가요금', icon: FileText },
  { key: 'weightTierRates', label: '20kg 초과 티어 요율', icon: Layers },
  { key: 'freightMinimums', label: 'Freight 최소운임', icon: Scale },
];

interface Props {
  zones: UpsZoneWithCountries[];
  products: UpsProduct[];
  baseRates: PublicBaseRate[];
  fuelSurcharges: PublicFuelSurcharge[];
  otherCharges: PublicOtherCharge[];
  weightTierRates: PublicWeightTierRate[];
  freightMinimums: PublicFreightMinimum[];
  pricingPolicies: PricingPolicy[];
}

export function AgencyUpsRatesClient({
  zones, products, baseRates, fuelSurcharges, otherCharges,
  weightTierRates, freightMinimums, pricingPolicies,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('baseRates');

  const policyByZone = Object.fromEntries(
    pricingPolicies.map(p => [p.zone_id, Number(p.discount_rate)])
  );

  const calcAgencyCost = (sellingPrice: number, zoneId: string): number => {
    const rate = policyByZone[zoneId];
    if (rate == null) return sellingPrice;
    return Math.round(sellingPrice * (1 - rate));
  };

  const renderTable = () => {
    switch (activeTab) {
      case 'baseRates':
        return <BaseRateTable baseRates={baseRates} calcAgencyCost={calcAgencyCost} />;
      case 'fuelSurcharges':
        return <FuelSurchargeTable rows={fuelSurcharges} />;
      case 'otherCharges':
        return <OtherChargeTable otherCharges={otherCharges} />;
      case 'weightTierRates':
        return <WeightTierRateTable weightTierRates={weightTierRates} calcAgencyCost={calcAgencyCost} />;
      case 'freightMinimums':
        return <FreightMinimumTable freightMinimums={freightMinimums} calcAgencyCost={calcAgencyCost} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.key ? 'border-brand-600 text-brand-700 bg-brand-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>
      {renderTable()}
    </div>
  );
}

function BaseRateTable({ baseRates, calcAgencyCost }: { baseRates: PublicBaseRate[]; calcAgencyCost: (price: number, zoneId: string) => number }) {
  const columns: ColumnDef<PublicBaseRate>[] = [
    { id: 'product', header: '제품', cell: ({ row }) => <span className="text-sm font-medium">{row.original.product?.product_code}</span> },
    { id: 'zone', header: 'Zone', cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.zone?.zone_code}</ZenBadge> },
    { accessorKey: 'weight_kg', header: '중량 (kg)', cell: ({ row }) => <span className="font-mono text-sm">{row.original.weight_kg}kg</span> },
    { accessorKey: 'selling_price', header: '플랫폼 판매가', cell: ({ row }) => <span className="font-mono text-sm">{row.original.selling_price.toLocaleString()}원</span> },
    { id: 'agency_cost', header: '대리점 원가', cell: ({ row }) => {
      const cost = calcAgencyCost(row.original.selling_price, row.original.zone_id);
      return <span className="font-mono text-sm text-slate-500">{cost.toLocaleString()}원</span>;
    }},
    { id: 'validity', header: '유효기간', cell: ({ row }) => <span className="text-xs font-mono text-slate-400">{row.original.valid_from}~{row.original.valid_until ?? '무기한'}</span> },
  ];
  return <ZenDataGrid columns={columns} data={baseRates} />;
}

function FuelSurchargeTable({ rows }: { rows: PublicFuelSurcharge[] }) {
  const columns: ColumnDef<PublicFuelSurcharge>[] = [
    { id: 'product', header: '제품', cell: ({ row }) => <span className="text-sm">{row.original.product?.product_code ?? '전체'}</span> },
    { accessorKey: 'effective_week', header: '적용 주차', cell: ({ row }) => <span className="font-mono text-sm">{row.original.effective_week}</span> },
    { accessorKey: 'selling_rate', header: '할증률', cell: ({ row }) => <span className="font-mono text-sm">{(Number(row.original.selling_rate) * 100).toFixed(1)}%</span> },
  ];
  return <ZenDataGrid columns={columns} data={rows} />;
}

function OtherChargeTable({ otherCharges }: { otherCharges: PublicOtherCharge[] }) {
  const columns: ColumnDef<PublicOtherCharge>[] = [
    { accessorKey: 'charge_code', header: '코드', cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.charge_code}</ZenBadge> },
    { accessorKey: 'charge_name', header: '명칭' },
    { accessorKey: 'unit', header: '단위', cell: ({ row }) => <span className="text-xs font-mono">{row.original.unit}</span> },
    { accessorKey: 'selling_price', header: '플랫폼 판매가', cell: ({ row }) => <span className="font-mono text-sm">{row.original.selling_price?.toLocaleString() ?? '-'}원</span> },
    { id: 'fuel', header: '유류할증', cell: ({ row }) => <ZenBadge variant={row.original.fuel_surcharge_applicable ? 'success' : 'default'}>{row.original.fuel_surcharge_applicable ? '적용' : '미적용'}</ZenBadge> },
  ];
  return <ZenDataGrid columns={columns} data={otherCharges} />;
}

function WeightTierRateTable({ weightTierRates, calcAgencyCost }: { weightTierRates: PublicWeightTierRate[]; calcAgencyCost: (price: number, zoneId: string) => number }) {
  const columns: ColumnDef<PublicWeightTierRate>[] = [
    { id: 'product', header: '제품', cell: ({ row }) => <span className="text-sm font-medium">{row.original.product?.product_code}</span> },
    { id: 'zone', header: 'Zone', cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.zone?.zone_code}</ZenBadge> },
    { id: 'tier', header: '중량 구간', cell: ({ row }) => <span className="font-mono text-sm">{row.original.tier_min_kg}kg ~ {row.original.tier_max_kg != null ? `${row.original.tier_max_kg}kg` : '∞'}</span> },
    { accessorKey: 'price_per_kg_selling', header: '플랫폼 판매가/kg', cell: ({ row }) => <span className="font-mono text-sm">{row.original.price_per_kg_selling.toLocaleString()}원</span> },
    { id: 'agency_cost', header: '대리점 원가/kg', cell: ({ row }) => {
      const cost = calcAgencyCost(row.original.price_per_kg_selling, row.original.zone_id);
      return <span className="font-mono text-sm text-slate-500">{cost.toLocaleString()}원</span>;
    }},
  ];
  return <ZenDataGrid columns={columns} data={weightTierRates} />;
}

function FreightMinimumTable({ freightMinimums, calcAgencyCost }: { freightMinimums: PublicFreightMinimum[]; calcAgencyCost: (price: number, zoneId: string) => number }) {
  const columns: ColumnDef<PublicFreightMinimum>[] = [
    { id: 'product', header: '제품', cell: ({ row }) => <span className="text-sm font-medium">{row.original.product?.product_code}</span> },
    { id: 'zone', header: 'Zone', cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.zone?.zone_code}</ZenBadge> },
    { accessorKey: 'min_charge_selling', header: '플랫폼 최소 판매가', cell: ({ row }) => <span className="font-mono text-sm">{row.original.min_charge_selling.toLocaleString()}원</span> },
    { id: 'agency_cost', header: '대리점 원가', cell: ({ row }) => {
      const cost = calcAgencyCost(row.original.min_charge_selling, row.original.zone_id);
      return <span className="font-mono text-sm text-slate-500">{cost.toLocaleString()}원</span>;
    }},
  ];
  return <ZenDataGrid columns={columns} data={freightMinimums} />;
}
