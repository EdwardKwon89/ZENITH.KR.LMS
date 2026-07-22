import React from 'react';
import { requireAuth } from '@/lib/auth/guards';
import DepartureConfirmForm from '@/components/warehouse/DepartureConfirmForm';

export default async function DeparturePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAuth();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <DepartureConfirmForm locale={locale} />
    </div>
  );
}
