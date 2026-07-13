'use client';

import { useState, useEffect, useMemo } from 'react';
import { DollarSign, EyeOff, Eye, RefreshCw, Calendar } from 'lucide-react';
import type { UpsZoneWithCountries, UpsProduct, UpsBaseRateWithRefs } from '@/types/ups';
import type { PublicBaseRate } from '@/app/actions/ups/rates-public';
import { getUpsBaseRates } from '@/app/actions/ups/rates';
import { ZenBadge } from '@/components/ui/ZenUI';

type MatrixRate = UpsBaseRateWithRefs | PublicBaseRate;

interface Props {
  products: UpsProduct[];
  zones: UpsZoneWithCountries[];
  agencies?: { id: string; name: string }[];
  onCellClick?: (rate: { productId: string; zoneId: string; weightKg: number }) => void;
  onNewClick?: () => void;
  canEdit?: boolean;
  readOnly?: boolean;
  rates?: MatrixRate[];
  priceMode?: 'full' | 'agency' | 'shipper';
  discountRateMap?: Record<string, number>;
}

type ProductGroup = { label: string; items: UpsProduct[] };

function formatDate(d: string): string {
  return d ? d.split('T')[0] : '';
}

function isExpiringSoon(validUntil: string | null): 'expired' | 'soon' | 'ok' {
  if (!validUntil) return 'ok';
  const now = new Date();
  const end = new Date(validUntil);
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'soon';
  return 'ok';
}

const PRICE_LABEL: Record<string, string> = {
  full: '판매가 (원가)',
  agency: '플랫폼 판매가',
  shipper: '적용 운임',
};

