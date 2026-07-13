'use client';

import { useState, useEffect } from 'react';

interface ContactFieldsProps {
  t: (key: string) => string;
  loginEmail: string;
  defaultValues?: Partial<{
    contact_name: string;
    contact_email: string;
    contact_phone: string;
  }>;
  fieldErrors?: Record<string, string>;
}

export function ContactFields({ t, loginEmail, defaultValues = {}, fieldErrors = {} }: ContactFieldsProps) {
  const [touched, setTouched] = useState(false);
  const [contactEmail, setContactEmail] = useState(defaultValues.contact_email || '');

  useEffect(() => {
    if (!touched && loginEmail) {
      setContactEmail(loginEmail);
    }
  }, [loginEmail, touched]);

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.startsWith('02')) {
      if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  return (
    <div className="border-t border-slate-100 pt-5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t('form_contact_name')}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_contact_name')}</label>
          <input name="contact_name" defaultValue={defaultValues.contact_name} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          {fieldErrors.contact_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.contact_name}</p>}
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_contact_email')}</label>
          <input
            name="contact_email"
            type="email"
            value={contactEmail}
            onChange={(e) => {
              setTouched(true);
              setContactEmail(e.target.value);
            }}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {fieldErrors.contact_email && <p className="text-xs text-red-500 mt-1">{fieldErrors.contact_email}</p>}
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_contact_phone')}</label>
        <input name="contact_phone" defaultValue={defaultValues.contact_phone} onChange={(e) => { e.target.value = formatPhone(e.target.value); }} maxLength={13} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        {fieldErrors.contact_phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.contact_phone}</p>}
      </div>
    </div>
  );
}
