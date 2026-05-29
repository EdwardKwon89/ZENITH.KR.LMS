"use client";
import { logger } from '@/lib/logger';

import React, { useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray, Control, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast, Toaster } from 'sonner';
import { 
  Package, User, Globe, Plus, Trash2, Save, 
  ChevronRight, AlertCircle, CheckCircle2, Box, Layers, Plane, Ship, Zap, Truck
} from 'lucide-react';
import { ZenCard, ZenButton, ZenInput, ZenBadge } from '@/components/ui/ZenUI';
import { createOrder } from '@/app/actions/orders';
import { getCurrentUserAffiliation } from '@/app/actions/master';
import { orderRegistrationSchema, OrderRegistrationInput } from '@/lib/validation/order';
import { estimateFreightCost, TransportMode } from '@/utils/logistics/freight-calculator';

interface OrderRegistrationFormProps {
  shippers: any[];
  ports: any[];
  onSuccess?: () => void;
}

type Affiliation = {
  userId: string;
  userName: string;
  userEmail: string;
  role: string | null;
  orgId: string | null;
  orgName: string | null;
  orgAddress: string | null;
  orgBizNo: string | null;
  isIndividual: boolean;
  dummyIndividualId: string;
} | null;

/**
 * 📦 패킹 단위 내부의 아이템 리스트 관리 컴포넌트 (Nested Field Array)
 */
