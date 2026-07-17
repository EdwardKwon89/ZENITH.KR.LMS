'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { updateAgencyShipper } from '@/app/actions/agency/shippers';
import { RequiredFields } from '../../new/required-fields';
import { ContactFields } from '../../new/contact-fields';
import { AddressInput } from '@/components/common/AddressInput';
import { getCountryName } from '@/lib/utils/country';
import { ZoneDiscountForm } from '@/components/agency/ZoneDiscountForm';
import type { UpsZoneWithCountries } from '@/types/ups';

interface EditShipperFormProps {
  shipper: {
    id: string;
    shipper_type: string;
    discount_rate: number;
    grade: string | null;
    is_active: boolean;
    org: {
      id: string;
      name: string;
      biz_no: string | null;
      rep_name: string | null;
      contact_name: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      country_code: string | null;
      state_province: string | null;
      city: string | null;
      address: string | null;
      address_detail: string | null;
      zipcode: string | null;
    };
  };
  zones: UpsZoneWithCountries[];
  agencyOrgId?: string;
}

interface FormValues {
  name: string;
  shipper_type: 'INDIVIDUAL' | 'CORPORATE';
  grade: string;
  biz_no: string;
  rep_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
}

export function EditShipperForm({ shipper, zones, agencyOrgId }: EditShipperFormProps) {
  const t = useTranslations('AgencyShippers');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(shipper.is_active);

  const initialValues: Partial<FormValues> = {
    name: shipper.org.name,
    shipper_type: shipper.shipper_type as 'INDIVIDUAL' | 'CORPORATE',
    grade: shipper.grade || '',
    biz_no: shipper.org.biz_no || '',
    rep_name: shipper.org.rep_name || '',
    contact_name: shipper.org.contact_name || '',
    contact_email: shipper.org.contact_email || '',
    contact_phone: shipper.org.contact_phone || '',
    is_active: shipper.is_active,
  };

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setGlobalError('');
    setFieldErrors({});

    try {
      const result = await updateAgencyShipper(shipper.id, {
        name: formData.get('name') as string,
        shipper_type: formData.get('shipper_type') as 'INDIVIDUAL' | 'CORPORATE',
        discount_rate: 0,
        grade: (formData.get('grade') as string) || undefined,
        biz_no: (formData.get('biz_no') as string) || undefined,
        rep_name: (formData.get('rep_name') as string) || undefined,
        contact_name: (formData.get('contact_name') as string) || undefined,
        contact_email: (formData.get('contact_email') as string) || undefined,
        contact_phone: (formData.get('contact_phone') as string) || undefined,
        is_active: isActive,
        country_code: (formData.get('country_code') as string) || undefined,
        state_province: (formData.get('state_province') as string) || undefined,
        city: (formData.get('city') as string) || undefined,
        address: (formData.get('address') as string) || undefined,
        address_detail: (formData.get('address_detail') as string) || undefined,
        address_english: (formData.get('address_english') as string) || undefined,
        address_detail_english: (formData.get('address_detail_english') as string) || undefined,
        zipcode: (formData.get('zipcode') as string) || undefined,
      });

      if (!result.success) {
        setFieldErrors(result.fieldErrors);
        if (result.fieldErrors._form) setGlobalError(result.fieldErrors._form);
        return;
      }

      router.push(`/${locale}/agency/shippers`);
      router.refresh();
    } catch (err: any) {
      setGlobalError(err.message || t('submit_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen animate-in fade-in duration-500">
      <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-slate-100 px-8 py-3 mb-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/agency/shippers`} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <ChevronLeft size={16} />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                {t('edit_title')}
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70 ml-3.5">{shipper.org.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-8">
        {globalError && (
          <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} /> {globalError}
          </div>
        )}

        <form action={handleSubmit} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('form_status')}</p>
                <p className="text-sm font-bold text-slate-800">{isActive ? t('status_active') : t('status_inactive')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`}
                aria-pressed={isActive}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <RequiredFields t={t} defaultValues={initialValues} fieldErrors={fieldErrors} readOnly />
            <ContactFields t={t} loginEmail="" defaultValues={initialValues} fieldErrors={fieldErrors} />
            <AddressInput
              t={t}
              fieldErrors={fieldErrors}
              defaultValues={{
                country_code: shipper.org.country_code,
                state_province: shipper.org.state_province,
                city: shipper.org.city,
                address: shipper.org.address,
                address_detail: shipper.org.address_detail,
                zipcode: shipper.org.zipcode,
              }}
            />
            {shipper.org.country_code && (
              <p className="text-xs text-slate-500">
                {t('form_country')}: {getCountryName(shipper.org.country_code, locale)}
              </p>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
            <Link href={`/${locale}/agency/shippers`}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">취소</Link>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20">
              {loading ? t('loading') : t('edit_submit')}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <ZoneDiscountForm
            shipperOrgId={shipper.org.id}
            shipperType={shipper.shipper_type}
            zones={zones}
            agencyOrgId={agencyOrgId}
          />
        </div>
      </div>
    </div>
  );
}
