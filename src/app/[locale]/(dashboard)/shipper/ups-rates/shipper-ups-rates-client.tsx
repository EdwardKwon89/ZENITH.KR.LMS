'use client';

import { useState } from 'react';
import { DollarSign, Fuel, FileText, Layers, Scale, TrendingUp } from 'lucide-react';
import { ZenBadge } from '@/components/ui/ZenUI';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import UpsBaseRateMatrix from '@/components/ups/UpsBaseRateMatrix';
import type { UpsZoneWithCountries, UpsProduct } from '@/types/ups';
import type { PublicBaseRate, PublicFuelSurcharge, PublicOtherCharge, PublicWeightTierRate, PublicFreightMinimum, PublicSurgeFee } from '@/app/actions/ups/rates-public';
import type { ColumnDef } from '@tanstack/react-table';

type TabKey = 'baseRates' | 'fuelSurcharges' | 'otherCharges' | 'surgeFees' | 'weightTierRates' | 'freightMinimums';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'baseRates', label: '기준요금', icon: DollarSign },
  { key: 'fuelSurcharges', label: '유류할증', icon: Fuel },
  { key: 'otherCharges', label: '부가요금', icon: FileText },
  { key: 'surgeFees', label: '급증 수수료', icon: TrendingUp },
  { key: 'weightTierRates', label: '20kg 초과 티어 요율', icon: Layers },
  { key: 'freightMinimums', label: 'Freight 최소운임', icon: Scale },
];

interface Props {
  zones: UpsZoneWithCountries[];
  products: UpsProduct[];
  baseRates: PublicBaseRate[];
  fuelSurcharges: PublicFuelSurcharge[];
  otherCharges: PublicOtherCharge[];
  surgeFees: PublicSurgeFee[];
  weightTierRates: PublicWeightTierRate[];
  freightMinimums: PublicFreightMinimum[];
  zoneDiscountMap: Record<string, number>;
}

export function ShipperUpsRatesClient({
  zones, products, baseRates, fuelSurcharges, otherCharges, surgeFees,
  weightTierRates, freightMinimums, zoneDiscountMap,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('baseRates');

  const getDiscountRate = (zoneId: string): number => zoneDiscountMap[zoneId] ?? 0;

  const calcShipperPrice = (price: number, zoneId: string): number => {
    const rate = getDiscountRate(zoneId);
    if (rate <= 0) return price;
    return Math.round(price * (1 - rate));
  };

  const renderTable = () => {
    switch (activeTab) {
      case 'baseRates':
        return (
          <UpsBaseRateMatrix
            products={products}
            zones={zones}
            readOnly
            priceMode="shipper"
            rates={baseRates}
            discountRateMap={zoneDiscountMap}
          />
        );
      case 'fuelSurcharges':
        return <FuelSurchargeTable rows={fuelSurcharges} />;
      case 'otherCharges':
        return <OtherChargeTable otherCharges={otherCharges} />;
      case 'surgeFees':
        return <SurgeFeeTable rows={surgeFees} />;
      case 'weightTierRates':
        return <WeightTierRateTable weightTierRates={weightTierRates} calcShipperPrice={calcShipperPrice} />;
      case 'freightMinimums':
        return <FreightMinimumTable freightMinimums={freightMinimums} calcShipperPrice={calcShipperPrice} />;
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
    { accessorKey: 'selling_price', header: '금액', cell: ({ row }) => <span className="font-mono text-sm font-semibold text-brand-700">{row.original.selling_price?.toLocaleString() ?? '-'}원</span> },
    { id: 'fuel', header: '유류할증', cell: ({ row }) => <ZenBadge variant={row.original.fuel_surcharge_applicable ? 'success' : 'default'}>{row.original.fuel_surcharge_applicable ? '적용' : '미적용'}</ZenBadge> },
  ];
  return <ZenDataGrid columns={columns} data={otherCharges} />;
}

function SurgeFeeTable({ rows }: { rows: PublicSurgeFee[] }) {
  const columns: ColumnDef<PublicSurgeFee>[] = [
    { accessorKey: 'destination_country_code', header: '도착국', cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.destination_country_code}</ZenBadge> },
    { accessorKey: 'selling_rate_per_kg', header: '단가 / kg', cell: ({ row }) => <span className="font-mono text-sm">{Number(row.original.selling_rate_per_kg).toLocaleString()} {row.original.currency}</span> },
    { id: 'validity', header: '적용기간', cell: ({ row }) => <span className="text-xs font-mono text-slate-500">{row.original.effective_from} ~ {row.original.effective_until ?? '무기한'}</span> },
  ];
  return <ZenDataGrid columns={columns} data={rows} />;
}

function WeightTierRateTable({ weightTierRates, calcShipperPrice }: { weightTierRates: PublicWeightTierRate[]; calcShipperPrice: (price: number, zoneId: string) => number }) {
  const columns: ColumnDef<PublicWeightTierRate>[] = [
    { id: 'product', header: '제품', cell: ({ row }) => <span className="text-sm font-medium">{row.original.product?.product_code}</span> },
    { id: 'zone', header: 'Zone', cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.zone?.zone_code}</ZenBadge> },
    { id: 'tier', header: '중량 구간', cell: ({ row }) => <span className="font-mono text-sm">{row.original.tier_min_kg}kg ~ {row.original.tier_max_kg != null ? `${row.original.tier_max_kg}kg` : '∞'}</span> },
    { id: 'shipper_price', header: '적용 운임/kg', cell: ({ row }) => {
      const price = calcShipperPrice(row.original.price_per_kg_selling, row.original.zone_id);
      return <span className="font-mono text-sm font-semibold text-brand-700">{price.toLocaleString()}원</span>;
    }},
  ];
  return <ZenDataGrid columns={columns} data={weightTierRates} />;
}

function FreightMinimumTable({ freightMinimums, calcShipperPrice }: { freightMinimums: PublicFreightMinimum[]; calcShipperPrice: (price: number, zoneId: string) => number }) {
  const columns: ColumnDef<PublicFreightMinimum>[] = [
    { id: 'product', header: '제품', cell: ({ row }) => <span className="text-sm font-medium">{row.original.product?.product_code}</span> },
    { id: 'zone', header: 'Zone', cell: ({ row }) => <ZenBadge variant="default" className="font-mono">{row.original.zone?.zone_code}</ZenBadge> },
    { id: 'shipper_price', header: '적용 최소운임', cell: ({ row }) => {
      const price = calcShipperPrice(row.original.min_charge_selling, row.original.zone_id);
      return <span className="font-mono text-sm font-semibold text-brand-700">{price.toLocaleString()}원</span>;
    }},
  ];
  return <ZenDataGrid columns={columns} data={freightMinimums} />;
}
