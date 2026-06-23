'use client';

interface ContactFieldsProps {
  t: (key: string) => string;
}

export function ContactFields({ t }: ContactFieldsProps) {
  return (
    <div className="border-t border-slate-100 pt-5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">선택 입력</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_contact_name')}</label>
          <input name="contact_name" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_contact_email')}</label>
          <input name="contact_email" type="email" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_contact_phone')}</label>
        <input name="contact_phone" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
      </div>
    </div>
  );
}
