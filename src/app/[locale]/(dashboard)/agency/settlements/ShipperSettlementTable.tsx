'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface ShipperSettlementRow {
  shipperId: string;
  shipperName: string;
  orderCount: number;
  revenue: number;
  cost: number;
  margin: number;
  marginRate: number;
}

export interface OrderSettlementRow {
  orderId: string;
  orderNo: string;
  shipperId: string;
  shipperName: string;
  createdAt: string;
  packagesCount: number;
  totalWeight: number;
  revenue: number;
  cost: number;
  margin: number;
  marginRate: number;
}

interface ShipperSettlementTableProps {
  shippersData: ShipperSettlementRow[];
  ordersData: OrderSettlementRow[];
}

export function ShipperSettlementTable({ shippersData, ordersData }: ShipperSettlementTableProps) {
  const t = useTranslations('AgencySettlements');
  const [expandedShipperId, setExpandedShipperId] = useState<string | null>(null);

  const toggleExpand = (shipperId: string) => {
    setExpandedShipperId(expandedShipperId === shipperId ? null : shipperId);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('col_shipper_name')}</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('col_order_count')}</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('col_revenue')}</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('col_cost')}</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('col_margin')}</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('col_margin_rate')}</th>
            <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">{t('col_details')}</th>
          </tr>
        </thead>
        <tbody>
          {shippersData.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-sm font-medium text-slate-500">
                {t('empty_settlements')}
              </td>
            </tr>
          ) : (
            shippersData.map((row) => {
              const isExpanded = expandedShipperId === row.shipperId;
              const subOrders = ordersData.filter((o) => o.shipperId === row.shipperId);

              return (
                <optgroup key={row.shipperId} label={row.shipperName} style={{ display: 'contents' }}>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{row.shipperName}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-600 font-semibold">{row.orderCount}</td>
                    <td className="px-6 py-4 text-sm text-right text-emerald-600 font-bold">{formatCurrency(row.revenue)}</td>
                    <td className="px-6 py-4 text-sm text-right text-rose-600 font-bold">{formatCurrency(row.cost)}</td>
                    <td className="px-6 py-4 text-sm text-right text-purple-600 font-bold">{formatCurrency(row.margin)}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-slate-700">{row.marginRate.toFixed(1)}%</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleExpand(row.shipperId)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors inline-flex"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-slate-50/40">
                      <td colSpan={7} className="px-6 py-4 border-b border-slate-100">
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner max-h-96 overflow-y-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('subcol_order_no')}</th>
                                <th className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('subcol_date')}</th>
                                <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('subcol_pkg_count')}</th>
                                <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('subcol_weight')}</th>
                                <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('subcol_revenue')}</th>
                                <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('subcol_cost')}</th>
                                <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('subcol_margin')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subOrders.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-400">
                                    {t('empty_suborders')}
                                  </td>
                                </tr>
                              ) : (
                                subOrders.map((sub) => (
                                  <tr key={sub.orderId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                                    <td className="px-4 py-2 text-xs font-bold text-blue-600">{sub.orderNo}</td>
                                    <td className="px-4 py-2 text-xs text-slate-500">{new Date(sub.createdAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-2 text-xs text-right text-slate-600 font-semibold">{sub.packagesCount}</td>
                                    <td className="px-4 py-2 text-xs text-right text-slate-600 font-semibold">{sub.totalWeight.toFixed(1)} kg</td>
                                    <td className="px-4 py-2 text-xs text-right text-emerald-600 font-semibold">{formatCurrency(sub.revenue)}</td>
                                    <td className="px-4 py-2 text-xs text-right text-rose-600 font-semibold">{formatCurrency(sub.cost)}</td>
                                    <td className="px-4 py-2 text-xs text-right text-purple-600 font-bold">{formatCurrency(sub.margin)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </optgroup>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
