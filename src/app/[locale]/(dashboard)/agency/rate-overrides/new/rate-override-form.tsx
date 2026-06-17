'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { upsertAgencyRateOverride } from '@/app/actions/agency/rate-overrides';
import type { UpsBaseRate } from '@/types/ups';
import { OverrideFormFields } from './override-form-fields';
import { OverrideFormActions } from './override-form-actions';

function _ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
      <AlertCircle size={16} /> {message}
    </div>
  );
}

interface RateOverrideFormProps {
  agencyOrgId: string;
  baseRates: UpsBaseRate[];
  t: (key: string) => string;
}

export function RateOverrideForm({ agencyOrgId, baseRates, t }: RateOverrideFormProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    try {
      await upsertAgencyRateOverride(agencyOrgId, {
        base_rate_id: formData.get('base_rate_id') as string,
        selling_price: Number(formData.get('selling_price')),
        cost_price: Number(formData.get('cost_price')),
        valid_from: formData.get('valid_from') as string,
        valid_until: (formData.get('valid_until') as string) || undefined,
      });
      router.push(`/${locale}/agency/rate-overrides`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save rate override');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <h1 className="text-xl font-black text-slate-900 mb-6">{t('agency_rate_overrides_new')}</h1>

      {error && <_ErrorAlert message={error} />}

      <form action={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
        <OverrideFormFields baseRates={baseRates} t={t} />
        <OverrideFormActions loading={loading} submitLabel={t('agency_rate_overrides_new')} />
      </form>
    </div>
  );
}