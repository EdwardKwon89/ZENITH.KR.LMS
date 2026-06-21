'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Download, RefreshCw, Loader2, FileText } from 'lucide-react';
import {
  getAgencySettlementSummary,
  getAgencyShipperSettlements,
  getAgencyOrderSettlements,
  exportAgencySettlementExcel,
  getAgencyUnpricedOrders,
} from '@/app/actions/agency';
import { AgencySettlementSummary } from './AgencySettlementSummary';
import { ShipperSettlementTable } from './ShipperSettlementTable';
import { SettlementReconciliationAlert } from './SettlementReconciliationAlert';

interface ShipperDropdownItem {
  id: string;
  shipper_org_id: string;
  shipper?: {
    id: string;
    name: string;
  } | null;
}

interface AgencySettlementClientProps {
  agencyOrgId: string;
  shippers: ShipperDropdownItem[];
}

export function AgencySettlementClient({ agencyOrgId, shippers }: AgencySettlementClientProps) {
  const t = useTranslations('AgencySettlements');

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [from, setFrom] = useState(formatDate(firstDay));
  const [to, setTo] = useState(formatDate(today));
  const [selectedShipperId, setSelectedShipperId] = useState('');
  const [orderNoSearch, setOrderNoSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [summary, setSummary] = useState({
    orderCount: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalMargin: 0,
    marginRate: 0,
  });
  const [shippersData, setShippersData] = useState<any[]>([]);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [unpricedOrders, setUnpricedOrders] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, shippersRes, ordersRes, unpricedRes] = await Promise.all([
        getAgencySettlementSummary(agencyOrgId, from, to),
        getAgencyShipperSettlements(agencyOrgId, from, to),
        getAgencyOrderSettlements(agencyOrgId, selectedShipperId || undefined, from, to),
        getAgencyUnpricedOrders(agencyOrgId, from, to)
      ]);

      if (summaryRes.error) throw new Error(summaryRes.error);
      if (shippersRes.error) throw new Error(shippersRes.error);
      if (ordersRes.error) throw new Error(ordersRes.error);
      if (unpricedRes.error) throw new Error(unpricedRes.error);

      if (summaryRes.data) setSummary(summaryRes.data);
      if (shippersRes.data) {
        const filteredShippers = selectedShipperId
          ? shippersRes.data.filter((s: any) => s.shipperId === selectedShipperId)
          : shippersRes.data;
        setShippersData(filteredShippers);
      }
      if (ordersRes.data) setOrdersData(ordersRes.data);
      if (unpricedRes.data) setUnpricedOrders(unpricedRes.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExcelExport = async () => {
    setExporting(true);
    try {
      const res = await exportAgencySettlementExcel(agencyOrgId, selectedShipperId || undefined, from, to);
      if (res.error) throw new Error(res.error);
      const { base64, filename } = res.data!;
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-8 p-4 md:p-8 min-h-screen bg-slate-50/30 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('description')}</p>
        </div>
      </header>

      {/* 필터 영역 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('filter_shipper')}</label>
          <select
            value={selectedShipperId}
            onChange={(e) => setSelectedShipperId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">{t('all_shippers')}</option>
            {shippers.map((s) => (
              <option key={s.id} value={s.shipper_org_id}>
                {s.shipper?.name || 'Unknown'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('filter_period')}</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('filter_order_no')}</label>
          <div className="relative">
            <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={orderNoSearch}
              onChange={(e) => setOrderNoSearch(e.target.value)}
              placeholder={t('order_no_placeholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all cursor-pointer h-10"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
          {t('btn_search')}
        </button>
      </div>

      {/* 미가격 오더 알림 */}
      {unpricedOrders.length > 0 && (
        <SettlementReconciliationAlert unpricedOrders={unpricedOrders} t={t} />
      )}

      {/* 요약 카드 */}
      <AgencySettlementSummary
        orderCount={summary.orderCount}
        totalRevenue={summary.totalRevenue}
        totalCost={summary.totalCost}
        totalMargin={summary.totalMargin}
        marginRate={summary.marginRate}
      />

      {/* 테이블 영역 */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">{t('table_title')}</h2>
          <button
            onClick={handleExcelExport}
            disabled={exporting || ordersData.length === 0}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {t('btn_excel')}
          </button>
        </div>

        <ShipperSettlementTable
          shippersData={shippersData}
          ordersData={ordersData}
        />
      </div>
    </div>
  );
}
