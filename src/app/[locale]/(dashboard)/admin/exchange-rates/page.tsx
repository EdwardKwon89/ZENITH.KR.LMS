import { requireAdmin } from '@/lib/auth/guards';
import { listExchangeRates, getExchangeRateSyncStatus } from '@/app/actions/admin/exchange-rates';
import ExchangeRatesClient from './exchange-rates-client';

export default async function ExchangeRatesPage() {
  const { profile } = await requireAdmin();

  const [{ rates, total }, syncStatus] = await Promise.all([
    listExchangeRates(1, 100),
    getExchangeRateSyncStatus(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">환율 관리</h1>
          <p className="text-xs font-medium text-slate-500">
            한국수출입은행 고시환율 일자별 자동 수집 및 수동 보정을 관리합니다.
            오더 운임에는 출고확정일 환율이 적용됩니다.
          </p>
        </div>
      </div>
      <ExchangeRatesClient
        initialRates={rates}
        initialTotal={total}
        syncStatus={syncStatus}
        userRole={profile?.role || 'GUEST'}
      />
    </div>
  );
}
