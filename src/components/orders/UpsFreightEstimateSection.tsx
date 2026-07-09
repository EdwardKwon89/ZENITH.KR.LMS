'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { estimateUpsFreight, UpsFreightEstimate } from '@/app/actions/ups/freight';
import { getUpsProducts } from '@/app/actions/ups/rates';
import { getAgencyOrgIdByShipper } from '@/app/actions/agency/shipper-link';
import { UpsFreightEstimatePanel } from './UpsFreightEstimatePanel';
import { OrderPackageInput } from '@/lib/validation/order';

interface UpsProduct {
  id: string;
  product_code: string;
  product_name: string;
}

interface UpsFreightEstimateSectionProps {
  shipperOrgId: string | null;
  destCountryCode?: string;
  packages: OrderPackageInput[];
  selectedProductId?: string;
  selectedIncoterms?: 'DDU' | 'DDP';
  onProductChange: (productId: string) => void;
  onIncotermsChange: (incoterms: 'DDU' | 'DDP') => void;
}

const FAMILY_LABELS: Record<string, string> = {
  WW_EXPRESS: 'WW Express',
  WW_SAVER: 'Saver',
  WW_EXPEDITED: 'Expedited',
  WW_FLIGHT: 'Freight',
};

function extractFamily(productCode: string): string {
  return productCode.replace(/_(DOC|NONDOC)$/, '');
}

export function UpsFreightEstimateSection({
  shipperOrgId,
  destCountryCode,
  packages,
  selectedProductId,
  selectedIncoterms = 'DDP',
  onProductChange,
  onIncotermsChange,
}: UpsFreightEstimateSectionProps) {
  const [products, setProducts] = useState<UpsProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [agencyOrgId, setAgencyOrgId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<UpsFreightEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const cargoType = packages[0]?.content_type === 'DOC' ? 'DOC' : 'NON_DOC';

  const productFamilies = useMemo(() => {
    const seen = new Set<string>();
    return products.filter((p) => {
      const family = extractFamily(p.product_code);
      if (seen.has(family)) return false;
      seen.add(family);
      return true;
    });
  }, [products]);

  useEffect(() => {
    if (!shipperOrgId) return;
    let cancelled = false;
    getAgencyOrgIdByShipper(shipperOrgId)
      .then((id) => {
        if (!cancelled) setAgencyOrgId(id);
      })
      .catch(() => {
        if (!cancelled) setAgencyOrgId(null);
      });
    return () => { cancelled = true; };
  }, [shipperOrgId]);

  useEffect(() => {
    let cancelled = false;
    getUpsProducts(cargoType)
      .then((data) => {
        if (!cancelled) setProducts(data as UpsProduct[]);
      })
      .catch(() => {
        if (!cancelled) setEstimateError('UPS 서비스 티어 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => { cancelled = true; };
  }, [cargoType]);

  useEffect(() => {
    if (!selectedProductId) return;
    const stillExists = products.some((p) => p.id === selectedProductId);
    if (!stillExists && products.length > 0) {
      onProductChange(products[0].id);
    }
  }, [products, selectedProductId, onProductChange]);

  useEffect(() => {
    const totalWeight = packages.reduce(
      (sum, pkg) => sum + (pkg.gross_weight || 0) * (pkg.packing_count || 1),
      0
    );
    const firstPkg = packages[0];

    if (!selectedProductId || !destCountryCode || totalWeight <= 0) {
      setEstimate(null);
      return;
    }

    let cancelled = false;
    setEstimateLoading(true);
    setEstimateError(null);

    estimateUpsFreight({
      productId: selectedProductId,
      destCountryCode,
      actualWeightKg: totalWeight,
      dimL: firstPkg?.length,
      dimW: firstPkg?.width,
      dimH: firstPkg?.height,
      incoterms: selectedIncoterms,
      agencyOrgId,
      shipperOrgId,
      direction: 'EXPORT',
    })
      .then((result) => {
        if (!cancelled) setEstimate(result);
      })
      .catch((err: any) => {
        if (!cancelled) setEstimateError(err.message || '견적 계산에 실패했습니다.');
      })
      .finally(() => {
        if (!cancelled) setEstimateLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedProductId, destCountryCode, packages, selectedIncoterms, agencyOrgId, shipperOrgId]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">서비스 티어</label>
          <select
            value={selectedProductId || ''}
            onChange={(e) => onProductChange(e.target.value)}
            disabled={productsLoading}
            className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-50"
          >
            <option value="">{productsLoading ? '로딩 중...' : '서비스 티어 선택'}</option>
            {productFamilies.map((p) => (
              <option key={p.id} value={p.id}>
                {FAMILY_LABELS[extractFamily(p.product_code)] || p.product_code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Incoterms</label>
          <select
            value={selectedIncoterms}
            onChange={(e) => onIncotermsChange(e.target.value as 'DDU' | 'DDP')}
            className="w-full bg-white border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-50"
          >
            <option value="DDP">DDP</option>
            <option value="DDU">DDU</option>
          </select>
        </div>
      </div>
      <UpsFreightEstimatePanel estimate={estimate} loading={estimateLoading} error={estimateError} />
    </div>
  );
}
