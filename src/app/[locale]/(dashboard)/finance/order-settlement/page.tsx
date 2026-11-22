// TASK-B-369 (Issue #1425) — S1 오더정산 목록 /finance/order-settlement (Admin).
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { getOrdersForCostSettlement } from '@/app/actions/finance/ups-actual-cost';
import { OrderSettlementList } from '@/components/finance/order-settlement';
import type { OrderSettlementFilter } from '@/components/finance/order-settlement';
import { getKstToday } from '@/lib/utils/date-kst';

// 서버 액션(assertAdmin)과 동일한 역할 집합 — UI 접근도 서버에서 먼저 차단한다.
const ADMIN_ROLES = ['ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export default async function FinanceOrderSettlementPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { profile } = await requireAuth();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    redirect(`/${locale}/dashboard`);
  }

  const today = getKstToday();
  const filter: OrderSettlementFilter = {
    status: 'ALL',
    from: `${today.slice(0, 7)}-01`,
    to: today,
  };
  const res = await getOrdersForCostSettlement(filter);

  return (
    <OrderSettlementList
      initialOrders={res.orders ?? []}
      initialFilter={filter}
      locale={locale}
      initialError={res.success ? null : res.error}
    />
  );
}
