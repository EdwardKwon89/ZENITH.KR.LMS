'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { createAgencyShipper, type CreateAgencyShipperResult } from '@/app/actions/agency/shippers';
import { FormHeader } from './form-header';
import { RequiredFields } from './required-fields';
import { LoginAccountFields } from './login-account-fields';
import { ContactFields } from './contact-fields';
import { AddressInput } from '@/components/common/AddressInput';
import { FormActions } from './form-actions';

interface AgencyShipperFormProps {
  agencyOrgId: string;
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
  const [loginEmail, setLoginEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setGlobalError('');
    setFieldErrors({});

    const currentValues: Partial<FormValues> = {
      name: formData.get('name') as string,
      shipper_type: formData.get('shipper_type') as 'INDIVIDUAL' | 'CORPORATE',
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
        discount_rate: 0,
        grade: currentValues.grade || undefined,
        biz_no: currentValues.biz_no || undefined,
        rep_name: currentValues.rep_name || undefined,
        contact_name: currentValues.contact_name || undefined,
        contact_email: currentValues.contact_email || undefined,
        contact_phone: currentValues.contact_phone || undefined,
        login_email: (formData.get('login_email') as string) || '',
        country_code: (formData.get('country_code') as string) || undefined,
        state_province: (formData.get('state_province') as string) || undefined,
        city: (formData.get('city') as string) || undefined,
        address: (formData.get('address') as string) || undefined,
        address_detail: (formData.get('address_detail') as string) || undefined,
        zipcode: (formData.get('zipcode') as string) || undefined,
      });

      if (!result.success) {
        setSavedValues(currentValues);
        setFieldErrors(result.fieldErrors);
        if (result.fieldErrors._form) setGlobalError(result.fieldErrors._form);
        return;
      }

      const sentEmail = formData.get('login_email') as string;
      const shipperType = formData.get('shipper_type') as string;

      if (shipperType === 'CORPORATE') {
        router.push(`/${locale}/agency/shippers/${result.shipperId}/edit`);
        router.refresh();
      } else {
        setSuccessMessage(t('submit_invite_sent', {
          name: currentValues.name,
          email: sentEmail,
        }));
        setTimeout(() => {
          router.push(`/${locale}/agency/shippers`);
          router.refresh();
        }, 3000);
      }
    } catch (err: any) {
      setSavedValues(currentValues);
      setGlobalError(err.message || t('submit_error'));
    } finally {
      setLoading(false);
    }
  }

  if (successMessage) {
    return (
      <div className="relative min-h-screen animate-in fade-in duration-500">
        <div className="max-w-2xl mx-auto px-8 pt-16">
          <div className="bg-white border border-emerald-200 rounded-2xl p-8 shadow-sm text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
            <p className="text-lg font-bold text-slate-900 mb-2">{successMessage}</p>
            <p className="text-sm text-slate-500">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
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
            <LoginAccountFields t={t} onLoginEmailChange={setLoginEmail} fieldErrors={fieldErrors} />
            <RequiredFields t={t} defaultValues={savedValues} fieldErrors={fieldErrors} />
            <ContactFields t={t} loginEmail={loginEmail} defaultValues={savedValues} fieldErrors={fieldErrors} />
            <AddressInput t={t} fieldErrors={fieldErrors} />
          </div>
          <FormActions loading={loading} submitLabel={t('new_shipper')} loadingLabel={t('loading')} />
        </form>
      </div>
    </div>
  );
}
