'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { createAgencyShipper } from '@/app/actions/agency/shippers';

interface AgencyShipperFormProps {
  agencyOrgId: string;
  t: (key: string) => string;
}

export function AgencyShipperForm({ agencyOrgId, t }: AgencyShipperFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    try {
      const shipperData = {
        name: formData.get('name') as string,
        shipper_type: formData.get('shipper_type') as 'INDIVIDUAL' | 'CORPORATE',
        discount_rate: Number(formData.get('discount_rate')),
        grade: (formData.get('grade') as string) || undefined,
        contact_name: (formData.get('contact_name') as string) || undefined,
        contact_email: (formData.get('contact_email') as string) || undefined,
        contact_phone: (formData.get('contact_phone') as string) || undefined,
      };
      await createAgencyShipper(agencyOrgId, shipperData);
      router.push('/agency/shippers');
      router.refresh();
    } catch (err: any) {
      setError(err.message || t('submit_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen animate-in fade-in duration-500">
      <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-slate-100 px-8 py-3 mb-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agency/shippers" className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <ChevronLeft size={16} />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                {t('new_title')}
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70 ml-3.5">
                {t('new_description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-8">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form action={handleSubmit} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 space-y-5">
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
                  <input
                    name="discount_rate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="99.99"
                    required
                    className="w-full px-3 py-2.5 pr-7 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
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
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
            <Link
              href="/agency/shippers"
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
            >
              {loading ? t('loading') : t('new_shipper')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
