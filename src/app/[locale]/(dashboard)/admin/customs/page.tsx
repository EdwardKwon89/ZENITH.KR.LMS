import { getDeclarations } from '@/app/actions/customs';
import CustomsClient from './customs-client';
import { getTranslations } from 'next-intl/server';

export default async function AdminCustomsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = await getTranslations('Customs');
  
  // 초기 데이터는 전체 조회
  const { declarations, total } = await getDeclarations();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-heading text-slate-900 tracking-tight">
            {t('customs_management')}
          </h1>
          <p className="text-slate-500 mt-1">
            수동 통관 신고 및 외부 어댑터 연동 상태를 관리합니다.
          </p>
        </div>
      </div>

      <CustomsClient initialData={declarations} initialTotal={total} />
    </div>
  );
}
