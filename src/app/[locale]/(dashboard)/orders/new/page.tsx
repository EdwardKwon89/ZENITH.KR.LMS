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
    <div className="relative min-h-screen animate-in fade-in duration-500">
      <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-slate-100 px-8 py-3 mb-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/orders"
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:shadow-sm transition-all text-slate-400 hover:text-slate-600"
            >
              <ChevronLeft size={16} />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                {t('title_new')}
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70 ml-3.5">
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