export default function UpsBaseRateMatrix({
  products, zones, agencies = [], onCellClick, onNewClick, canEdit,
  readOnly = false, rates: propRates, priceMode = 'full', discountRateMap = {},
}: Props) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [previewAgencyId, setPreviewAgencyId] = useState<string>('');
  const [matrixRates, setMatrixRates] = useState<MatrixRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [referenceDate, setReferenceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const effectiveDate = showAllPeriods ? '2099-12-31' : referenceDate;

  const isReadOnly = readOnly || !canEdit;

  const productGroups = useMemo(() => {
    const groups: ProductGroup[] = [];
    const order = ['DOC', 'NON_DOC', 'BOTH'];
    for (const type of order) {
      const items = products.filter(p => p.cargo_type === type);
      if (items.length) groups.push({ label: type, items });
    }
    return groups;
  }, [products]);

  const previewDiscount = useMemo(() => {
    if (!previewAgencyId) return null;
    const match = agencies.find(a => a.id === previewAgencyId);
    if (!match) return null;
    return { name: match.name, rate: 0.15 };
  }, [previewAgencyId, agencies]);

  useEffect(() => {
    if (isReadOnly && propRates) {
      setMatrixRates(propRates);
      return;
    }
    if (!selectedProductId) { setMatrixRates([]); return; }
    setLoading(true);
    getUpsBaseRates({ productId: selectedProductId, referenceDate: effectiveDate })
      .then(setMatrixRates)
      .catch(() => setMatrixRates([]))
      .finally(() => setLoading(false));
  }, [selectedProductId, effectiveDate, isReadOnly, propRates]);

  const filteredRates = useMemo(() => {
    if (selectedProductId) {
      return matrixRates.filter(r => r.product_id === selectedProductId);
    }
    return matrixRates;
  }, [matrixRates, selectedProductId]);

  const zoneWeights = useMemo(() => {
    const weightSet = new Set<number>();
    const zoneMap: Record<string, { id: string; code: string; rates: Record<number, MatrixRate> }> = {};

    for (const z of zones) {
      zoneMap[z.id] = { id: z.id, code: z.zone_code, rates: {} };
    }

    for (const r of filteredRates) {
      const w = Number(r.weight_kg);
      weightSet.add(w);
      if (zoneMap[r.zone_id]) {
        zoneMap[r.zone_id].rates[w] = r;
      }
    }

    const sortedWeights = Array.from(weightSet).sort((a, b) => a - b);
    const sortedZones = zones.filter(z => zoneMap[z.id]).map(z => zoneMap[z.id]);

    return { weights: sortedWeights, zones: sortedZones };
  }, [filteredRates, zones]);

  const handleCellClick = (zoneId: string, weightKg: number) => {
    if (isReadOnly || !selectedProductId) return;
    onCellClick?.({ productId: selectedProductId, zoneId, weightKg });
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const getDiscountRate = (zoneId: string): number => {
    return discountRateMap[zoneId] ?? 0;
  };

  const renderCellPrice = (rate: MatrixRate, zoneId: string) => {
    const discountRate = getDiscountRate(zoneId);
    const hasCost = 'cost_price' in rate;

    switch (priceMode) {
      case 'agency': {
        const agencyCost = discountRate > 0
          ? Math.round(Number(rate.selling_price) * (1 - discountRate))
          : null;
        return (
          <div className="space-y-0.5">
            <div className="font-mono text-xs font-medium text-slate-900">
              {Number(rate.selling_price).toLocaleString()}원
            </div>
            {agencyCost != null && (
              <div className="font-mono text-[10px] text-slate-400">
                ({agencyCost.toLocaleString()}원)
              </div>
            )}
          </div>
        );
      }
      case 'shipper': {
        const shipperPrice = discountRate > 0
          ? Math.round(Number(rate.selling_price) * (1 - discountRate))
          : Number(rate.selling_price);
        return (
          <div className="font-mono text-xs font-semibold text-brand-700">
            {shipperPrice.toLocaleString()}원
          </div>
        );
      }
      default: {
        const discounted = previewDiscount && rate
          ? Math.round(Number(rate.selling_price) * (1 - previewDiscount.rate))
          : null;
        return (
          <div className="space-y-0.5">
            <div className={`font-mono text-xs font-medium ${discounted ? 'text-rose-600 line-through decoration-rose-300' : 'text-slate-900'}`}>
              {Number(rate.selling_price).toLocaleString()}원
            </div>
            {discounted && (
              <div className="font-mono text-xs font-bold text-rose-600">
                {discounted.toLocaleString()}원
              </div>
            )}
            {hasCost && (
              <div className="font-mono text-[10px] text-slate-400">
                ({(rate as UpsBaseRateWithRefs).cost_price.toLocaleString()})
              </div>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-slate-400" />
          <select
            value={selectedProductId}
            onChange={e => setSelectedProductId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 min-w-[240px]"
          >
            <option value="">제품을 선택하세요</option>
            {productGroups.map(g => (
              <optgroup key={g.label} label={`── ${g.label} ──`}>
                {g.items.map(p => (
                  <option key={p.id} value={p.id}>{p.product_name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {loading && <RefreshCw size={14} className="animate-spin text-slate-400" />}
        </div>

        {!isReadOnly && (
          <>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={showAllPeriods ? '2099-12-31' : referenceDate}
                onChange={e => { setShowAllPeriods(false); setReferenceDate(e.target.value); }}
                disabled={showAllPeriods}
                className={`px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${showAllPeriods ? 'opacity-40' : ''}`}
              />
              <button
                onClick={() => { setShowAllPeriods(false); setReferenceDate(new Date().toISOString().split('T')[0]); }}
                className="px-2 py-1.5 text-[10px] font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
              >
                오늘
              </button>
              <button
                onClick={() => setShowAllPeriods(!showAllPeriods)}
                className={`px-2 py-1.5 text-[10px] font-semibold rounded-lg transition-colors ${showAllPeriods ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {showAllPeriods ? '기간별 보기' : '전체 기간'}
              </button>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2 h-[38px]">
              {previewAgencyId ? <Eye size={14} className="text-rose-400 shrink-0" /> : <EyeOff size={14} className="text-slate-400 shrink-0" />}
              <select
                value={previewAgencyId}
                onChange={e => setPreviewAgencyId(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Agency 미리보기 (OFF)</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="w-auto min-w-[80px]">
                {previewDiscount && (
                  <ZenBadge variant="danger" className="text-xs whitespace-nowrap">
                    {(previewDiscount.rate * 100).toFixed(0)}% 할인
                  </ZenBadge>
                )}
              </div>
            </div>

            {canEdit && selectedProductId && (
              <button onClick={onNewClick} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold text-xs shadow-sm shrink-0">
                기준요금 신규 등록
              </button>
            )}
          </>
        )}
      </div>

      {selectedProductId && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="sticky left-0 bg-slate-50/80 px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left border-r border-slate-200 min-w-[70px]">
                  중량
                </th>
                {zoneWeights.zones.map(z => (
                  <th key={z.id} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center border-r border-slate-200 last:border-r-0 min-w-[90px]">
                    {z.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zoneWeights.weights.map(w => (
                <tr key={w} className="border-t border-slate-100 hover:bg-brand-50/30 transition-colors">
                  <td className="sticky left-0 bg-white px-3 py-2 text-xs font-mono font-semibold text-slate-700 border-r border-slate-200">
                    {w}kg
                  </td>
                  {zoneWeights.zones.map(z => {
                    const rate = z.rates[w];
                    const validity = rate ? isExpiringSoon(rate.valid_until) : null;
                    return (
                      <td
                        key={z.id}
                        onClick={() => handleCellClick(z.id, w)}
                        className={`px-3 py-2 text-center border-r border-slate-100 last:border-r-0 ${!isReadOnly && rate ? 'cursor-pointer hover:bg-brand-100/50' : ''} ${rate ? '' : 'text-slate-300'} ${validity === 'expired' ? 'bg-rose-50/50' : validity === 'soon' ? 'bg-amber-50/50' : ''}`}
                      >
                        {rate ? (
                          <div className="space-y-0.5">
                            {renderCellPrice(rate, z.id)}
                            <div className="font-mono text-[8px] text-slate-400 leading-tight">
                              {rate.valid_from}~{rate.valid_until || '∞'}
                            </div>
                            {validity === 'expired' && (
                              <div className="font-mono text-[9px] text-rose-500 font-semibold">만료</div>
                            )}
                            {validity === 'soon' && (
                              <div className="font-mono text-[9px] text-amber-600">~{rate.valid_until?.split('T')[0]}</div>
                            )}
                          </div>
                        ) : (
                          <div className="py-1">
                            <span className="text-[10px]">—</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {zoneWeights.weights.length === 0 && (
                <tr>
                  <td colSpan={zoneWeights.zones.length + 1} className="px-6 py-12 text-center text-sm text-slate-400">
                    {selectedProduct ? `"${selectedProduct.product_code}" 제품의 등록된 기준요금이 없습니다.` : '제품을 선택해주세요.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/30 flex gap-4 text-[9px] text-slate-500">
            <span>■ {PRICE_LABEL[priceMode]}</span>
            {!isReadOnly && priceMode === 'full' && (
              <>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-50 border border-rose-200 inline-block" /> 만료</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-50 border border-amber-200 inline-block" /> 30일 내 만료 예정</span>
              </>
            )}
          </div>
        </div>
      )}

      {canEdit && selectedProductId && !isReadOnly && (
        <div className="flex justify-end">
          <button onClick={onNewClick} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold text-sm shadow-sm">
            기준요금 신규 등록
          </button>
        </div>
      )}

      {selectedProductId && (
        <p className="text-[10px] text-slate-400">
          {zoneWeights.weights.length}개 중량 × {zoneWeights.zones.length}개 Zone = 총 {matrixRates.length}건 기준요금
        </p>
      )}
    </div>
  );
}
