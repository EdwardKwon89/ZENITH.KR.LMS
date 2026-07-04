'use client';

interface ContactFieldsProps {
  t: (key: string) => string;
  defaultValues?: Partial<{
    contact_name: string;
    contact_email: string;
    contact_phone: string;
  }>;
  fieldErrors?: Record<string, string>;
}

export function ContactFields({ t, defaultValues = {}, fieldErrors = {} }: ContactFieldsProps) {
  return (
    <div className="border-t border-slate-100 pt-5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">선택 입력</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_contact_name')}</label>
          <input name="contact_name" defaultValue={defaultValues.contact_name} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          {fieldErrors.contact_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.contact_name}</p>}
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_contact_email')}</label>
          <input name="contact_email" type="email" defaultValue={defaultValues.contact_email} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          {fieldErrors.contact_email && <p className="text-xs text-red-500 mt-1">{fieldErrors.contact_email}</p>}
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_contact_phone')}</label>
        <input name="contact_phone" defaultValue={defaultValues.contact_phone} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        {fieldErrors.contact_phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.contact_phone}</p>}
      </div>
    </div>
  );
}
