'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ZenBadge } from '@/components/ui/ZenUI';
import type { StatementScope } from './types';

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success'> = {
  DRAFT: 'default',   // 초안(회색)
  ISSUED: 'info',     // 발행(파랑)
  CLOSED: 'success',  // 마감(초록)
};

const STATUS_KEY: Record<string, string> = {
  DRAFT: 'statusDraft',
  ISSUED: 'statusIssued',
  CLOSED: 'statusClosed',
};

const SCOPE_KEY: Record<StatementScope, string> = {
  MINE: 'scopeMine',
  RECEIVED: 'scopeReceived',
  SUPERVISED: 'scopeSupervised',
};

export function StatementStatusBadge({ status }: { status: string }) {
  const t = useTranslations('Statements');
  return (
    <ZenBadge variant={STATUS_VARIANT[status] ?? 'default'}>
      {STATUS_KEY[status] ? t(STATUS_KEY[status]) : status}
    </ZenBadge>
  );
}

export function StatementScopeBadge({ scope }: { scope: StatementScope }) {
  const t = useTranslations('Statements');
  return (
    <ZenBadge variant={scope === 'MINE' ? 'info' : 'warning'}>
      {t(SCOPE_KEY[scope] ?? 'scopeAll')}
    </ZenBadge>
  );
}
