'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { estimateUpsFreight, UpsFreightEstimate } from '@/app/actions/ups/freight';
import { getUpsProducts } from '@/app/actions/ups/rates';
import { getAgencyOrgIdByShipper } from '@/app/actions/agency/shipper-link';
import { UpsFreightEstimatePanel } from './UpsFreightEstimatePanel';
import { OrderPackageInput } from '@/lib/validation/order';
import { calcMultiPackageChargeableWeight } from '@/lib/ups/pricing-engine';

interface UpsProduct {
  id: string;
  product_code: string;
  product_name: string;
  cargo_type: string;
}

interface UpsFreightEstimateSectionProps {
  shipperOrgId: string | null;
  destCountryCode?: string;
  packages: OrderPackageInput[];
  selectedProductId?: string;
  selectedIncoterms?: 'DDU' | 'DDP';
  onProductChange: (productId: string) => void;
  onIncotermsChange: (incoterms: 'DDU' | 'DDP') => void;
  onEstimateChange?: (estimate: UpsFreightEstimate | null) => void;
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
  onEstimateChange,
}: UpsFreightEstimateSectionProps) {
  const [products, setProducts] = useState<UpsProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [agencyOrgId, setAgencyOrgId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<UpsFreightEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const cargoType = packages[0]?.content_type === 'DOC' ? 'DOC' : 'NON_DOC';

  const totalWeight = useMemo(
    () => packages.reduce((sum, pkg) => sum + (pkg.gross_weight || 0), 0),
    [packages]
  );

  // Issue #476: 전체 패키지 배열 기반 총 정산중량 계산
  const multiPkgResult = useMemo(() => {
    const pkgData = packages.map(pkg => ({
      gross_weight_kg: pkg.gross_weight || 0,
      dims: (pkg.length && pkg.width && pkg.height)
        ? { l: pkg.length, w: pkg.width, h: pkg.height }
        : undefined,
      divisor: (pkg.volume ? 5000 : undefined) as 5000 | 5500 | 6000 | undefined,
    }));
    return calcMultiPackageChargeableWeight(pkgData);
  }, [packages]);

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
    getUpsProducts()
      .then((data) => {
        if (!cancelled) {
          const filtered = (data as UpsProduct[]).filter(
            (p) => p.cargo_type === cargoType || p.cargo_type === 'BOTH'
          );
          setProducts(filtered);
        }
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
    if (products.length === 0) return;
    const stillExists = selectedProductId && products.some((p) => p.id === selectedProductId);
    if (stillExists) return;
    const saver = products.find((p) => extractFamily(p.product_code) === 'WW_SAVER');
    onProductChange(saver?.id || products[0].id);
  }, [products, selectedProductId, onProductChange]);

  useEffect(() => {
    if (!selectedProductId || !destCountryCode || totalWeight <= 0) {
      setEstimate(null);
      return;
    }

    let cancelled = false;
    setEstimateLoading(true);
    setEstimateError(null);

    // Issue #476: 다중 패키지 정산중량 사용
    estimateUpsFreight({
      productId: selectedProductId,
      destCountryCode,
      actualWeightKg: multiPkgResult.totalChargeableKg,
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
  }, [selectedProductId, destCountryCode, multiPkgResult.totalChargeableKg, selectedIncoterms, agencyOrgId, shipperOrgId]);

  useEffect(() => {
    onEstimateChange?.(estimate);
  }, [estimate, onEstimateChange]);

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
