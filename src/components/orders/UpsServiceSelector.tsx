'use client';

import { useWatch, useFormContext } from 'react-hook-form';
import type { Control, UseFormRegister } from 'react-hook-form';

interface UpsServiceSelectorProps {
  control: Control<any>;
  register: UseFormRegister<any>;
}

const SERVICES = [
  { value: 'WW_EXPRESS',   label: 'WW Express',     desc: '가장 빠른 배송',     icon: '🚀' },
  { value: 'WW_SAVER',     label: 'Saver',           desc: '비용 절감형',        icon: '💰' },
  { value: 'WW_EXPEDITED', label: 'Expedited',       desc: '표준 익스프레스',    icon: '📦' },
  { value: 'WW_FLIGHT',    label: 'Freight',         desc: '대형/중량 화물',     icon: '✈️' },
];

export function UpsServiceSelector({ control, register }: UpsServiceSelectorProps) {
  const selected = useWatch({ control, name: 'ups_service_family' });

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">UPS Service</p>
      <div className="grid grid-cols-2 gap-3">
        {SERVICES.map((svc) => (
          <label
            key={svc.value}
            className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
              selected === svc.value
                ? 'border-brand-600 bg-brand-50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              value={svc.value}
              {...register('ups_service_family')}
              className="mt-1 accent-brand-600"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span>{svc.icon}</span>
                <span className="text-sm font-bold text-slate-800">{svc.label}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{svc.desc}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
