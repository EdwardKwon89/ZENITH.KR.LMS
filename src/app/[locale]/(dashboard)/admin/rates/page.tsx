'use client';

import { DollarSign, AlertCircle } from 'lucide-react';
import { ZenCard } from '@/components/ui/ZenUI';
import { RateCardList } from '@/components/admin/RateCardList';
import { RateCardForm } from '@/components/admin/RateCardForm';
import { USER_ROLES } from '@/lib/auth/rbac';
import { useRates } from './useRates';

export default function RatesManagementPage() {
  const {
    carriers, selectedCarrier, setSelectedCarrier,
    serviceType, setServiceType,
    carrierCost, setCarrierCost, marginRate, setMarginRate,
    platformFeeRate, setPlatformFeeRate,
    validFrom, setValidFrom, validTo, setValidTo,
    tiers, setTiers, surcharges, setSurcharges, loading,
    rateCards, listLoading, searchTerm, setSearchTerm,
    profile, canEdit, canDelete, filteredRates,
    handleSaveRate, handleDeleteRate,
  } = useRates();

  const isCarrier = profile?.role === USER_ROLES.CARRIER;

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-10">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 font-bold tracking-tighter text-sm uppercase">
            <DollarSign className="w-4 h-4" />
            Pricing Strategy & Master Data
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            물류 요율 마스터 등록
            <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full border border-slate-200 font-mono">
              V-Engine 2.0
            </span>
          </h1>
          <p className="text-slate-500 max-w-xl">
            운송사별, 항로별 기본 요율 및 중량구간(Slab), 할증료(Surcharge) 체계를 관리합니다.
          </p>
        </div>
      </header>

      {isCarrier && (
        <div className="max-w-7xl mx-auto">
          <ZenCard className="bg-blue-600 border-none flex items-center gap-4 text-white">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black tracking-tight text-lg">Partner View Mode Active</p>
              <p className="text-blue-100 text-sm">운송 파트너 계정으로 접속 중입니다. 요율 정보는 조회만 가능하며 수정 권한이 제한됩니다.</p>
            </div>
          </ZenCard>
        </div>
      )}

      <RateCardForm
        carriers={carriers}
        selectedCarrier={selectedCarrier} onCarrierChange={setSelectedCarrier}
        serviceType={serviceType} onServiceTypeChange={setServiceType}
        carrierCost={carrierCost} onCarrierCostChange={setCarrierCost}
        marginRate={marginRate} onMarginRateChange={setMarginRate}
        platformFeeRate={platformFeeRate} onPlatformFeeRateChange={setPlatformFeeRate}
        validFrom={validFrom} onValidFromChange={setValidFrom}
        validTo={validTo} onValidToChange={setValidTo}
        tiers={tiers} onTiersChange={setTiers}
        surcharges={surcharges} onSurchargesChange={setSurcharges}
        loading={loading} onSave={handleSaveRate}
        profile={profile} isCarrierRole={isCarrier}
      />

      <RateCardList
        rates={filteredRates}
        loading={listLoading}
        onDelete={handleDeleteRate}
        canEdit={canEdit}
        canDelete={canDelete}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </div>
  );
}
