'use client';

import React, { useState } from 'react';
import { searchDeliveredUpsOrders } from '@/app/actions/finance';
import { UpsActualAdjustmentForm } from '@/components/orders/UpsActualAdjustmentForm';
import { Search, ChevronDown, ChevronUp, Package, Calendar, MapPin, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { ZenCard, ZenButton, ZenInput, ZenBadge } from '@/components/ui/ZenUI';

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
      <ZenCard className="p-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <ZenInput type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="오더 번호 또는 운송장(Tracking) 번호 입력..." className="w-full pl-10" />
          </div>
          <ZenButton type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-bold">
            {loading ? '검색 중...' : '오더 검색'}
          </ZenButton>
        </form>
        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">
          ※ 실제 청구 등록은 배송 완료(`DELIVERED`)된 UPS 오더만 가능합니다.
        </p>
      </ZenCard>

      {/* Results List */}
      <div className="flex flex-col gap-4">
        {results.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          const trackingNo = (order as any).tracking_config?.tracking_no || '운송장 정보 없음';
          const createdDate = new Date(order.created_at).toLocaleDateString();

          return (
            <ZenCard
              key={order.id}
              className="overflow-hidden"
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
                  <ZenBadge className="text-xs font-bold bg-green-100 text-green-800">{order.status}</ZenBadge>
                  <ZenButton type="button" className="text-slate-500 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </ZenButton>
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
              </ZenCard>
            );
          })}
        </div>
      </div>
  );
}
