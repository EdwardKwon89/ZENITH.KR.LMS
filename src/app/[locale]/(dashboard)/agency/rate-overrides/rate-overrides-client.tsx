'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AgencyRateOverrideWithRefs } from '@/types/agency';
import { RateOverridesHeader } from './rate-overrides-header';
import { RateOverridesTable } from './rate-overrides-table';

interface RateOverridesClientProps {
  overrides: AgencyRateOverrideWithRefs[];
}

export function RateOverridesClient({ overrides }: RateOverridesClientProps) {
  const t = useTranslations();
  const [localOverrides, setLocalOverrides] = useState(overrides);

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 min-h-screen animate-in fade-in duration-500">
      <RateOverridesHeader />
      <RateOverridesTable overrides={localOverrides} onDeactivated={(id) => setLocalOverrides((prev) => prev.filter((o) => o.id !== id))} />
    </div>
  );
}