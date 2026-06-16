'use client';

interface RequiredFieldsProps {
  t: (key: string) => string;
}

export function RequiredFields({ t }: RequiredFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_name')} *</label>
        <input name="name" required className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_type')} *</label>
          <select name="shipper_type" required className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="INDIVIDUAL">{t('type_INDIVIDUAL')}</option>
            <option value="CORPORATE">{t('type_CORPORATE')}</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_discount_rate')} *</label>
          <div className="relative">
            <input name="discount_rate" type="number" step="0.1" min="0" max="99.99" required
              className="w-full px-3 py-2.5 pr-7 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_grade')}</label>
          <select name="grade" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">{t('grade_placeholder')}</option>
            <option value="BRONZE">BRONZE</option>
            <option value="SILVER">SILVER</option>
            <option value="GOLD">GOLD</option>
            <option value="PLATINUM">PLATINUM</option>
          </select>
        </div>
      </div>
    </>
  );
}
