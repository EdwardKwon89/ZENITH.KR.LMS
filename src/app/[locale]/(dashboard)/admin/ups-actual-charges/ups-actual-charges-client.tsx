'use client';

import React, { useState } from 'react';
import { searchDeliveredUpsOrders } from '@/app/actions/finance';
import { UpsActualAdjustmentForm } from '@/components/orders/UpsActualAdjustmentForm';
import { Search, ChevronDown, ChevronUp, Package, Calendar, MapPin, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface OrderSearchResult {
  id: string;
  order_no: string;
  status: string;
  transport_mode: string;
  shipper_id: string;
  dest_country_code: string;
  created_at: string;
  tracking_config?: { tracking_no: string | null } | null;
}

export default function UpsActualChargesClient() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OrderSearchResult[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      toast.error('검색어를 입력해 주세요.');
      return;
    }

    try {
      setLoading(true);
      const orders = await searchDeliveredUpsOrders(trimmed);
      setResults(orders as any[]);
      if (orders.length === 0) {
        toast.info('검색 결과가 없습니다. (배송 완료된 UPS 오더만 조회 가능합니다)');
      } else if (orders.length === 1) {
        // Auto-expand if only 1 result is found
        setExpandedOrderId(orders[0].id);
      } else {
        setExpandedOrderId(null);
      }
    } catch (err: any) {
      toast.error(err.message || '오더 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search Panel */}
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="오더 번호 또는 운송장(Tracking) 번호 입력..."
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white hover:bg-primary/95 px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {loading ? '검색 중...' : '오더 검색'}
          </button>
        </form>
        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">
          ※ 실제 청구 등록은 배송 완료(`DELIVERED`)된 UPS 오더만 가능합니다.
        </p>
      </div>

      {/* Results List */}
      <div className="flex flex-col gap-4">
        {results.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          const trackingNo = (order as any).tracking_config?.tracking_no || '운송장 정보 없음';
          const createdDate = new Date(order.created_at).toLocaleDateString();

          return (
            <div
              key={order.id}
              className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm"
            >
              {/* Order Row Header */}
              <div
                onClick={() => toggleExpand(order.id)}
                className="flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors gap-4"
              >
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="font-bold text-slate-800 dark:text-gray-200">{order.order_no}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-zinc-400">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>{trackingNo}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-zinc-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{order.dest_country_code}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-zinc-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{createdDate}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end space-x-4">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
                    {order.status}
                  </span>
                  <button
                    type="button"
                    className="text-slate-500 dark:text-zinc-400 hover:text-slate-800 p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Editor Form */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/10 p-5">
                  <UpsActualAdjustmentForm
                    orderId={order.id}
                    orderStatus={order.status}
                    isPlatformAdmin={true}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
