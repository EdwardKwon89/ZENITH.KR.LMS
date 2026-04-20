import { getTranslations } from 'next-intl/server';
import { getOrganizations, getPorts } from '@/app/actions/master';
import { OrderRegistrationForm } from '@/components/orders/OrderRegistrationForm';
import { ZenAurora } from '@/components/ui/ZenUI';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireAuth } from '@/lib/auth/guards';

export default async function NewOrderPage() {
  // 일반 인증 가드: 세션 확인 후 진입 허용
  await requireAuth();

  const t = await getTranslations('Orders');
  const navT = await getTranslations('Navigation');
  
  // Fetch Master Data for the form
  const [shippers, ports] = await Promise.all([
    getOrganizations(),
    getPorts()
  ]);

  return (
    <div className="relative min-h-screen">
      <div className="sticky top-0 z-20 bg-white/40 backdrop-blur-md border-b border-white/20 px-8 py-4 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/orders"
              className="p-2 bg-white/60 rounded-xl hover:bg-white hover:shadow-md transition-all text-slate-500"
            >
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                {t('title_new')}
              </h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest opacity-70">
                {navT('order_mgmt')} — {navT('order_house')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8">
        <OrderRegistrationForm 
          shippers={shippers} 
          ports={ports} 
        />
      </div>
    </div>
  );
}
