import { Package, Weight, Globe } from 'lucide-react';
import type { DailyOutboundSummary } from '@/lib/actions/ups-daily-close.shared';

interface Props {
  summary: DailyOutboundSummary;
  t: (key: string) => string;
}

export function OutboundSummaryCard({ summary, t }: Props) {
  return (
    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
      <h3 className="text-sm font-bold text-slate-700 mb-4">{t('outbound_title')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Package size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('total_pkgs')}</p>
            <p className="text-xl font-bold text-slate-900">{summary.totalPkgs.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <div className="p-2 bg-green-50 text-green-600 rounded-lg">
            <Weight size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('total_weight')}</p>
            <p className="text-xl font-bold text-slate-900">{summary.totalWeight.toFixed(1)} kg</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <Globe size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('zone_distribution')}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {summary.zoneDistribution.map(z => (
                <span key={z.zone} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                  {z.zone} {z.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
