import { getTranslations } from 'next-intl/server';
import { requireAuth } from '@/lib/auth/guards';
import { checkPermission, USER_ROLES } from '@/lib/auth/rbac';
import { redirect } from 'next/navigation';
import InboundProcessForm from '@/components/warehouse/InboundProcessForm';

export default async function WarehouseInboundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { profile } = await requireAuth();

  // 권한 체크: ADMIN or MANAGER or SUPER_ADMIN
  const isAllowed = profile?.role === USER_ROLES.ADMIN ||
    profile?.role === USER_ROLES.MANAGER ||
    profile?.role === USER_ROLES.ZENITH_SUPER_ADMIN;

  if (!isAllowed) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations('WarehouseInbound');
  const navT = await getTranslations('Navigation');

  return (
    <div className="relative min-h-screen animate-in fade-in duration-500 bg-slate-50/50 pb-12">
      <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-md border-b border-slate-100 px-8 py-3 mb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-brand-600 rounded-full"></span>
              {t('title')}
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70 ml-3.5">
              {navT('logistics_group')} — {navT('logistics_inbound')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8">
        <InboundProcessForm locale={locale} />
      </div>
    </div>
  );
}
