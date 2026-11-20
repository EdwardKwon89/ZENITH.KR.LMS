'use client';

import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { ZenButton } from '@/components/ui/ZenUI';
import { Wrench } from 'lucide-react';

export default function MaintenancePage() {
  const t = useTranslations('Maintenance');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ko';

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-6 px-4">
      <div className="p-4 rounded-full bg-amber-50 border border-amber-200">
        <Wrench className="w-12 h-12 text-amber-500" />
      </div>
      <h1 className="text-3xl font-black font-heading text-slate-900 text-center">
        {t('title')}
      </h1>
      <p className="text-slate-500 text-center max-w-md">
        {t('message')}
      </p>
      <p className="text-sm text-slate-400 text-center max-w-sm">
        {t('eta_unknown')}
      </p>
      <ZenButton variant="ghost" onClick={() => router.push(`/${locale}`)}>
        {t('back')}
      </ZenButton>
    </div>
  );
}
