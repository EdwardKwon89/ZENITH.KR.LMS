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
  Package, Plus, Trash2, Save, 
  ChevronRight, AlertCircle, CheckCircle2, Box, Layers, Plane, Ship, Zap, Truck
} from 'lucide-react';
import { ZenCard, ZenButton, ZenInput, ZenBadge } from '@/components/ui/ZenUI';
import { createOrder } from '@/app/actions/orders';
import { getCurrentUserAffiliation } from '@/app/actions/master';
import { UpsFreightEstimateSection } from './UpsFreightEstimateSection';
import { USER_ROLES } from '@/lib/auth/rbac';
import { orderRegistrationSchema, OrderRegistrationInput } from '@/lib/validation/order';
import { estimateFreightCost, TransportMode } from '@/utils/logistics/freight-calculator';
import { getAvailableServiceRates, getUsdKrwRate, getBaseCurrency, AvailableServiceRates } from '@/app/actions/operations/service-rates';
import { createOrderServices } from '@/app/actions/operations/order-services';
import AddressBookSelector from '@/components/address-book/AddressBookSelector';
import { AddressInput } from '@/components/common/AddressInput';

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
            <div className="col-span-3">
              <ZenInput 
                placeholder={t('item_name')}
                {...register(`packages.${nestIndex}.items.${k}.item_name`)}
                className="bg-white py-2 text-xs"
              />
            </div>
            <div className="col-span-1">
              <ZenInput 
                type="number"
                placeholder="Qty"
                {...register(`packages.${nestIndex}.items.${k}.quantity`, { valueAsNumber: true })}
                className="bg-white py-2 text-xs"
              />
            </div>
            <div className="col-span-2">
              <ZenInput
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.0000"
                {...register(`packages.${nestIndex}.items.${k}.unit_price`, { valueAsNumber: true })}
                className="bg-white py-2 text-xs"
              />
            </div>
            <div className="col-span-1">
              <select
                {...register(`packages.${nestIndex}.items.${k}.currency`)}
                className="w-full text-xs h-9 bg-white border border-slate-200 rounded-lg"
              >
                <option value="USD">USD</option>
                <option value="KRW">KRW</option>
                <option value="EUR">EUR</option>
                <option value="JPY">JPY</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
            <div className="col-span-3">
              <ZenInput 
                placeholder="HS Code"
                {...register(`packages.${nestIndex}.items.${k}.hs_code`)}
                className="bg-white py-2 text-xs"
              />
            </div>
            <div className="col-span-1">
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
    trigger,
    formState: { errors, isSubmitting } 
  } = useForm<OrderRegistrationInput>({
    resolver: zodResolver(orderRegistrationSchema) as any,
    defaultValues: {
      order_type: 'B2B',
      transport_mode: 'AIR',
      delivery_method: 'DIRECT',
      packages: [{ 
        packing_unit: 'BOX', 
        packing_count: 1, 
        gross_weight: 0,
        special_cargo_type: 'NONE',
        items: [{ item_name: '', quantity: 1, unit_price: 0, currency: 'USD', item_packing_unit: 'EA' }] 
      }]
    }
  });

  const isAgencyShipper = affiliation?.role === USER_ROLES.AGENCY_SHIPPER;
  const destPort = ports.find((p) => p.id === watch('dest_port_id'));

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [selectedCombination, setSelectedCombination] = React.useState<string>('');
  const [availableRates, setAvailableRates] = React.useState<AvailableServiceRates | null>(null);
  const [ratesLoading, setRatesLoading] = React.useState(false);
  const [ratesError, setRatesError] = React.useState<string | null>(null);
  const [selectedRates, setSelectedRates] = React.useState<Record<string, any>>({});
  const [usdKrwRate, setUsdKrwRate] = React.useState<number>(1350);
  const [baseCurrency, setBaseCurrency] = React.useState<string>('KRW');
  const [infoTab, setInfoTab] = React.useState<'shipper' | 'consignee'>('shipper');

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
          const matchedShipper = shippers.find((s: any) => s.id === data.orgId);
          setValue('order_type', 'B2B');
          setValue('shipper_id', data.orgId as string);
          setValue('shipper_contact_name', data.userName);
          setValue('shipper_contact_email', data.userEmail);
          setValue('shipper_contact_phone', data.userPhone || '');
          setValue('shipper_address', matchedShipper?.address || data.orgAddress || '');
          setValue('shipper_biz_no', matchedShipper?.biz_no || data.orgBizNo || '');
          setValue('shipper_country_code', data.orgCountryCode || 'KR');
          setValue('shipper_state_province', data.orgStateProvince || '');
          setValue('shipper_city', data.orgCity || '');
          setValue('shipper_address_detail', data.orgAddressDetail || '');
          setValue('shipper_zipcode', data.orgZipcode || '');
        }
      } catch (err) { logger.error(err); } finally { setIsLoadingAffiliation(false); }
    }
    loadAffiliation();
  }, [setValue, shippers]);

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

  // 🔄 Transport Mode 변경 시 서비스 조합 선택 초기화
  useEffect(() => {
    setSelectedCombination('');
  }, [transportMode]);

  // 🔄 DOC content_type 선택 시 치수 초기화 (TASK-B-076)
  useEffect(() => {
    if (!watchedPackages) return;
    watchedPackages.forEach((pkg, i) => {
      if (pkg.content_type === 'DOC') {
        setValue(`packages.${i}.length`, undefined);
        setValue(`packages.${i}.width`, undefined);
        setValue(`packages.${i}.height`, undefined);
      }
    });
  }, [watchedPackages, setValue]);

  const filteredPorts = useMemo(() => {
    if (!transportMode) return ports;
    const mappedType = transportMode === 'EXP' ? 'AIR' : transportMode;
    return ports.filter(p => p.type === mappedType);
  }, [ports, transportMode]);

  const availableCombinations = useMemo(() => {
    const isSea = transportMode === 'SEA';
    if (isSea) {
      return [
        {
          code: 'SEA_ONLY',
          label: '해운 운송만',
          desc: '해상 운송만 이용합니다. (통관/배송 직접 처리)',
          mode: 'SEA',
          services: ['TRANSPORT (SEA)']
        },
        {
          code: 'SEA_CUSTOMS',
          label: '해운 + 통관',
          desc: '해상 운송과 도착국가 통관 서비스를 포함합니다.',
          mode: 'SEA',
          services: ['TRANSPORT (SEA)', 'CUSTOMS']
        },
        {
          code: 'SEA_CUSTOMS_LOCAL',
          label: '해운 + 통관 + 배송(Local)',
          desc: '해상 운송, 통관, 목적지 인근 현지 배송을 함께 이용합니다.',
          mode: 'SEA',
          services: ['TRANSPORT (SEA)', 'CUSTOMS', 'DELIVERY_LOCAL']
        },
        {
          code: 'DELIVERY_TOTAL',
          label: '배송(Total) — All-in',
          desc: '출발지부터 도착지까지 전 구간 배송(Total)만 일괄 이용합니다.',
          mode: 'SEA',
          services: ['DELIVERY_TOTAL']
        }
      ];
    } else {
      return [
        {
          code: 'AIR_ONLY',
          label: '항공 운송만',
          desc: '항공편을 통한 운송만 이용합니다. (통관/배송 직접 처리)',
          mode: 'AIR',
          services: ['TRANSPORT (AIR)']
        },
        {
          code: 'AIR_CUSTOMS',
          label: '항공 + 통관',
          desc: '항공 운송과 도착국가 통관 서비스를 포함합니다.',
          mode: 'AIR',
          services: ['TRANSPORT (AIR)', 'CUSTOMS']
        },
        {
          code: 'AIR_LOCAL',
          label: '항공 + 배송(Local)',
          desc: '항공 운송과 목적지 인근 현지 배송을 함께 이용합니다.',
          mode: 'AIR',
          services: ['TRANSPORT (AIR)', 'DELIVERY_LOCAL']
        },
        {
          code: 'AIR_CUSTOMS_LOCAL',
          label: '항공 + 통관 + 배송(Local)',
          desc: '항공 운송, 통관 및 목적지 인근 현지 배송을 모두 이용합니다.',
          mode: 'AIR',
          services: ['TRANSPORT (AIR)', 'CUSTOMS', 'DELIVERY_LOCAL']
        },
        {
          code: 'DELIVERY_TOTAL',
          label: '배송(Total) — All-in',
          desc: '출발지부터 도착지까지 전 구간 배송(Total)만 일괄 이용합니다.',
          mode: 'AIR',
          services: ['DELIVERY_TOTAL']
        }
      ];
    }
  }, [transportMode]);

  const requiredServices = useMemo(() => {
    if (!selectedCombination) return [];
    switch (selectedCombination) {
      case 'AIR_ONLY':
        return [{ key: 'transport', type: 'TRANSPORT', label: '항공 운송' }];
      case 'AIR_CUSTOMS':
        return [
          { key: 'transport', type: 'TRANSPORT', label: '항공 운송' },
          { key: 'customs', type: 'CUSTOMS', label: '통관 서비스' }
        ];
      case 'AIR_LOCAL':
        return [
          { key: 'transport', type: 'TRANSPORT', label: '항공 운송' },
          { key: 'deliveryLocal', type: 'DELIVERY_LOCAL', label: '현지 배송 (Local)' }
        ];
      case 'AIR_CUSTOMS_LOCAL':
        return [
          { key: 'transport', type: 'TRANSPORT', label: '항공 운송' },
          { key: 'customs', type: 'CUSTOMS', label: '통관 서비스' },
          { key: 'deliveryLocal', type: 'DELIVERY_LOCAL', label: '현지 배송 (Local)' }
        ];
      case 'DELIVERY_TOTAL':
        return [{ key: 'deliveryTotal', type: 'DELIVERY_TOTAL', label: '전체 배송 (Total)' }];
      case 'SEA_ONLY':
        return [{ key: 'transport', type: 'TRANSPORT', label: '해상 운송' }];
      case 'SEA_CUSTOMS':
        return [
          { key: 'transport', type: 'TRANSPORT', label: '해상 운송' },
          { key: 'customs', type: 'CUSTOMS', label: '통관 서비스' }
        ];
      case 'SEA_CUSTOMS_LOCAL':
        return [
          { key: 'transport', type: 'TRANSPORT', label: '해상 운송' },
          { key: 'customs', type: 'CUSTOMS', label: '통관 서비스' },
          { key: 'deliveryLocal', type: 'DELIVERY_LOCAL', label: '현지 배송 (Local)' }
        ];
      default:
        return [];
    }
  }, [selectedCombination]);

  const handleNextToStep2 = async () => {
    const isStep1Valid = await trigger([
      'shipper_id',
      'origin_port_id',
      'dest_port_id',
      'transport_mode',
      'recipient_name',
      'recipient_address',
      'recipient_phone',
    ]);
    if (isStep1Valid) {
      setStep(2);
    } else {
      toast.error("필수 입력 값을 확인해주세요.");
    }
  };

  const handleGoToStep3 = async () => {
    if (!selectedCombination) {
      toast.error("서비스 조합을 선택해주세요.");
      return;
    }

    setRatesLoading(true);
    setRatesError(null);
    try {
      const originPortId = watch('origin_port_id');
      const destPortId = watch('dest_port_id');

      const originPort = ports.find(p => p.id === originPortId);
      const destPort = ports.find(p => p.id === destPortId);

      if (!originPort || !destPort) {
        throw new Error("출발지/도착지 항구를 올바르게 선택해야 합니다.");
      }

      const mode = watch('transport_mode');
      const mappedMode = mode === 'SEA' ? 'SEA' : 'AIR';

      const [result, fetchedRate, fetchedBase] = await Promise.all([
        getAvailableServiceRates({
          originCode: originPort.code,
          destCode: destPort.code,
          destCountryCode: destPort.country_code || 'US',
          transportMode: mappedMode,
          cargoWeight: totals.weight,
          cargoCbm: totals.volume
        }),
        getUsdKrwRate(),
        getBaseCurrency(),
      ]);

      setUsdKrwRate(fetchedRate);
      setBaseCurrency(fetchedBase);

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.data) {
        throw new Error("요율 정보가 비어 있습니다.");
      }

      setAvailableRates(result.data);

      const initialSelected: Record<string, any> = {};
      requiredServices.forEach(service => {
        const rates = result.data![service.key as keyof AvailableServiceRates] || [];
        if (rates.length > 0) {
          initialSelected[service.key] = rates[0];
        }
      });
      setSelectedRates(initialSelected);
      setStep(3);
    } catch (err: any) {
      logger.error("Failed to fetch service rates:", err);
      if (err.message?.includes("등록된 비용 정보가 없습니다")) {
        setAvailableRates({ transport: [], customs: [], deliveryLocal: [], deliveryTotal: [] });
        setSelectedRates({});
        setStep(3);
      } else {
        setRatesError(err.message || "요율 정보를 불러오는 데 실패했습니다.");
        toast.error("요율 조회 실패", { description: err.message });
      }
    } finally {
      setRatesLoading(false);
    }
  };

  const hasZeroRatesForRequiredService = useMemo(() => {
    if (!availableRates || !selectedCombination) return false;
    return requiredServices.some(service => {
      const rates = availableRates[service.key as keyof AvailableServiceRates];
      return !rates || rates.length === 0;
    });
  }, [availableRates, selectedCombination, requiredServices]);

  const isAllRatesSelected = useMemo(() => {
    return requiredServices.every(service => !!selectedRates[service.key]);
  }, [requiredServices, selectedRates]);

  const onSubmit = async (data: any) => {
    try {
      if (hasZeroRatesForRequiredService || !isAllRatesSelected) {
        throw new Error("선택하신 서비스 중 일부 서비스에 등록된 비용 정보가 없거나 요율을 선택하지 않았습니다.");
      }

      const finalData = {
        ...data,
        estimated_cost: totals.freight
      };
      
      const orderResult = await createOrder(finalData as OrderRegistrationInput);
      console.log('E2E_ORDER_RESULT:', orderResult);
      if (!orderResult || typeof orderResult === 'string') throw new Error('Order creation failed');
      const r = orderResult as { id: string; order_no: string };
      
      const selectedServicesMapped = requiredServices.map(service => {
        const selected = selectedRates[service.key];
        return {
          service_type: service.type,
          provider_id: selected.orgId || selected.carrierId,
          rate_card_id: service.key === 'transport' ? selected.id : null,
          customs_rate_id: service.key === 'customs' ? selected.id : null,
          delivery_rate_id: (service.key === 'deliveryLocal' || service.key === 'deliveryTotal') ? selected.id : null,
          quoted_cost: selected.estimatedCost,
          currency: selected.currency || 'USD'
        };
      });

      const serviceResult = await createOrderServices(r.id, selectedServicesMapped);
      if (serviceResult.error) {
        throw new Error(`Order services creation failed: ${serviceResult.error}`);
      }

      toast.success(t('success_create'), { 
        description: `Order No: ${r.order_no}`,
        icon: <CheckCircle2 className="text-green-500" />
      });
      if (onSuccess) onSuccess();
      setTimeout(() => router.push(`/orders/${r.id}`), 1000);
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
      
      {/* 🔮 Step Indicator Bar */}
      <div className="w-full max-w-6xl mx-auto mb-8 px-4">
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          {[
            { number: 1, title: "화물/오더 정보", desc: "화물 및 수취인 정보 입력" },
            { number: 2, title: "서비스 선택", desc: "배송 서비스 조합 선택" },
            { number: 3, title: "요율 및 제출", desc: "제공사 요율 확인 및 제출" }
          ].map((s) => {
            const isActive = step === s.number;
            const isCompleted = step > s.number;
            return (
              <div key={s.number} className="flex items-center gap-3 flex-1 last:flex-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {isCompleted ? <CheckCircle2 size={16} /> : s.number}
                </div>
                <div className="hidden sm:block">
                  <p className={`text-xs font-bold ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>{s.title}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{s.desc}</p>
                </div>
                {s.number < 3 && (
                  <div className={`h-[2px] flex-1 mx-4 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)} className="w-full max-w-6xl mx-auto space-y-4 pb-20 px-4">
        
        {/* 🚀 Top Action Bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
            {step === 1 && [ 
              { code: 'AIR', icon: Plane, label: '항공' },
              { code: 'SEA', icon: Ship, label: '해상' },
              { code: 'EXP', icon: Zap, label: 'UPS Direct' },
              { code: 'LAND', icon: Truck, label: '육상' }
            ].map((mode) => (
              <button
                key={mode.code}
                type="button"
                onClick={() => setValue('transport_mode', mode.code as any)}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all ${watch('transport_mode') === mode.code ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
              >
                <mode.icon size={14} /> {mode.label}
              </button>
            ))}
            {step > 1 && (
              <ZenButton
                type="button"
                variant="glass"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-6 py-2 text-xs font-bold rounded-xl"
              >
                이전 단계
              </ZenButton>
            )}
          </div>

          <div>
            {step === 1 && (
              <ZenButton
                type="button"
                onClick={handleNextToStep2}
                className="px-8 py-2 text-xs font-bold rounded-xl"
              >
                다음 단계 (서비스 선택) <ChevronRight size={14} className="ml-1 inline" />
              </ZenButton>
            )}
            {step === 2 && (
              <ZenButton
                type="button"
                onClick={handleGoToStep3}
                loading={ratesLoading}
                className="px-8 py-2 text-xs font-bold rounded-xl"
              >
                다음 단계 (요율 확인) <ChevronRight size={14} className="ml-1 inline" />
              </ZenButton>
            )}
            {step === 3 && (
              <ZenButton
                type="submit"
                loading={isSubmitting}
                disabled={hasZeroRatesForRequiredService || !isAllRatesSelected}
                className="px-8 py-2 text-xs font-bold rounded-xl"
              >
                <Save size={16} className="mr-2 inline" /> {t('submit')}
              </ZenButton>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4"
            >
              {/* Left Column: Basic & Consignee (Tabbed) */}
              <div className="lg:col-span-4 space-y-4">
                <ZenCard className="p-4 bg-slate-50/30 border-slate-200">
                  <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => setInfoTab('shipper')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${infoTab === 'shipper' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      기본정보(화주 정보)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInfoTab('consignee')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${infoTab === 'consignee' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      수하인 정보
                    </button>
                  </div>

                  {infoTab === 'shipper' && (
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

                        <div className="bg-white/60 border border-white rounded-2xl p-4 shadow-sm space-y-3">
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
                                  <AddressInput
                                    mode="rhf"
                                    prefix="shipper"
                                    register={register}
                                    t={t}
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
                      </div>
                    </div>
                  )}

                  {infoTab === 'consignee' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">Address Book</label>
                        <AddressBookSelector
                          onSelect={(entry) => {
                            setValue('recipient_name', entry.recipient_name);
                            setValue('recipient_address', entry.recipient_address);
                            setValue('recipient_address_local', entry.recipient_address_local || '');
                            setValue('recipient_phone', entry.recipient_phone || '');
                          }}
                        />
                      </div>
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
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">Local Address</label>
                        <textarea 
                          {...register('recipient_address_local')}
                          className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white resize-none h-16 outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="현지어 주소 (선택)"
                        />
                      </div>
                    </div>
                  )}
                </ZenCard>

                {/* 🚢 Port Selection */}
                <ZenCard className="p-3 border-slate-200">
                  <h4 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">{t('origin_port')} / {t('dest_port')}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <select {...register('origin_port_id')} className="w-full bg-white border border-slate-200 text-xs px-2 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-50">
                      <option value="">{transportMode === 'AIR' || transportMode === 'EXP' ? 'Origin Airport' : 'Origin Port'}</option>
                      {filteredPorts.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                    </select>
                    <select {...register('dest_port_id')} className="w-full bg-white border border-slate-200 text-xs px-2 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-50">
                      <option value="">{transportMode === 'AIR' || transportMode === 'EXP' ? 'Dest Airport' : 'Dest Port'}</option>
                      {filteredPorts.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                    </select>
                  </div>
                </ZenCard>

                {/* 🚚 Delivery Method & Pickup Details (IMP-118) */}
                <ZenCard className="p-3 border-slate-200 mt-3">
                  <h4 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                    {t('delivery_method_label')}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setValue('delivery_method', 'DIRECT')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        watch('delivery_method') === 'DIRECT' || !watch('delivery_method')
                          ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t('delivery_method_direct')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('delivery_method', 'PICKUP')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        watch('delivery_method') === 'PICKUP'
                          ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t('delivery_method_pickup')}
                    </button>
                  </div>

                  {watch('delivery_method') === 'PICKUP' && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">
                          {t('pickup_location')} <span className="text-rose-500">*</span>
                        </label>
                        <ZenInput
                          placeholder="픽업 장소 입력"
                          {...register('pickup_location')}
                          error={!!errors.pickup_location}
                          className="py-2 text-xs"
                        />
                        {errors.pickup_location && (
                          <p className="text-[9px] text-rose-500 mt-1">
                            {errors.pickup_location.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">
                          {t('pickup_contact_name')} <span className="text-rose-500">*</span>
                        </label>
                        <ZenInput
                          placeholder="담당자 이름 입력"
                          {...register('pickup_contact_name')}
                          error={!!errors.pickup_contact_name}
                          className="py-2 text-xs"
                        />
                        {errors.pickup_contact_name && (
                          <p className="text-[9px] text-rose-500 mt-1">
                            {errors.pickup_contact_name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block">
                          {t('pickup_contact_tel')} <span className="text-rose-500">*</span>
                        </label>
                        <ZenInput
                          placeholder="연락처 입력 (010-XXXX-XXXX)"
                          {...register('pickup_contact_tel')}
                          error={!!errors.pickup_contact_tel}
                          className="py-2 text-xs"
                        />
                        {errors.pickup_contact_tel && (
                          <p className="text-[9px] text-rose-500 mt-1">
                            {errors.pickup_contact_tel.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
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
                      onClick={() => appendPackage({ packing_unit: 'BOX', packing_count: 1, gross_weight: 0, special_cargo_type: 'NONE', items: [{ item_name: '', quantity: 1, unit_price: 0, currency: 'USD', item_packing_unit: 'EA' }] })}
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
                        <button
                          type="button"
                          onClick={() => removePackage(i)}
                          disabled={packageFields.length === 1}
                          className="absolute top-2 right-2 p-1.5 text-rose-300 hover:text-rose-500 transition-colors disabled:opacity-0"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="grid grid-cols-12 gap-2 mt-4 items-end">
                          <div className="col-span-1 space-y-1">
                            <label className="text-[9px] font-bold text-slate-400">UNIT</label>
                            <select {...register(`packages.${i}.packing_unit`)} className="w-full text-[11px] h-9 bg-slate-50 border border-slate-100 rounded-lg px-1 outline-none focus:ring-1 focus:ring-blue-100">
                              <option value="BOX">BOX</option><option value="PLT">PLT</option><option value="CRT">CRT</option>
                            </select>
                          </div>
                          <div className="col-span-1">
                            <label className="text-[9px] font-bold text-slate-400">COUNT</label>
                            <ZenInput type="number" {...register(`packages.${i}.packing_count`, { valueAsNumber: true })} className="py-2 text-xs" />
                          </div>
                          {transportMode === 'EXP' && (
                            <div className="col-span-2">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">CONTENT</label>
                              <select
                                {...register(`packages.${i}.content_type`)}
                                className="w-full text-[11px] h-9 bg-slate-50 border border-slate-100 rounded-lg px-2 outline-none focus:ring-1 focus:ring-blue-100"
                              >
                                <option value="NONDOC">NONDOC</option>
                                <option value="DOC">DOC</option>
                              </select>
                            </div>
                          )}
                          <div className={`${transportMode === 'EXP' ? 'col-span-4' : 'col-span-5'}`}>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dimensions (L/W/H) <span className="text-[8px] text-slate-300 ml-1">cm</span></label>
                            <div className="grid grid-cols-3 gap-1 relative">
                              {(() => {
                                const isDoc = watch(`packages.${i}.content_type`) === 'DOC';
                                return (
                                  <>
                                    <div className="relative">
                                      <ZenInput type="number" placeholder="L" disabled={isDoc} {...register(`packages.${i}.length`, { valueAsNumber: true })} className={`py-2 text-xs pr-4 ${isDoc ? 'opacity-40 bg-slate-100' : ''}`} />
                                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 font-bold">L</span>
                                    </div>
                                    <div className="relative">
                                      <ZenInput type="number" placeholder="W" disabled={isDoc} {...register(`packages.${i}.width`, { valueAsNumber: true })} className={`py-2 text-xs pr-4 ${isDoc ? 'opacity-40 bg-slate-100' : ''}`} />
                                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 font-bold">W</span>
                                    </div>
                                    <div className="relative">
                                      <ZenInput type="number" placeholder="H" disabled={isDoc} {...register(`packages.${i}.height`, { valueAsNumber: true })} className={`py-2 text-xs pr-4 ${isDoc ? 'opacity-40 bg-slate-100' : ''}`} />
                                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 font-bold">H</span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          <div className={`${transportMode === 'EXP' ? 'col-span-2' : 'col-span-2'} ml-1`}>
                            <label className="text-[9px] font-bold text-slate-400">WEIGHT <span className="text-[8px] text-slate-300">kg</span></label>
                            <div className="relative">
                              <ZenInput type="number" step="0.01" {...register(`packages.${i}.gross_weight`, { valueAsNumber: true })} className="py-2 text-xs pr-6" />
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-300 font-bold">kg</span>
                            </div>
                          </div>
                          <div className={`${transportMode === 'EXP' ? 'col-span-2' : 'col-span-2'}`}>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">화물 구분</label>
                            <select
                              {...register(`packages.${i}.special_cargo_type`)}
                              className="w-full text-[11px] h-9 bg-slate-50 border border-slate-100 rounded-lg px-2 outline-none focus:ring-1 focus:ring-blue-100"
                            >
                              <option value="NONE">일반</option>
                              <option value="DANGEROUS">위험물</option>
                              <option value="FROZEN">냉동/냉장</option>
                              <option value="VALUABLE">고가품</option>
                              <option value="USED">중고품</option>
                            </select>
                          </div>
                        </div>

                        {/* 📦 Local Tracking No */}
                        <div className="grid grid-cols-12 gap-2 mt-2 items-end">
                          <div className="col-span-4">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              LOCAL TRACKING NO <span className="text-[8px] text-slate-300">(지역택배 운송장)</span>
                            </label>
                            <ZenInput
                              placeholder="지역 택배 운송장번호 입력 (선택)"
                              {...register(`packages.${i}.domestic_ref_no`)}
                              className="py-2 text-xs"
                            />
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
                    </div>
                  </div>
                </ZenCard>

                {/* 🚚 UPS Freight Estimate (AGENCY_SHIPPER only) */}
                {isAgencyShipper && (
                  <ZenCard className="p-4 border-blue-100">
                    <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Truck size={14} className="text-blue-500" /> UPS 견적
                    </h4>
                    <UpsFreightEstimateSection
                      shipperOrgId={affiliation?.orgId ?? null}
                      destCountryCode={destPort?.country_code}
                      packages={watchedPackages || []}
                      selectedProductId={watch('ups_product_code')}
                      selectedIncoterms={watch('incoterms')}
                      onProductChange={(id) => setValue('ups_product_code', id)}
                      onIncotermsChange={(value) => setValue('incoterms', value)}
                    />
                  </ZenCard>
                )}

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
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <ZenCard className="p-6">
                <h3 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
                  <Layers size={18} className="text-blue-500" /> 배송 서비스 조합 선택
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  화물의 운송 모드({transportMode === 'SEA' ? '해상' : transportMode === 'AIR' ? '항공' : transportMode === 'EXP' ? '특송' : '육상'})에 따라 제공되는 서비스 조합 중 원하시는 방식을 선택해주세요.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableCombinations.map((combo) => {
                    const isSelected = selectedCombination === combo.code;
                    return (
                      <button
                        key={combo.code}
                        type="button"
                        onClick={() => setSelectedCombination(combo.code)}
                        className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between h-40 ${isSelected ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-100 shadow-md' : 'bg-white border-slate-200 hover:bg-slate-50/50'}`}
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-slate-800">{combo.label}</span>
                            <ZenBadge variant={isSelected ? "success" : "info"} className="text-[10px]">
                              {combo.mode}
                            </ZenBadge>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{combo.desc}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {combo.services.map((svc, idx) => (
                            <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                              {svc}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ZenCard>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Warning Banner if 0 rates for any required service */}
              {hasZeroRatesForRequiredService && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800 shadow-sm">
                  <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-sm font-bold mb-1">이용 불가 서비스 감지</h4>
                    <p className="text-xs text-rose-600">
                      선택하신 서비스 조합의 일부 서비스에 등록된 비용 정보가 없습니다. 다른 서비스 조합을 선택하거나 플랫폼 운영자에게 요율 정보 추가를 문의하세요.
                    </p>
                  </div>
                </div>
              )}

              {/* Show Rates error if any */}
              {ratesError && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800">
                  <p className="text-xs">{ratesError}</p>
                </div>
              )}

              {/* Required Services and Rate Selection */}
              <div className="space-y-4">
                {requiredServices.map((service) => {
                  const rates = availableRates?.[service.key as keyof AvailableServiceRates] || [];
                  const selected = selectedRates[service.key];

                  return (
                    <ZenCard key={service.key} className="p-5">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                        <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                          <CheckCircle2 size={16} className={rates.length > 0 ? "text-emerald-500" : "text-slate-300"} />
                          {service.label}
                        </h4>
                        <ZenBadge variant={rates.length > 0 ? "success" : "danger"} className="text-[10px]">
                          {rates.length > 0 ? `${rates.length}개 요율 사용 가능` : "사용 가능 요율 없음"}
                        </ZenBadge>
                      </div>

                      {rates.length === 0 ? (
                        <div className="p-6 bg-slate-50 rounded-2xl text-center text-rose-500 text-xs font-bold border border-rose-100">
                          해당 서비스에 등록된 비용 정보가 없습니다.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                <th className="pb-3 w-10">선택</th>
                                <th className="pb-3">제공사명</th>
                                <th className="pb-3 text-right">예상 비용</th>
                                <th className="pb-3 text-right">소요일</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                              {rates.map((rate: any) => {
                                const isRateSelected = selected?.id === rate.id;
                                return (
                                  <tr
                                    key={rate.id}
                                    onClick={() => setSelectedRates(prev => ({ ...prev, [service.key]: rate }))}
                                    className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isRateSelected ? 'bg-blue-50/30' : ''}`}
                                  >
                                    <td className="py-3">
                                      <input
                                        type="radio"
                                        name={service.key}
                                        checked={isRateSelected}
                                        onChange={() => {}} // handled by row onClick
                                        className="text-blue-600 focus:ring-blue-500"
                                      />
                                    </td>
                                    <td className="py-3 font-bold">{rate.orgName || rate.carrierName}</td>
                                    <td className="py-3 text-right font-black text-blue-600">
                                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: rate.currency || 'USD' }).format(rate.estimatedCost)}
                                    </td>
                                    <td className="py-3 text-right text-slate-500">
                                      {rate.transitDays ? `${rate.transitDays}일` : '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </ZenCard>
                  );
                })}
              </div>

              {/* Order Services Total Summary */}
              {!hasZeroRatesForRequiredService && isAllRatesSelected && (() => {
                const toBase = (amount: number, currency: string): number => {
                  const from = currency.toUpperCase();
                  const to = baseCurrency;
                  if (from === to) return amount;
                  if (to === 'KRW' && from === 'USD') return amount * usdKrwRate;
                  if (to === 'USD' && from === 'KRW') return amount / usdKrwRate;
                  return amount;
                };

                const totalBase = requiredServices.reduce((sum, service) => {
                  const rate = selectedRates[service.key];
                  if (!rate) return sum;
                  return sum + toBase(rate.estimatedCost || 0, rate.currency || 'USD');
                }, 0);

                const hasMixed = requiredServices.some(
                  s => (selectedRates[s.key]?.currency || 'USD').toUpperCase() !== baseCurrency
                );

                const breakdown = requiredServices
                  .map(service => {
                    const rate = selectedRates[service.key];
                    if (!rate) return null;
                    const cur = (rate.currency || 'USD').toUpperCase();
                    const formatted = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: cur }).format(rate.estimatedCost || 0);
                    return `${service.label}: ${formatted}`;
                  })
                  .filter(Boolean);

                const rateLabel = baseCurrency === 'KRW'
                  ? `USD 1 = ₩${usdKrwRate.toLocaleString('ko-KR')}`
                  : `₩1 = $${(1 / usdKrwRate).toFixed(6)}`;

                return (
                  <div className="mt-8 px-6 py-4 bg-slate-900 rounded-3xl text-white shadow-2xl ring-1 ring-white/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-slate-500 tracking-widest text-indigo-400">TOTAL ESTIMATED SERVICES COST</span>
                        {hasMixed && (
                          <p className="text-[10px] text-amber-400 mt-1">환율 적용: {rateLabel}</p>
                        )}
                      </div>
                      <p className="text-2xl font-black text-indigo-400 leading-none">
                        {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: baseCurrency }).format(totalBase)}
                      </p>
                    </div>
                    {hasMixed && breakdown.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-slate-700 flex gap-4 flex-wrap">
                        {breakdown.map((line, idx) => (
                          <span key={idx} className="text-[10px] text-slate-500">{line}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation Buttons */}
        <div className="flex justify-between items-center pt-8 border-t border-slate-100">
          <div>
            {step > 1 && (
              <ZenButton
                type="button"
                variant="glass"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-6 py-2 text-xs font-bold rounded-xl"
              >
                이전 단계
              </ZenButton>
            )}
          </div>
          <div>
            {step === 1 && (
              <ZenButton
                type="button"
                onClick={handleNextToStep2}
                className="px-8 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
              >
                다음 단계 (서비스 선택) <ChevronRight size={14} className="ml-1 inline" />
              </ZenButton>
            )}
            {step === 2 && (
              <ZenButton
                type="button"
                onClick={handleGoToStep3}
                loading={ratesLoading}
                className="px-8 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
              >
                다음 단계 (요율 확인) <ChevronRight size={14} className="ml-1 inline" />
              </ZenButton>
            )}
            {step === 3 && (
              <ZenButton
                type="submit"
                loading={isSubmitting}
                disabled={hasZeroRatesForRequiredService || !isAllRatesSelected}
                className="px-8 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <Save size={16} className="mr-2 inline" /> {t('submit')}
              </ZenButton>
            )}
          </div>
        </div>
      </form>
    </>
  );
};
