import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getOrderDetails } from '@/app/actions/operations/orders';
import { getOrganizations, getPorts } from '@/app/actions/master';
import { OrderRegistrationForm } from '@/components/orders/OrderRegistrationForm';
import { buildOrderEditDefaults } from '@/lib/orders/edit-defaults';
import { requireAuth } from '@/lib/auth/guards';
import { getOrderEditScope } from '@/lib/logistics/status-machine';
import { hasActiveUpsLabel } from '@/lib/orders/ups-registration';
import { getUpsEditAvailability } from '@/lib/orders/ups-edit-availability';
import { getOrderDetailPath } from '@/lib/orders/detail-path';
import type { OrderStatus } from '@/types/orders';

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ orderId: string; locale: string }>;
}) {
  const { supabase } = await requireAuth();
  const { orderId } = await params;

  const rawOrder = await getOrderDetails(orderId);
  if (!rawOrder) redirect('/orders');

  // TASK-B-339 (Issue #1254): UPS 오더는 상태만으로 수정 가능 여부를 판단하지 않는다 —
  //   활성 UPS 라벨(등록 사실)을 반영해 판정한다.
  const isUpsOrder = rawOrder.transport_mode === 'UPS';
  const editScope = getOrderEditScope(rawOrder.status as OrderStatus, rawOrder.transport_mode as string | undefined);
  const availability = isUpsOrder
    ? getUpsEditAvailability(rawOrder.status as OrderStatus, await hasActiveUpsLabel(supabase, orderId))
    : null;

  const detailPath = getOrderDetailPath(orderId, rawOrder.transport_mode as string | null);
  if (!editScope.editable || (availability && !availability.editable)) {
    redirect(detailPath);
  }

  const order: any = rawOrder;

  // 실측(measured_at)된 패키지 id 목록 — UI에서 치수/무게 입력 처리에 사용
  const measuredPackageIds = (order.packages ?? [])
    .filter((pkg: any) => !!pkg.measured_at)
    .map((pkg: any) => pkg.id)
    .filter(Boolean) as string[];

  const t = await getTranslations('Orders');
  const navT = await getTranslations('Navigation');

  const [dataShippers, dataPorts] = await Promise.all([
    getOrganizations(),
    getPorts(),
  ]);

  const shippers = dataShippers ?? [];
  const ports = dataPorts ?? [];

  const defaultValues = buildOrderEditDefaults(order);

  return (
    <div className="relative min-h-screen animate-in fade-in duration-500">
      <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-slate-100 px-8 py-3 mb-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={detailPath}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:shadow-sm transition-all text-slate-400 hover:text-slate-600"
            >
              <ChevronLeft size={16} />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                {t('title_edit') ?? 'Edit Order'}
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70 ml-3.5">
                {navT('order_mgmt')} — {order.order_no}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8">
        <OrderRegistrationForm
          shippers={shippers}
          ports={ports}
          orderId={orderId}
          defaultValues={defaultValues}
          editScope={editScope}
          measuredPackageIds={measuredPackageIds}
        />
      </div>
    </div>
  );
}
