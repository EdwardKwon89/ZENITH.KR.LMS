'use client';

import { useState } from 'react';

interface RequiredFieldsProps {
  t: (key: string) => string;
  defaultValues?: Partial<{
    name: string;
    shipper_type: 'INDIVIDUAL' | 'CORPORATE';
    discount_rate: string;
    grade: string;
    biz_no: string;
    rep_name: string;
  }>;
  fieldErrors?: Record<string, string>;
  readOnly?: boolean;
}

export function RequiredFields({ t, defaultValues = {}, fieldErrors = {}, readOnly = false }: RequiredFieldsProps) {
  const [shipperType, setShipperType] = useState<'INDIVIDUAL' | 'CORPORATE'>(
    defaultValues.shipper_type ?? 'INDIVIDUAL'
  );

  function formatBizNo(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }

  return (
    <>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_name')} *</label>
        <input
          name="name"
          required
          defaultValue={defaultValues.name}
          disabled={readOnly}
          className={`w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${readOnly ? 'bg-slate-50' : ''}`}
        />
        {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_type')} *</label>
          <select
            name="shipper_type"
            required
            value={shipperType}
            onChange={(e) => setShipperType(e.target.value as 'INDIVIDUAL' | 'CORPORATE')}
            disabled={readOnly}
            className={`w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${readOnly ? 'bg-slate-50' : ''}`}
          >
            <option value="INDIVIDUAL">{t('type_INDIVIDUAL')}</option>
            <option value="CORPORATE">{t('type_CORPORATE')}</option>
          </select>
          {fieldErrors.shipper_type && <p className="text-xs text-red-500 mt-1">{fieldErrors.shipper_type}</p>}
        </div>
        {shipperType === 'CORPORATE' ? (
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_discount_rate')} *</label>
            <div className="relative">
              <input
                name="discount_rate"
                type="number"
                step="0.1"
                min="0"
                max="99.99"
                required
                defaultValue={defaultValues.discount_rate}
                className="w-full px-3 py-2.5 pr-7 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
            </div>
            {fieldErrors.discount_rate && <p className="text-xs text-red-500 mt-1">{fieldErrors.discount_rate}</p>}
          </div>
        ) : (
          <input type="hidden" name="discount_rate" value="0" />
        )}
      </div>

      {shipperType === 'CORPORATE' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_biz_no')} *</label>
            <input
              name="biz_no"
              required
              placeholder="000-00-00000"
              defaultValue={defaultValues.biz_no}
              onChange={(e) => { e.target.value = formatBizNo(e.target.value); }}
              maxLength={12}
              disabled={readOnly}
              className={`w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${readOnly ? 'bg-slate-50' : ''}`}
            />
            {fieldErrors.biz_no && <p className="text-xs text-red-500 mt-1">{fieldErrors.biz_no}</p>}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_rep_name')}</label>
            <input
              name="rep_name"
              defaultValue={defaultValues.rep_name}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {fieldErrors.rep_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.rep_name}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_grade')}</label>
          <select name="grade" defaultValue={defaultValues.grade ?? 'BRONZE'} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">{t('grade_placeholder')}</option>
            <option value="BRONZE">BRONZE</option>
            <option value="SILVER">SILVER</option>
            <option value="GOLD">GOLD</option>
            <option value="PLATINUM">PLATINUM</option>
          </select>
          {fieldErrors.grade && <p className="text-xs text-red-500 mt-1">{fieldErrors.grade}</p>}
        </div>
      </div>
    </>
  );
}
