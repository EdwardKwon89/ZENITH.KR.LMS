'use client';

import { useState, useMemo } from 'react';
import { DollarSign, Fuel, FileText, Layers, Scale, Users } from 'lucide-react';
import { ZenBadge } from '@/components/ui/ZenUI';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import UpsBaseRateMatrix from '@/components/ups/UpsBaseRateMatrix';
import { ZoneDiscountForm } from '@/components/agency/ZoneDiscountForm';
import type { UpsZoneWithCountries, UpsProduct } from '@/types/ups';
import type { PublicBaseRate, PublicFuelSurcharge, PublicOtherCharge, PublicWeightTierRate, PublicFreightMinimum } from '@/app/actions/ups/rates-public';
import type { AgencyShipperRow } from '@/types/agency';
import type { ColumnDef } from '@tanstack/react-table';

interface PricingPolicy {
  id: string;
  agency_org_id: string;
  zone_id: string;
  discount_rate: number;
  is_active: boolean;
}

type TabKey = 'baseRates' | 'fuelSurcharges' | 'otherCharges' | 'weightTierRates' | 'freightMinimums' | 'shipperDiscounts';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'baseRates', label: '기준요금', icon: DollarSign },
  { key: 'fuelSurcharges', label: '유류할증', icon: Fuel },
  { key: 'otherCharges', label: '부가요금', icon: FileText },
  { key: 'weightTierRates', label: '20kg 초과 티어 요율', icon: Layers },
  { key: 'freightMinimums', label: 'Freight 최소운임', icon: Scale },
  { key: 'shipperDiscounts', label: '화주 할인율 관리', icon: Users },
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
  shippers: AgencyShipperRow[];
  agencyOrgId?: string;
}

export function AgencyUpsRatesClient({
  zones, products, baseRates, fuelSurcharges, otherCharges,
  weightTierRates, freightMinimums, pricingPolicies, shippers, agencyOrgId,
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
        return (
          <UpsBaseRateMatrix
            products={products}
            zones={zones}
            readOnly
            priceMode="agency"
            rates={baseRates}
            discountRateMap={policyByZone}
          />
        );
      case 'fuelSurcharges':
        return <FuelSurchargeTable rows={fuelSurcharges} />;
      case 'otherCharges':
        return <OtherChargeTable otherCharges={otherCharges} />;
      case 'weightTierRates':
        return <WeightTierRateTable weightTierRates={weightTierRates} calcAgencyCost={calcAgencyCost} />;
      case 'freightMinimums':
        return <FreightMinimumTable freightMinimums={freightMinimums} calcAgencyCost={calcAgencyCost} />;
      case 'shipperDiscounts':
        return <ShipperDiscountsTab shippers={shippers} zones={zones} agencyOrgId={agencyOrgId} />;
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

function ShipperDiscountsTab({ shippers, zones, agencyOrgId }: { shippers: AgencyShipperRow[]; zones: UpsZoneWithCountries[]; agencyOrgId?: string }) {
  const [selectedShipperOrgId, setSelectedShipperOrgId] = useState<string | null>(null);
  const corporateShippers = shippers.filter(s => s.shipper_type === 'CORPORATE');

  const selected = selectedShipperOrgId
    ? corporateShippers.find(s => s.shipper_org_id === selectedShipperOrgId)
    : null;

  const columns: ColumnDef<AgencyShipperRow>[] = [
    { id: 'name', header: '화주명', cell: ({ row }) => <span className="text-sm font-semibold text-slate-800">{row.original.shipper?.name ?? '-'}</span> },
    { id: 'biz_no', header: '사업자번호', cell: ({ row }) => <span className="font-mono text-sm text-slate-500">{row.original.shipper?.biz_no ?? '-'}</span> },
    { id: 'status', header: '상태', cell: ({ row }) => (
      <ZenBadge variant={row.original.is_active ? 'success' : 'default'}>
        {row.original.is_active ? '활성' : '비활성'}
      </ZenBadge>
    )},
    {
      id: 'actions', header: '설정',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setSelectedShipperOrgId(row.original.shipper_org_id)}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${selectedShipperOrgId === row.original.shipper_org_id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          {selectedShipperOrgId === row.original.shipper_org_id ? '선택됨' : '선택'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {selected && (
        <ZoneDiscountForm
          shipperOrgId={selected.shipper_org_id}
          shipperType={selected.shipper_type}
          zones={zones}
          agencyOrgId={agencyOrgId}
        />
      )}
      <ZenDataGrid columns={columns} data={corporateShippers} />
    </div>
  );
}