const NestedItems: React.FC<{
  nestIndex: number;
  control: any; // 타각적 타입 에러 방지 (Complex Generic mismatch)
  register: any;
  errors: any;
  t: any;
}> = ({ nestIndex, control, register, errors, t }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `packages.${nestIndex}.items` as any
  });

  return (
    <div className="space-y-2 mt-3 ml-4 border-l-2 border-slate-100 pl-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1">
          <Layers size={12} /> {t('section_items')} ({fields.length})
        </span>
        <button 
          type="button" 
          onClick={() => append({ item_name: '', quantity: 1, unit_price: 0, currency: 'USD', item_packing_unit: 'EA' })}
          className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
        >
          <Plus size={10} /> {t('add_item')}
        </button>
      </div>

      <div className="space-y-2">
        {fields.map((item, k) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-start bg-slate-50/50 p-2 rounded-xl border border-dashed border-slate-200 group">
            <div className="col-span-4">
              <ZenInput 
                placeholder={t('item_name')}
                {...register(`packages.${nestIndex}.items.${k}.item_name`)}
                className="bg-white py-2 text-xs"
              />
            </div>
            <div className="col-span-2">
              <ZenInput 
                type="number"
                placeholder="Qty"
                {...register(`packages.${nestIndex}.items.${k}.quantity`, { valueAsNumber: true })}
                className="bg-white py-2 text-xs"
              />
            </div>
            <div className="col-span-3">
              <ZenInput 
                placeholder="HS Code"
                {...register(`packages.${nestIndex}.items.${k}.hs_code`)}
                className="bg-white py-2 text-xs"
              />
            </div>
            <div className="col-span-2">
              <select 
                {...register(`packages.${nestIndex}.items.${k}.item_packing_unit`)}
                className="w-full text-xs h-9 bg-white border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="EA">EA</option>
                <option value="SET">SET</option>
                <option value="PCS">PCS</option>
              </select>
            </div>
            <div className="col-span-1 flex justify-center pt-2">
              <button 
                type="button" 
                onClick={() => remove(k)}
                disabled={fields.length === 1}
                className="text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const OrderRegistrationForm: React.FC<OrderRegistrationFormProps> = ({
  shippers,
  ports,
  onSuccess
}) => {
  const t = useTranslations('Orders');
  const router = useRouter();
  const [affiliation, setAffiliation] = React.useState<Affiliation>(null);
  const [isLoadingAffiliation, setIsLoadingAffiliation] = React.useState(true);

  const { 
    register, 
    control, 
    handleSubmit, 
    watch, 
    setValue,
    formState: { errors, isSubmitting } 
  } = useForm<OrderRegistrationInput>({
    resolver: zodResolver(orderRegistrationSchema) as any,
    defaultValues: {
      order_type: 'B2B',
      transport_mode: 'AIR',
      special_cargo_type: 'NONE',
      packages: [{ 
        packing_unit: 'BOX', 
        packing_count: 1, 
        gross_weight: 0, 
        items: [{ item_name: '', quantity: 1, unit_price: 0, currency: 'USD', item_packing_unit: 'EA' }] 
      }]
    }
  });

  useEffect(() => {
    async function loadAffiliation() {
      try {
        const data = await getCurrentUserAffiliation();
        setAffiliation(data);
        if (data.isIndividual) {
          setValue('order_type', 'B2C_ECOM');
          setValue('shipper_id', data.dummyIndividualId);
          setValue('shipper_contact_name', data.userName);
          setValue('shipper_contact_email', data.userEmail);
          setValue('shipper_contact_phone', data.userPhone || '');
        } else {
          setValue('order_type', 'B2B');
          setValue('shipper_id', data.orgId as string);
          setValue('shipper_contact_name', data.userName);
          setValue('shipper_contact_email', data.userEmail);
          setValue('shipper_contact_phone', data.userPhone || '');
          setValue('shipper_address', data.orgAddress || '');
          setValue('shipper_biz_no', data.orgBizNo || '');
        }
      } catch (err) { logger.error(err); } finally { setIsLoadingAffiliation(false); }
    }
    loadAffiliation();
  }, [setValue]);

  const { fields: packageFields, append: appendPackage, remove: removePackage } = useFieldArray({
    control,
    name: "packages"
  });

  // 📐 치수 기반 합산 및 예상 운임 엔진 (v2.2 - Chargeable Weight 반영)
  const transportMode = watch('transport_mode') as TransportMode;
  const watchedPackages = useWatch({
    control,
    name: "packages"
  });
  
  const totals = useMemo(() => {
    let weight = 0;
    let volume = 0;
    
    if (!watchedPackages) return { weight: 0, volume: 0, freight: 0 };

    watchedPackages.forEach(pkg => {
      const count = Number(pkg.packing_count) || 0;
      const grossWeight = Number(pkg.gross_weight) || 0;
      
      weight += grossWeight * count;
      
      const pkgVol = (pkg.length && pkg.width && pkg.height)
        ? (Number(pkg.length) * Number(pkg.width) * Number(pkg.height)) / 1000000 
        : (Number(pkg.volume) || 0);
      volume += pkgVol * count;
    });

    const freight = estimateFreightCost({
      weight,
      volume,
      mode: transportMode || 'AIR'
    });

    return { weight, volume, freight };
  }, [watchedPackages, transportMode]);

  // 🔄 Transport Mode 변경 시 항구 선택 초기화 (정합성 유지)
  useEffect(() => {
    setValue('origin_port_id', '');
    setValue('dest_port_id', '');
  }, [transportMode, setValue]);

  const filteredPorts = useMemo(() => {
    if (!transportMode) return ports;
    const mappedType = transportMode === 'EXP' ? 'AIR' : transportMode;
    return ports.filter(p => p.type === mappedType);
  }, [ports, transportMode]);

  const onSubmit = async (data: any) => {
    try {
      // 📐 예상 운임(v2.2)을 데이터에 포함하여 전송
      const finalData = {
        ...data,
        estimated_cost: totals.freight
      };
      
      const result = await createOrder(finalData as OrderRegistrationInput);
      toast.success(t('success_create'), { 
        description: `Order No: ${result.order_no}`,
        icon: <CheckCircle2 className="text-green-500" />
      });
      if (onSuccess) onSuccess();
      setTimeout(() => router.push(`/orders/${result.id}`), 1000);
    } catch (err: any) {
      logger.error('Registration failed:', err);
      toast.error('Submission Failed', { 
        description: err.message,
        icon: <AlertCircle className="text-red-500" />
      });
    }
  };

  const onError = (errors: any) => {
    logger.error('Validation Errors:', errors);
    const firstError = Object.values(errors)[0] as any;
    const errorMessage = firstError?.message || 'Check required fields';
    toast.error('Validation Error', { 
      description: errorMessage,
      action: {
        label: 'Retry',
        onClick: () => logger.info('Retry clicked')
      }
    });
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <form onSubmit={handleSubmit(onSubmit, onError)} className="w-full max-w-6xl mx-auto space-y-4 pb-20 px-4">
        
        {/* 🚀 Top Action Bar: Type selection (Left) & Save Action (Right) */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
            {(['B2B', 'B2C_ECOM', 'B2C_EXPRESS'] as const).map((type) => (
              <button
                key={type}
                type="button"
                disabled={affiliation?.isIndividual && type === 'B2B'}
                onClick={() => setValue('order_type', type)}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${watch('order_type') === type ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
              >
                {t(`type_${type.toLowerCase()}`)}
              </button>
            ))}
          </div>

          <ZenButton 
            type="submit" 
            loading={isSubmitting}
            className="px-8 py-2 text-xs font-bold rounded-xl shadow-lg shadow-blue-500/10 border-2 border-blue-600/20"
          >
            <Save size={16} className="mr-2" /> {t('submit')}
          </ZenButton>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Basic & Consignee */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Header 섹션 (Compact) */}
            <ZenCard className="p-4 bg-slate-50/30 border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <Globe size={14} className="text-blue-500" /> {t('section_header')}
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-500">{t('shipper_label')}</label>
                    <ZenBadge variant={affiliation?.isIndividual ? "info" : "success"} className="text-[9px] py-0 px-1">
                      {affiliation ? (affiliation.isIndividual ? "개인 화주" : (affiliation.orgName || "법인 화주")) : "Checking..."}
                    </ZenBadge>
                  </div>
                  <select 
                    {...register('shipper_id')}
                    disabled={!!affiliation}
                    className="w-full bg-white border border-slate-200 text-sm px-3 py-2 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition-all mb-3"
                  >
                    {shippers.map(s => {
                      const displayName = (s.id === affiliation?.dummyIndividualId && affiliation?.isIndividual)
                        ? affiliation?.userName 
                        : (s.id === affiliation?.orgId && !affiliation?.isIndividual)
                          ? affiliation?.orgName
                          : s.name;
                      return <option key={s.id} value={s.id}>{displayName}</option>
                    })}
                  </select>

                  {/* 🏢 Detailed Shipper Information Card (New) */}
                  <div className="bg-white/60 border border-white rounded-2xl p-4 shadow-sm space-y-3">
                    {/* [v2] 화주 정보 중복 배지 제거 (상단으로 이동) */}
                    
                    <div className="flex flex-col gap-y-4 text-[11px]">
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-tighter mb-1">{t('contact_person')}</p>
                        <ZenInput 
                          placeholder="담당자명"
                          {...register('shipper_contact_name')}
                          className="bg-white/80 py-1.5 text-[11px]"
                        />
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-tighter mb-1">{t('shipper_contact')} (Phone)</p>
                        <ZenInput 
                          placeholder="010-XXXX-XXXX"
                          {...register('shipper_contact_phone')}
                          className="bg-white/80 py-1.5 text-[11px]"
                        />
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-tighter mb-1">E-mail (Reference)</p>
                        <ZenInput 
                          placeholder="example@email.com"
                          {...register('shipper_contact_email')}
                          className="bg-white/80 py-1.5 text-[11px]"
                        />
                      </div>
                      {!affiliation?.isIndividual && (
                        <>
                          <div>
                            <p className="text-slate-400 font-bold uppercase tracking-tighter mb-1">{t('shipper_address')}</p>
                            <ZenInput
                              readOnly
                              {...register('shipper_address')}
                              className="bg-slate-50 py-1.5 text-[11px] text-slate-700 font-semibold"
                            />
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase tracking-tighter mb-1">{t('shipper_biz_no')}</p>
                            <ZenInput
                              readOnly
                              {...register('shipper_biz_no')}
                              className="bg-slate-50 py-1.5 text-[11px] text-slate-700 font-semibold"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 🚢 Transport Mode Selection (Restored v2.1) */}
                  <div className="mt-4 mb-4">
                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Transport Mode</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { code: 'AIR', icon: Plane, label: '항공' },
                        { code: 'SEA', icon: Ship, label: '해상' },
                        { code: 'EXP', icon: Zap, label: '특송' },
                        { code: 'LAND', icon: Truck, label: '육상' }
                      ].map((mode) => (
                        <button
                          key={mode.code}
                          type="button"
                          onClick={() => setValue('transport_mode', mode.code as any)}
                          className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all ${watch('transport_mode') === mode.code ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                        >
                          <mode.icon size={14} className="mb-1" />
                          <span className="text-[9px] font-bold">{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                   {/* 🚢 Port Selection UI (Restored with Dynamic Filtering) */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('origin_port')}</label>
                      <select {...register('origin_port_id')} className="w-full bg-white border border-slate-200 text-xs px-2 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-50">
                        <option value="">{transportMode === 'AIR' || transportMode === 'EXP' ? 'Origin Airport' : 'Origin Port'}</option>
                        {filteredPorts.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('dest_port')}</label>
                      <select {...register('dest_port_id')} className="w-full bg-white border border-slate-200 text-xs px-2 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-50">
                        <option value="">{transportMode === 'AIR' || transportMode === 'EXP' ? 'Dest Airport' : 'Dest Port'}</option>
                        {filteredPorts.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* 📦 Special Cargo Selection UI (IMP-076) */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                      {t('special_cargo_label')}
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { code: 'NONE', label: t('special_cargo_none') },
                        { code: 'DANGEROUS', label: t('special_cargo_dangerous') },
                        { code: 'FROZEN', label: t('special_cargo_frozen') },
                        { code: 'VALUABLE', label: t('special_cargo_valuable') },
                        { code: 'USED', label: t('special_cargo_used') }
                      ].map((cargo) => (
                        <button
                          key={cargo.code}
                          type="button"
                          onClick={() => setValue('special_cargo_type', cargo.code as any)}
                          className={`py-2 rounded-xl border text-[10px] font-bold transition-all ${
                            watch('special_cargo_type') === cargo.code
                              ? 'bg-slate-800 border-slate-800 text-white shadow-md'
                              : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {cargo.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ZenCard>

            {/* 수취인 상세 정보 (Essential Consignee Info) */}
            <ZenCard className="p-4 border-blue-100 shadow-sm">
              <h4 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <User size={14} className="text-indigo-500" /> {t('section_recipient')}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Recipient Name</label>
                  <ZenInput placeholder="Full Name" {...register('recipient_name')} error={!!errors.recipient_name} className="py-2 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Phone</label>
                  <ZenInput placeholder="010-XXXX-XXXX" {...register('recipient_phone')} error={!!errors.recipient_phone} className="py-2 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">PCCC</label>
                    <ZenInput placeholder="P1234..." {...register('recipient_pccc')} className="py-2 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Zipcode</label>
                    <ZenInput placeholder="12345" {...register('recipient_zipcode')} className="py-2 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Full Address</label>
                  <textarea 
                    {...register('recipient_address')}
                    className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white resize-none h-16 outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Physical delivery address"
                  />
                  {errors.recipient_address && <p className="text-[9px] text-rose-500 mt-1">{errors.recipient_address.message}</p>}
                </div>
              </div>
            </ZenCard>
          </div>

          {/* Right Column: Packages & Items (Hierarchical) */}
          <div className="lg:col-span-8 space-y-4">
            <ZenCard className="p-5 border-emerald-100 min-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                  <Box size={16} className="text-emerald-500" /> 📦 패킹 및 품목 관리
                </h4>
                <ZenButton 
                  type="button" 
                  variant="glass" 
                  onClick={() => appendPackage({ packing_unit: 'BOX', packing_count: 1, gross_weight: 0, items: [{ item_name: '', quantity: 1, unit_price: 0, currency: 'USD', item_packing_unit: 'EA' }] })}
                  className="px-3 py-1 text-xs"
                >
                  <Plus size={14} /> 패키지 추가
                </ZenButton>
              </div>

              <div className="space-y-6">
                {packageFields.map((pkg, i) => (
                  <motion.div 
                    key={pkg.id} 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between absolute -top-3 left-4">
                      <ZenBadge variant="info" className="px-3 py-1 shadow-sm border border-white">PKG #{i + 1}</ZenBadge>
                    </div>

                    <div className="grid grid-cols-12 gap-2 mt-4 items-end">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">UNIT</label>
                        <select {...register(`packages.${i}.packing_unit`)} className="w-full text-[11px] h-9 bg-slate-50 border border-slate-100 rounded-lg px-2 outline-none focus:ring-1 focus:ring-blue-100">
                          <option value="BOX">BOX</option><option value="PLT">PLT</option><option value="CRT">CRT</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[9px] font-bold text-slate-400">COUNT</label>
                        <ZenInput type="number" {...register(`packages.${i}.packing_count`, { valueAsNumber: true })} className="py-2 text-xs" />
                      </div>
                      <div className="col-span-5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dimensions (L/W/H) <span className="text-[8px] text-slate-300 ml-1">cm</span></label>
                        <div className="grid grid-cols-3 gap-1 relative">
                          <div className="relative">
                            <ZenInput type="number" placeholder="L" {...register(`packages.${i}.length`, { valueAsNumber: true })} className="py-2 text-xs pr-4" />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 font-bold">L</span>
                          </div>
                          <div className="relative">
                            <ZenInput type="number" placeholder="W" {...register(`packages.${i}.width`, { valueAsNumber: true })} className="py-2 text-xs pr-4" />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 font-bold">W</span>
                          </div>
                          <div className="relative">
                            <ZenInput type="number" placeholder="H" {...register(`packages.${i}.height`, { valueAsNumber: true })} className="py-2 text-xs pr-4" />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 font-bold">H</span>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 ml-1">
                        <label className="text-[9px] font-bold text-slate-400">WEIGHT <span className="text-[8px] text-slate-300">kg</span></label>
                        <div className="relative">
                          <ZenInput type="number" step="0.01" {...register(`packages.${i}.gross_weight`, { valueAsNumber: true })} className="py-2 text-xs pr-6" />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-300 font-bold">kg</span>
                        </div>
                      </div>
                      <div className="col-span-1 flex items-center justify-end h-9">
                        <button 
                          type="button" 
                          onClick={() => removePackage(i)}
                          disabled={packageFields.length === 1}
                          className="p-2 text-rose-300 hover:text-rose-500 transition-colors disabled:opacity-0"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* 📦 Nested Items for this Package */}
                    <NestedItems 
                      nestIndex={i}
                      control={control}
                      register={register}
                      errors={errors}
                      t={t}
                    />
                  </motion.div>
                ))}
              </div>

              {/* 📊 Aggregated Stats (Live) */}
              <div className="mt-8 flex justify-between items-center px-6 py-4 bg-slate-900 rounded-3xl text-white shadow-2xl ring-1 ring-white/10">
                <span className="text-xs font-bold text-slate-500 tracking-widest">SHIPMENT SUMMARY</span>
                <div className="flex gap-10 items-center">
                  <div className="text-right">
                    <p className="text-[9px] text-slate-500 font-bold tracking-tight mb-0.5">TOTAL WEIGHT</p>
                    <p className="text-xl font-black">{totals.weight.toFixed(2)}<span className="text-[10px] text-slate-500 ml-1">KG</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-500 font-bold tracking-tight mb-0.5">TOTAL VOLUME</p>
                    <p className="text-xl font-black">{totals.volume.toFixed(4)}<span className="text-[10px] text-slate-500 ml-1">CBM</span></p>
                  </div>
                  <div className="text-right pl-10 border-l border-white/10">
                    <p className="text-[9px] text-indigo-400 font-bold tracking-tight mb-0.5 uppercase">Estimated Freight</p>
                    <p className="text-2xl font-black text-indigo-400 leading-none">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.freight)}
                    </p>
                  </div>
                </div>
              </div>
            </ZenCard>
            {/* 📝 Remarks / Special Instructions */}
            <ZenCard className="p-4 border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <AlertCircle size={14} className="text-slate-400" /> {t('description')}
              </h4>
              <textarea 
                {...register('description')}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white resize-none h-24 outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Ex) 배송 시 경비실에 맡겨주세요. / 특정 시간대 배송 요망 등"
              />
            </ZenCard>
          </div>
        </div>

      </form>
    </>
  );
};
