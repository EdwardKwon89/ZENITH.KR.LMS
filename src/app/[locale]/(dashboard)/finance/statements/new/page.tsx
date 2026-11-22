// TASK-B-361 (Issue #1367) — S4 청구서 생성 /finance/statements/new (Admin, 등록 조직만).
import { getOrganizations } from '@/app/actions/admin/master-data';
import { StatementCreate } from '@/components/finance/statements';
import { guardStatementRoute } from '@/components/finance/statements/page-helpers';
import type { StatementTarget } from '@/components/finance/statements';
import { getKstToday } from '@/lib/utils/date-kst';

export default async function FinanceStatementNewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { cfg } = await guardStatementRoute('finance');

  let targets: StatementTarget[] = [];
  try {
    const res = await getOrganizations(1, 500);
    targets = (res.organizations ?? [])
      .filter((o) => o.type === 'AGENCY' || o.type === 'SHIPPER')
      .map((o) => ({ id: o.id, name: o.name, type: o.type }));
  } catch {
    // 대상 조회 실패 시 빈 목록 — 액션 호출 시 서버가 target_not_allowed로 거부한다.
  }

  const today = getKstToday();
  return (
    <StatementCreate
      basePath={cfg.basePath}
      locale={locale}
      targets={targets}
      allowAdhoc={cfg.allowAdhoc}
      canSettleOrders={cfg.canSettleOrders}
      defaultYear={Number(today.slice(0, 4))}
      defaultMonth={Number(today.slice(5, 7))}
    />
  );
}
