'use client';

interface LoginAccountFieldsProps {
  t: (key: string) => string;
  onLoginEmailChange: (email: string) => void;
  fieldErrors?: Record<string, string>;
}

export function LoginAccountFields({ t, onLoginEmailChange, fieldErrors = {} }: LoginAccountFieldsProps) {
  return (
    <div className="border-b border-slate-100 pb-5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t('new_title')}</p>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('form_login_email')} *</label>
        <input
          name="login_email"
          type="email"
          required
          onChange={(e) => onLoginEmailChange(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{t('form_login_email_hint')}</p>
        {fieldErrors.login_email && <p className="text-xs text-red-500 mt-1">{fieldErrors.login_email}</p>}
      </div>
    </div>
  );
}
