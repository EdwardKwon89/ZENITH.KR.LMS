// TASK-B-361 (Issue #1367) — S5 청구서 상세 /finance/statements/[id] (Admin).
import { getBillingStatementDetail } from '@/app/actions/finance/billing-statements';
import { StatementDetail } from '@/components/finance/statements';
import { guardStatementRoute } from '@/components/finance/statements/page-helpers';

export default async function FinanceStatementDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const { cfg } = await guardStatementRoute('finance');
  const res = await getBillingStatementDetail(id);
  return (
    <StatementDetail
      detail={res.detail ?? null}
      error={res.success ? null : res.error}
      basePath={cfg.basePath}
      locale={locale}
    />
  );
}
