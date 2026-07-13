import { getDeclarations } from '@/app/actions/customs';
import CustomsHistoryClient from './customs-history-client';
import { getTranslations } from 'next-intl/server';
import { requireAuth } from '@/lib/auth/guards';

export default async function MyCustomsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Customs' });
  const { profile } = await requireAuth();

  // 사용자 권한으로 본인의 신고 목록만 가져옴
  // getDeclarations 내부에서 Supabase RLS가 작동하여 본인 데이터만 필터링됨
  const { declarations, total } = await getDeclarations({ limit: 100 });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {t('my_customs')}
        </h1>
        <p className="text-slate-500 mt-2">
          고객님의 수출입 통관 진행 현황을 실시간으로 확인하실 수 있습니다.
        </p>
      </div>

      <CustomsHistoryClient initialData={declarations} initialTotal={total} />
    </div>
  );
}
