'use client';

import { DollarSign, AlertCircle, LayoutGrid, Search, ListFilter } from 'lucide-react';
import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { RateCardList } from '@/components/admin/RateCardList';
import { RateCardForm } from '@/components/admin/RateCardForm';
import { USER_ROLES } from '@/lib/auth/rbac';
import { cn } from '@/lib/utils';
import { useRates } from './useRates';

export default function RatesManagementPage() {
  const {
    carriers, ports, selectedCarrier, setSelectedCarrier,
    originPort, setOriginPort, destPort, setDestPort,
    serviceType, setServiceType, baseRate, setBaseRate,
    priority, setPriority, selectedCustomer, setSelectedCustomer,
    baseDateRule, setBaseDateRule, validFrom, setValidFrom,
    validTo, setValidTo, shippers, tiers, setTiers,
    surcharges, setSurcharges, loading,
    rateCards, listLoading, searchTerm, setSearchTerm,
    statusFilter, setStatusFilter, profile,
    canEdit, canDelete, filteredRates,
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
        carriers={carriers} ports={ports}
        selectedCarrier={selectedCarrier} onCarrierChange={setSelectedCarrier}
        originPort={originPort} onOriginPortChange={setOriginPort}
        destPort={destPort} onDestPortChange={setDestPort}
        serviceType={serviceType} onServiceTypeChange={setServiceType}
        baseRate={baseRate} onBaseRateChange={setBaseRate}
        priority={priority} onPriorityChange={setPriority}
        selectedCustomer={selectedCustomer} onCustomerChange={setSelectedCustomer}
        baseDateRule={baseDateRule} onBaseDateRuleChange={setBaseDateRule}
        validFrom={validFrom} onValidFromChange={setValidFrom}
        validTo={validTo} onValidToChange={setValidTo}
        shippers={shippers}
        tiers={tiers} onTiersChange={setTiers}
        surcharges={surcharges} onSurchargesChange={setSurcharges}
        loading={loading} onSave={handleSaveRate}
        profile={profile} isCarrierRole={isCarrier}
      />

      <section className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <LayoutGrid className="w-6 h-6 text-blue-500" />
              Registered Pricing Masters
            </h2>
            <p className="text-sm text-slate-400">시스템에 배포되어 현재 유효한 운송사별 요율 정보 목록입니다.</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex gap-1 p-1 bg-slate-50 rounded-2xl border border-slate-300 overflow-hidden">
              {['ACTIVE', 'ALL'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all",
                    statusFilter === s
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-slate-500"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <ZenInput
                placeholder="Search route or carrier..."
                className="pl-12 bg-slate-50 border-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ZenButton variant="glass" className="aspect-square p-0 w-12 h-12 rounded-2xl">
              <ListFilter className="w-5 h-5 text-slate-500" />
            </ZenButton>
          </div>
        </div>

        <RateCardList
          rates={filteredRates}
          loading={listLoading}
          onDelete={handleDeleteRate}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </section>
    </div>
  );
}
