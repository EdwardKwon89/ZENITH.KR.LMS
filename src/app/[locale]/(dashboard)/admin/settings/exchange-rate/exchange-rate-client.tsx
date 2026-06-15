'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ZenCard, ZenButton, ZenSelect } from '@/components/ui/ZenUI';
import { 
  Globe, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateExchangeRateSettings } from '@/app/actions/admin/settings';

interface ExchangeRateClientProps {
  initialData: {
    baseCurrency: string;
    rates: { key: string; label: string; value: string }[];
    updatedAt?: string;
  };
}

export default function ExchangeRateClient({ initialData }: ExchangeRateClientProps) {
  const t = useTranslations('admin.settings.exchange_rate');
  const [baseCurrency, setBaseCurrency] = useState(initialData.baseCurrency);
  const [rates, setRates] = useState(initialData.rates);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(initialData.updatedAt);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleRateChange = (key: string, value: string) => {
    setRates(prev => prev.map(r => r.key === key ? { ...r, value } : r));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const exchangeRates: Record<string, string> = {};
      rates.forEach(r => {
        exchangeRates[r.key] = r.value;
      });

      const res = await updateExchangeRateSettings({
        baseCurrency,
        exchangeRates
      });

      if (res.success) {
        setToast({ message: '환율 설정이 성공적으로 저장되었습니다.', type: 'success' });
        setUpdatedAt(new Date().toISOString());
      } else {
        setToast({ message: res.error || '저장 중 오류가 발생했습니다.', type: 'error' });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.';
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Premium Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold tracking-widest text-[10px] uppercase mb-1">
            <Coins className="w-3.5 h-3.5" />
            Exchange Rate Manager
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            {t('title')}
          </h1>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
            시스템에서 사용하는 기준 통화 및 주요 외화 환율을 일괄적으로 조회하고 업데이트할 수 있습니다.
          </p>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Base Currency Settings */}
        <ZenCard className="md:col-span-1 bg-white border-slate-200 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              {t('base_currency')}
            </h3>
            <p className="text-xs text-slate-400">
              시스템 전체 요금 산정의 기준이 되는 기본 통화입니다.
            </p>
          </div>
          <div className="mt-2">
            <ZenSelect
              value={baseCurrency}
              onValueChange={setBaseCurrency}
              options={[
                { value: 'KRW', label: 'KRW (대한민국 원)' },
                { value: 'USD', label: 'USD (미국 달러)' },
                { value: 'CNY', label: 'CNY (중국 위안화)' },
                { value: 'JPY', label: 'JPY (일본 엔화)' }
              ]}
            />
          </div>
        </ZenCard>

        {/* Exchange Rates List */}
        <ZenCard className="md:col-span-2 bg-white border-slate-200 p-6 flex flex-col gap-6 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              외화 환율 입력 (기준 통화 대비)
            </h3>
            <p className="text-xs text-slate-400">
              각 외화 1 단위당 기준 통화(KRW)로 환산되는 가치를 양수로 입력해 주세요.
            </p>
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider pl-4">통화</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">설명</th>
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider pr-4 text-right">환율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rates.map((rate) => {
                  const currencyCode = rate.key.replace('EXCHANGE_RATE_', '');
                  return (
                    <tr key={rate.key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-sm text-slate-700 pl-4">{currencyCode}</td>
                      <td className="p-3 text-xs text-slate-500">{rate.label}</td>
                      <td className="p-3 pr-4 text-right">
                        <input
                          type="text"
                          value={rate.value}
                          onChange={(e) => handleRateChange(rate.key, e.target.value)}
                          className="bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-1.5 text-right font-mono font-bold text-sm text-blue-600 focus:outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all max-w-[120px]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-slate-400 font-mono">
              {updatedAt && (
                <span>
                  {t('last_updated')}: {new Date(updatedAt).toLocaleString(undefined, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              )}
            </div>
            <ZenButton
              onClick={handleSave}
              loading={loading}
              className="bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 h-[42px] px-5 rounded-xl transition-all flex items-center gap-2 group"
            >
              <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-tighter">{t('save')}</span>
            </ZenButton>
          </div>
        </ZenCard>
      </div>

      {/* Global Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed bottom-10 right-10 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-xl",
          toast.type === 'success' ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-red-50 border-red-200 text-red-700"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-bold text-sm tracking-tight">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
