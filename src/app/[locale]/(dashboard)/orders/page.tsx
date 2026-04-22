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
  const { profile } = await requireAuth();

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
    <div className="space-y-4 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-3">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
            ORDER CONTROL
          </h1>
          <p className="text-slate-500 font-medium ml-4 text-xs">Manage and track your global logistics shipments</p>
        </div>
        <Link href="/orders/new">
          <ZenButton className="bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 hover:shadow-md px-8 py-2 text-xs font-bold rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-blue-100 outline-none">
            <Plus size={14} className="mr-2" /> CREATE NEW ORDER
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
        userRole={profile?.role}
      />
    </div>
  );
}
