"use client";

import React, { useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast, Toaster } from 'sonner';
import { 
  Package, User, Globe, Plus, Trash2, Save, 
  ChevronRight, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { calculateSlabRate } from '@/lib/logistics/rate-engine';
import { ZenCard, ZenButton, ZenInput, ZenBadge } from '@/components/ui/ZenUI';
import { createOrder } from '@/app/actions/orders';
import { orderRegistrationSchema, OrderRegistrationInput } from '@/lib/validation/order';

interface OrderRegistrationFormProps {
  shippers: any[];
  ports: any[];
  onSuccess?: () => void;
}

export const OrderRegistrationForm: React.FC<OrderRegistrationFormProps> = ({
  shippers,
  ports,
  onSuccess
}) => {
  const t = useTranslations('Orders');
  const router = useRouter();

  // 1. Form Initialization with Zod
  const { 
    register, 
    control, 
    handleSubmit, 
    watch, 
    setValue,
    formState: { errors, isSubmitting } 
  } = useForm<OrderRegistrationInput>({
    resolver: zodResolver(orderRegistrationSchema),
    defaultValues: {
      order_type: 'B2B',
      items: [{ item_name: '', quantity: 1, unit_price: 0, weight: 0, volume: 0, currency: 'USD' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const orderType = watch('order_type');
  const items = watch('items');

  // 2. Real-time Aggregation
  const totalWeight = useMemo(() => 
    items?.reduce((acc, item) => acc + (Number(item.weight) || 0) * (Number(item.quantity) || 0), 0) || 0
  , [items]);

  const totalVolume = useMemo(() => 
    items?.reduce((acc, item) => acc + (Number(item.volume) || 0) * (Number(item.quantity) || 0), 0) || 0
  , [items]);

  // 2.1 Intelligent Rate Advisor
  const originPortId = watch('origin_port_id');
  const destPortId = watch('dest_port_id');

  useEffect(() => {
    if (originPortId && destPortId && totalWeight > 0) {
      const suggestedPrice = calculateSlabRate(totalWeight);
      if (items?.[0] && (items[0].unit_price === 0 || items[0].unit_price === null)) {
        setValue('items.0.unit_price', suggestedPrice);
        toast.info(`Intelligent Rate Applied: $${suggestedPrice}`, {
          description: `Based on total weight ${totalWeight}kg`
        });
      }
    }
  }, [totalWeight, originPortId, destPortId, setValue, items]);

  // 3. Submission Handler
  const onSubmit = async (data: OrderRegistrationInput) => {
    try {
      const result = await createOrder(data);
      toast.success(t('success_create'), {
        description: `Order No: ${result.order_no}`,
        icon: <CheckCircle2 className="text-emerald-500" />
      });
      
      if (onSuccess) onSuccess();
      
      // Redirect to Order Detail (Simulated)
      setTimeout(() => {
        router.push(`/orders/${result.id}`);
      }, 1500);

    } catch (err: any) {
      toast.error('Submission Failed', {
        description: err.message,
        icon: <AlertCircle className="text-rose-500" />
      });
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-5xl mx-auto space-y-8 pb-20">
        
        {/* 1. Order Type Selection */}
        <div className="flex justify-center gap-4 mb-10">
          {(['B2B', 'B2C_ECOM', 'B2C_EXPRESS'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setValue('order_type', type)}
              className={`
                relative px-8 py-4 rounded-2xl transition-all duration-500 overflow-hidden
                ${orderType === type 
                  ? 'text-white shadow-lg scale-105' 
                  : 'bg-white/40 text-slate-500 hover:bg-white/60'}
              `}
            >
              {orderType === type && (
                <motion.div 
                  layoutId="active-bg"
                  className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 font-bold tracking-tight">
                {t(`type_${type.toLowerCase()}`)}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12 space-y-8">
            
            {/* 2. Route & Shipper */}
            <ZenCard>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Globe size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">{t('section_header')}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-500 ml-1">{t('shipper_label')}</label>
                  <select 
                    {...register('shipper_id')}
                    className={`w-full bg-slate-50/50 backdrop-blur-sm border px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all ${errors.shipper_id ? 'border-rose-400 ring-rose-100' : 'border-white/20'}`}
                  >
                    <option value="">Select Shipper</option>
                    {shippers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {errors.shipper_id && <p className="text-xs text-rose-500 ml-1">{errors.shipper_id.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-500 ml-1">{t('origin_port')}</label>
                  <select 
                    {...register('origin_port_id')}
                    className={`w-full bg-slate-50/50 backdrop-blur-sm border px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all ${errors.origin_port_id ? 'border-rose-400 ring-rose-100' : 'border-white/20'}`}
                  >
                    <option value="">Select Port</option>
                    {ports.map(p => <option key={p.id} value={p.id}>[{p.port_code}] {p.port_name_ko}</option>)}
                  </select>
                  {errors.origin_port_id && <p className="text-xs text-rose-500 ml-1">{errors.origin_port_id.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-500 ml-1">{t('dest_port')}</label>
                  <select 
                    {...register('dest_port_id')}
                    className={`w-full bg-slate-50/50 backdrop-blur-sm border px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all ${errors.dest_port_id ? 'border-rose-400 ring-rose-100' : 'border-white/20'}`}
                  >
                    <option value="">Select Port</option>
                    {ports.map(p => <option key={p.id} value={p.id}>[{p.port_code}] {p.port_name_ko}</option>)}
                  </select>
                  {errors.dest_port_id && <p className="text-xs text-rose-500 ml-1">{errors.dest_port_id.message}</p>}
                </div>
              </div>
            </ZenCard>

            {/* 3. B2C Extra Info */}
            <AnimatePresence mode="wait">
              {orderType.startsWith('B2C') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <ZenCard className="border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <User size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">{t('section_recipient')}</h3>
                      <ZenBadge variant="info">B2C Required</ZenBadge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-500 ml-1">{t('recipient_pccc')}</label>
                        <ZenInput 
                          {...register('recipient_pccc')}
                          placeholder="P123456789012"
                          error={!!errors.recipient_pccc}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-500 ml-1">{t('recipient_contact')}</label>
                        <ZenInput 
                          {...register('recipient_contact')}
                          placeholder="010-1234-5678"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-500 ml-1">E-mail</label>
                        <ZenInput 
                          {...register('recipient_email')}
                          type="email"
                          placeholder="recipient@example.com"
                          error={!!errors.recipient_email}
                        />
                      </div>
                      <div className="md:col-span-2 lg:col-span-3 space-y-2">
                        <label className="text-sm font-semibold text-slate-500 ml-1">{t('delivery_notes')}</label>
                        <textarea 
                          {...register('delivery_notes')}
                          className="w-full bg-slate-50/50 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                          rows={3}
                        />
                      </div>
                    </div>
                  </ZenCard>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 4. Items Management */}
            <ZenCard>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <Package size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{t('section_items')}</h3>
                </div>
                <ZenButton 
                  type="button" 
                  variant="glass" 
                  onClick={() => append({ item_name: '', quantity: 1, unit_price: 0, weight: 0, volume: 0, currency: 'USD' })} 
                  className="py-2 px-4 text-sm scale-90"
                >
                  <Plus size={16} /> {t('add_item')}
                </ZenButton>
              </div>

              <div className="space-y-4">
                {fields.map((field, idx) => (
                  <motion.div 
                    key={field.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group relative grid grid-cols-1 md:grid-cols-6 gap-4 p-5 bg-white/30 rounded-2xl border border-white/10 hover:border-blue-200 transition-colors"
                  >
                    <div className="md:col-span-2">
                      <ZenInput 
                        placeholder={t('item_name')}
                        {...register(`items.${idx}.item_name`)}
                        error={!!errors.items?.[idx]?.item_name}
                      />
                    </div>
                    <div>
                      <ZenInput 
                        type="number"
                        placeholder={t('quantity')}
                        {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                        error={!!errors.items?.[idx]?.quantity}
                      />
                    </div>
                    <div>
                      <ZenInput 
                        type="number"
                        step="0.01"
                        placeholder={t('unit_price')}
                        {...register(`items.${idx}.unit_price`, { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <ZenInput 
                        type="number"
                        step="0.001"
                        placeholder={t('weight')}
                        {...register(`items.${idx}.weight`, { valueAsNumber: true })}
                        error={!!errors.items?.[idx]?.weight}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <ZenInput 
                        type="number"
                        step="0.0001"
                        placeholder={t('volume')}
                        {...register(`items.${idx}.volume`, { valueAsNumber: true })}
                        error={!!errors.items?.[idx]?.volume}
                      />
                      {fields.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => remove(idx)}
                          className="p-2 text-rose-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Aggregated Totals */}
              <div className="mt-8 flex justify-end gap-10 px-6 py-4 bg-slate-800/5 rounded-2xl">
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-400 uppercase">{t('weight')}</p>
                  <p className="text-lg font-bold text-slate-700">{totalWeight.toFixed(3)} kg</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-400 uppercase">{t('volume')}</p>
                  <p className="text-lg font-bold text-slate-700">{totalVolume.toFixed(4)} CBM</p>
                </div>
              </div>
            </ZenCard>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center pt-10">
          <ZenButton 
            type="submit" 
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-full max-w-xs py-5 text-lg shadow-2xl shadow-blue-500/20"
          >
            <Save size={20} /> {isSubmitting ? t('processing') : t('submit')}
          </ZenButton>
        </div>
      </form>
    </>
  );
};
