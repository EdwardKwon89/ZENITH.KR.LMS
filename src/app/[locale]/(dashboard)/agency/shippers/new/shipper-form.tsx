'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { createAgencyShipper } from '@/app/actions/agency/shippers';
import { FormHeader } from './form-header';
import { RequiredFields } from './required-fields';
import { ContactFields } from './contact-fields';
import { FormActions } from './form-actions';

interface AgencyShipperFormProps {
  agencyOrgId: string;
}

export function AgencyShipperForm({ agencyOrgId }: AgencyShipperFormProps) {
  const t = useTranslations('AgencyShippers');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    try {
      await createAgencyShipper(agencyOrgId, {
        name: formData.get('name') as string,
        shipper_type: formData.get('shipper_type') as 'INDIVIDUAL' | 'CORPORATE',
        discount_rate: Number(formData.get('discount_rate')),
        grade: (formData.get('grade') as string) || undefined,
        biz_no: (formData.get('biz_no') as string) || undefined,
        rep_name: (formData.get('rep_name') as string) || undefined,
        contact_name: (formData.get('contact_name') as string) || undefined,
        contact_email: (formData.get('contact_email') as string) || undefined,
        contact_phone: (formData.get('contact_phone') as string) || undefined,
      });
      router.push(`/${locale}/agency/shippers`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || t('submit_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen animate-in fade-in duration-500">
      <FormHeader t={t} />

      <div className="max-w-2xl mx-auto px-8">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form action={handleSubmit} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 space-y-5">
            <RequiredFields t={t} />
            <ContactFields t={t} />
          </div>
          <FormActions loading={loading} submitLabel={t('new_shipper')} loadingLabel={t('loading')} />
        </form>
      </div>
    </div>
  );
}
