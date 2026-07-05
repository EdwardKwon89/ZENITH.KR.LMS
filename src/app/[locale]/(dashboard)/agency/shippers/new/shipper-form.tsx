'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { createAgencyShipper, type CreateAgencyShipperResult } from '@/app/actions/agency/shippers';
import { FormHeader } from './form-header';
import { RequiredFields } from './required-fields';
import { ContactFields } from './contact-fields';
import { FormActions } from './form-actions';

interface AgencyShipperFormProps {
  agencyOrgId: string;
}

interface FormValues {
  name: string;
  shipper_type: 'INDIVIDUAL' | 'CORPORATE';
  discount_rate: string;
  grade: string;
  biz_no: string;
  rep_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
}

export function AgencyShipperForm({ agencyOrgId }: AgencyShipperFormProps) {
  const t = useTranslations('AgencyShippers');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedValues, setSavedValues] = useState<Partial<FormValues>>({});

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setGlobalError('');
    setFieldErrors({});

    const currentValues: Partial<FormValues> = {
      name: formData.get('name') as string,
      shipper_type: formData.get('shipper_type') as 'INDIVIDUAL' | 'CORPORATE',
      discount_rate: formData.get('discount_rate') as string,
      grade: formData.get('grade') as string,
      biz_no: formData.get('biz_no') as string,
      rep_name: formData.get('rep_name') as string,
      contact_name: formData.get('contact_name') as string,
      contact_email: formData.get('contact_email') as string,
      contact_phone: formData.get('contact_phone') as string,
    };

    try {
      const result = await createAgencyShipper(agencyOrgId, {
        name: currentValues.name!,
        shipper_type: currentValues.shipper_type!,
        discount_rate: Number(currentValues.discount_rate) / 100,
        grade: currentValues.grade || undefined,
        biz_no: currentValues.biz_no || undefined,
        rep_name: currentValues.rep_name || undefined,
        contact_name: currentValues.contact_name || undefined,
        contact_email: currentValues.contact_email || undefined,
        contact_phone: currentValues.contact_phone || undefined,
        login_email: (formData.get('login_email') as string) || '',
      });

      if (!result.success) {
        setSavedValues(currentValues);
        setFieldErrors(result.fieldErrors);
        if (result.fieldErrors._form) setGlobalError(result.fieldErrors._form);
        return;
      }

      router.push(`/${locale}/agency/shippers`);
      router.refresh();
    } catch (err: any) {
      setSavedValues(currentValues);
      setGlobalError(err.message || t('submit_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen animate-in fade-in duration-500">
      <FormHeader t={t} />

      <div className="max-w-2xl mx-auto px-8">
        {globalError && (
          <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} /> {globalError}
          </div>
        )}

        <form action={handleSubmit} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 space-y-5">
            <RequiredFields t={t} defaultValues={savedValues} fieldErrors={fieldErrors} />
            <ContactFields t={t} defaultValues={savedValues} fieldErrors={fieldErrors} />
          </div>
          <FormActions loading={loading} submitLabel={t('new_shipper')} loadingLabel={t('loading')} />
        </form>
      </div>
    </div>
  );
}
