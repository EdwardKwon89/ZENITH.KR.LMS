import { getOrders } from '@/app/actions/orders';
import { requireAuth } from '@/lib/auth/guards';
import OrderFilterBar from '@/components/orders/OrderFilterBar';
import OrderDataTable from '@/components/orders/OrderDataTable';
import { ZenButton } from '@/components/ui/ZenUI';
import { Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { isFeatureEnabled } from '@/lib/params/feature-flags';

export default async function OrdersPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  // 1. 보안 가드 (세션 확인)
  const { profile } = await requireAuth();

  // 2. 검색 파라미터 파싱
  const page = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page) : 1;
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined;
  const order_type = typeof resolvedSearchParams.order_type === 'string' ? resolvedSearchParams.order_type : undefined;
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : undefined;

  // 3. 지능형 데이터 엔진 호출 (20-Row Standard)
  const { orders, totalCount, pageSize } = await getOrders({
    page,
    status,
    order_type,
    search
  });

  // 4. Feature Flags 확인
  const isAiEnabled = await isFeatureEnabled('AI_RECOMMENDATION_ENABLED', profile?.org_id);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
            <Plus size={24} />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isAiEnabled && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl text-purple-600 font-bold text-[10px] animate-pulse">
              <Sparkles size={14} />
              AI OPTIMIZER ACTIVE
            </div>
          )}
          <Link href="/orders/new">
            <ZenButton variant="ghost" className="bg-brand-600 text-white hover:bg-brand-700 px-8 py-2 text-xs font-bold rounded-xl shadow-lg shadow-brand-100 transition-all">
              <Plus size={14} className="mr-2" /> CREATE NEW ORDER
            </ZenButton>
          </Link>
        </div>
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
