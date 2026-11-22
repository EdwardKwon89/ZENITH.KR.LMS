// TASK-B-361 (Issue #1367) — S4 청구서 생성 /agency/statements/new (대리점, 수기 화주 포함).
import { getAgencyShippers } from '@/app/actions/agency/shippers';
import { StatementCreate } from '@/components/finance/statements';
import { guardStatementRoute } from '@/components/finance/statements/page-helpers';
import type { StatementTarget } from '@/components/finance/statements';
import { getKstToday } from '@/lib/utils/date-kst';

export default async function AgencyStatementNewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { profile, cfg } = await guardStatementRoute('agency');

  let targets: StatementTarget[] = [];
  try {
    const res = await getAgencyShippers(profile!.org_id!);
    // 비활성 연결은 서버(resolveBillableTarget)가 target_not_allowed로 거부하므로 선택지에서 제외
    targets = (res.shippers ?? [])
      .filter((s) => s.is_active !== false)
      .map((s) => ({
        id: s.shipper_org_id,
        name: s.shipper?.name ?? s.shipper_org_id,
        type: 'SHIPPER',
      }));
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
