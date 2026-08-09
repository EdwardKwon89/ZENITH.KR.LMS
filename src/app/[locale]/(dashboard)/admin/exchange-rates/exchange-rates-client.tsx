'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { ZenBadge, ZenButton } from '@/components/ui/ZenUI';
import { setManualExchangeRate } from '@/app/actions/admin/exchange-rates';
import { USER_ROLES } from '@/lib/auth/rbac';
import type { ExchangeRateRow } from '@/app/actions/admin/exchange-rates';

interface SyncStatus {
  lastFetchedAt: string | null;
  lastRateDate: string | null;
  lastRate: number | null;
  syncedToday: boolean;
}

interface Props {
  initialRates: ExchangeRateRow[];
  initialTotal: number;
  syncStatus: SyncStatus;
  userRole: string;
}

export default function ExchangeRatesClient({ initialRates, initialTotal, syncStatus, userRole }: Props) {
  const router = useRouter();
  const isAdmin = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.ZENITH_SUPER_ADMIN;
  const [isPending, startTransition] = useTransition();
  const [rateDate, setRateDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [rate, setRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submitManual = () => {
    setError(null);
    const numericRate = Number(rate);
    if (!rateDate || !Number.isFinite(numericRate) || numericRate <= 0) {
      setError('환율(양수)과 일자를 입력해주세요.');
      return;
    }

    startTransition(async () => {
      try {
        await setManualExchangeRate({
          base_currency: 'USD',
          quote_currency: 'KRW',
          rate: numericRate,
          rate_date: rateDate,
        });
        setRate('');
        router.refresh();
      } catch (e: any) {
        setError(e.message || '환율 보정 저장에 실패했습니다.');
      }
    });
  };

  const lastFetchedDisplay = syncStatus.lastFetchedAt
    ? new Date(syncStatus.lastFetchedAt).toLocaleString('ko-KR')
    : '-';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={18} className="text-brand-600" />
            <h2 className="font-bold text-slate-900">자동 수집 상태</h2>
          </div>
          {syncStatus.syncedToday ? (
            <ZenBadge variant="success">오늘 자동 수집 완료</ZenBadge>
          ) : (
            <ZenBadge variant="warning">오늘 자동 수집 이력 없음</ZenBadge>
          )}
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">최근 수집 시각</dt>
              <dd className="font-medium text-slate-800">{lastFetchedDisplay}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">최근 고시일</dt>
              <dd className="font-medium text-slate-800">{syncStatus.lastRateDate || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">최근 고시 환율</dt>
              <dd className="font-medium text-slate-800">
                {syncStatus.lastRate != null ? `USD/KRW ${syncStatus.lastRate}` : '-'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            매일 KST 11:30 한국수출입은행 고시환율 자동 수집 (Cron)
          </p>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-bold text-slate-900">수동 보정 입력</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              특정 일자의 환율을 직접 입력합니다. (source=MANUAL, 동일 일자 API 값 덮어씀)
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="date"
                value={rateDate}
                onChange={(e) => setRateDate(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <input
                type="number"
                step="0.0001"
                min="0"
                placeholder="USD/KRW 환율"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <ZenButton
                type="button"
                loading={isPending}
                onClick={submitManual}
                className="!px-5 !py-2 text-sm"
              >
                저장
              </ZenButton>
            </div>
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">일자별 환율 이력</h2>
          <span className="text-xs text-slate-400">총 {initialTotal}건</span>
        </div>
        {initialRates.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">
            환율 이력이 없습니다. 자동 수집(Cron)이 실행되거나 수동 보정 입력을 등록하세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2.5 pr-4 font-medium">기준일</th>
                  <th className="py-2.5 pr-4 font-medium">통화쌍</th>
                  <th className="py-2.5 pr-4 font-medium">환율</th>
                  <th className="py-2.5 pr-4 font-medium">소스</th>
                  <th className="py-2.5 pr-4 font-medium">수집/입력 시각</th>
                  <th className="py-2.5 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {initialRates.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2.5 pr-4 font-medium text-slate-800">{r.rate_date}</td>
                    <td className="py-2.5 pr-4 text-slate-600">
                      {r.base_currency}/{r.quote_currency}
                    </td>
                    <td className="py-2.5 pr-4 font-mono font-semibold text-slate-900">
                      {Number(r.rate).toLocaleString('ko-KR')}
                    </td>
                    <td className="py-2.5 pr-4">
                      {r.source === 'KOREAEXIM_API' ? (
                        <ZenBadge variant="info">API 자동</ZenBadge>
                      ) : (
                        <ZenBadge variant="warning">수동 보정</ZenBadge>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">
                      {r.fetched_at ? new Date(r.fetched_at).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td className="py-2.5">
                      {r.is_active ? <ZenBadge variant="success">적용</ZenBadge> : <ZenBadge>비활성</ZenBadge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
