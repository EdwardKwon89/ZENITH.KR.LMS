// TASK-B-361 (Issue #1367) — S3 청구서 목록 /shipper/statements (화주, 조회 전용).
import { getBillingStatements } from '@/app/actions/finance/billing-statements';
import { StatementsList } from '@/components/finance/statements';
import { guardStatementRoute } from '@/components/finance/statements/page-helpers';

export default async function ShipperStatementsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { cfg } = await guardStatementRoute('shipper');
  const res = await getBillingStatements();
  return (
    <StatementsList
      statements={res.statements ?? []}
      basePath={cfg.basePath}
      canCreate={cfg.canCreate}
      locale={locale}
      loadError={res.success ? null : res.error}
    />
  );
}
