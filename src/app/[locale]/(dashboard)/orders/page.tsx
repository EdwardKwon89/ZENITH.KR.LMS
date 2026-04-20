import { getOrders } from '@/app/actions/orders';
import { requireAuth } from '@/lib/auth/guards';
import OrderFilterBar from '@/components/orders/OrderFilterBar';
import OrderDataTable from '@/components/orders/OrderDataTable';
import { ZenButton } from '@/components/ui/ZenUI';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function OrdersPage({
  params: { locale },
  searchParams
}: {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // 1. 보안 가드 (세션 확인)
  await requireAuth();

  // 2. 검색 파라미터 파싱
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;
  const order_type = typeof searchParams.order_type === 'string' ? searchParams.order_type : undefined;
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;

  // 3. 지능형 데이터 엔진 호출 (20-Row Standard)
  const { orders, totalCount, pageSize } = await getOrders({
    page,
    status,
    order_type,
    search
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-8 py-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2 drop-shadow-sm">
            ORDER CONTROL
          </h1>
          <p className="text-white/50 font-medium">
            Real-time global logistics monitoring & management
          </p>
        </div>
        <Link href="/orders/new">
          <ZenButton className="bg-white text-slate-900 hover:bg-white/90 shadow-2xl shadow-white/10 px-8">
            <Plus size={20} className="mr-2" />
            Create New Order
          </ZenButton>
        </Link>
      </div>

      {/* Intelligent Filter Bar */}
      <OrderFilterBar locale={locale} />

      {/* Enterprise Data Grid */}
      <OrderDataTable 
        orders={orders} 
        totalCount={totalCount} 
        currentPage={page}
        pageSize={pageSize}
        locale={locale} 
      />
    </div>
  );
}
