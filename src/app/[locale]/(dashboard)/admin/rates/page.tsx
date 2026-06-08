'use client';

import React, { useState } from 'react';
import { Plus, XCircle, AlertCircle, Truck } from 'lucide-react';
import { ZenCard } from '@/components/ui/ZenUI';
import { RateCardList } from '@/components/admin/RateCardList';
import { RateCardForm } from '@/components/admin/RateCardForm';
import { USER_ROLES } from '@/lib/auth/rbac';
import { useRates } from './useRates';
import { motion, AnimatePresence } from 'framer-motion';

export default function RatesManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    carriers, ports, selectedCarrier, setSelectedCarrier,
    serviceType, setServiceType,
    currency, setCurrency,
    marginRate, setMarginRate,
    platformFeeRate, setPlatformFeeRate,
    originPortId, setOriginPortId, destPortId, setDestPortId,
    transitDays, setTransitDays,
    validFrom, setValidFrom, validTo, setValidTo,
    tiers, setTiers, loading,
    listLoading, searchTerm, setSearchTerm,
    profile, canEdit, canDelete, filteredRates,
    handleEditRate, handleSaveRate, handleDeleteRate, resetForm,
  } = useRates();

  const isCarrier = profile?.role === USER_ROLES.CARRIER;

  const handleOpenNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditAndOpenModal = (rate: any) => {
    handleEditRate(rate);
    setIsModalOpen(true);
  };

  const handleSaveAndClose = async () => {
    const success = await handleSaveRate();
    if (success) setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
          <Truck size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">운송 서비스 요율</h1>
          <p className="text-xs font-medium text-slate-500">운송사별 항로 및 중량구간(Slab) 체계를 관리합니다.</p>
        </div>
      </div>

      {isCarrier && (
        <ZenCard className="bg-brand-600 border-none flex items-center gap-4 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-base">파트너 조회 모드</p>
            <p className="text-brand-100 text-sm">
              운송 파트너 계정으로 접속 중입니다. 요율 정보는 조회만 가능합니다.
            </p>
          </div>
        </ZenCard>
      )}

      <RateCardList
        rates={filteredRates}
        loading={listLoading}
        onEdit={handleEditAndOpenModal}
        onDelete={handleDeleteRate}
        canEdit={canEdit}
        canDelete={canDelete}
        actions={
          !isCarrier ? (
            <button
              onClick={handleOpenNew}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold shadow-sm hover:shadow-brand-500/20"
            >
              <Plus size={18} />
              새 요율 등록
            </button>
          ) : undefined
        }
      />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-brand-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedCarrier ? '요율 카드 수정' : '새 요율 등록'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                  <RateCardForm
                    carriers={carriers}
                    selectedCarrier={selectedCarrier} onCarrierChange={setSelectedCarrier}
                    serviceType={serviceType} onServiceTypeChange={setServiceType}
                    currency={currency} onCurrencyChange={setCurrency}
                  marginRate={marginRate} onMarginRateChange={setMarginRate}
                  platformFeeRate={platformFeeRate} onPlatformFeeRateChange={setPlatformFeeRate}
                  ports={ports}
                  originPortId={originPortId} onOriginPortIdChange={setOriginPortId}
                  destPortId={destPortId} onDestPortIdChange={setDestPortId}
                  transitDays={transitDays} onTransitDaysChange={setTransitDays}
                  validFrom={validFrom} onValidFromChange={setValidFrom}
                  validTo={validTo} onValidToChange={setValidTo}
                  tiers={tiers} onTiersChange={setTiers}
                  loading={loading} onSave={handleSaveAndClose}
                  onResetForm={resetForm}
                  profile={profile} isCarrierRole={isCarrier}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
