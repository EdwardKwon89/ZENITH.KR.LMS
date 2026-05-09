'use client';

import { ORDER_STATUS_META, OrderStatus } from '@/types/orders';
import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { StatusChangeModal } from './StatusChangeModal';
import { canChangeStatus } from '@/lib/logistics/status-machine';
import { UserRole, USER_ROLES } from '@/lib/auth/rbac';
import { AnimatePresence } from 'framer-motion';


interface OrderDataTableProps {
  orders: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  locale: string;
  userRole?: string;
}

export default function OrderDataTable({ 
  orders, 
  totalCount, 
  currentPage, 
  pageSize, 
  locale,
  userRole
}: OrderDataTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const params = useParams();
  const safeLocale = (params?.locale as string) || locale || 'ko';
  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusInfo = (status: string) => {
    return ORDER_STATUS_META[status as OrderStatus] || { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  return (
    <div className="bg-white zen-tactile border border-slate-200 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Order No</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Shipper</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Route (Origin-Dest)</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Billing</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                  No orders found. Use the filters to refine your search.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-2.5">
                    <span className="text-[13px] text-slate-900 font-bold group-hover:text-blue-600 transition-colors">{order.order_no}</span>
                  </td>
                  <td className="px-6 py-2.5">
                    <span className="text-[12px] text-slate-600 font-medium">{order.order_type}</span>
                  </td>
                  <td className="px-6 py-2.5">
                    <span className="text-[13px] text-slate-800 font-bold">{order.shipper?.name || '-'}</span>
                  </td>
                  <td className="px-6 py-2.5">
                    <div className="flex items-center gap-2 text-[12px] font-medium">
                      <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{order.origin_port?.code}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{order.dest_port?.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-2.5">
                    {(() => {
                      const statusInfo = getStatusInfo(order.status);
                      // 현재 역할에서 가능한 다음 상태가 하나라도 있는지 확인
                      const nextStatuses = Object.values(OrderStatus).filter(s => 
                        canChangeStatus(order.status as OrderStatus, s, (userRole as UserRole) || USER_ROLES.USER).allowed
                      );
                      const hasPermission = nextStatuses.length > 0;

                      return (
                        <span 
                          onClick={() => {
                            if (hasPermission) {
                              setSelectedOrder(order);
                              setIsModalOpen(true);
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusInfo.color} ${hasPermission ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 ring-blue-400 transition-all' : 'cursor-default'}`}
                          title={hasPermission ? `${statusInfo.description} (클릭하여 상태 변경)` : statusInfo.description}
                        >
                          {statusInfo.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-2.5">
                    {(() => {
                      const status = order.billing_status || 'PENDING';
                      const styles: Record<string, string> = {
                        PENDING: 'bg-slate-50 text-slate-400 border-slate-200',
                        INVOICED: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm',
                        PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                      };
                      const labels: Record<string, string> = {
                        PENDING: '정산대기',
                        INVOICED: '청구완료',
                        PAID: '결제완료'
                      };
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status]}`}>
                          {labels[status]}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    <Link 
                      href={`/${safeLocale}/orders/${order.id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors border-b border-transparent hover:border-blue-600"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
        <span className="text-xs text-slate-500">
          Showing <span className="text-slate-900 font-bold">{orders.length}</span> of <span className="text-slate-900 font-bold">{totalCount}</span> results
        </span>
        
        <div className="flex gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/${safeLocale}/orders?page=${p}`}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                currentPage === p 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && selectedOrder && (
          <StatusChangeModal
            orderId={selectedOrder.id}
            currentStatus={selectedOrder.status as OrderStatus}
            allowedNextStatuses={Object.values(OrderStatus).filter(s => 
              canChangeStatus(selectedOrder.status as OrderStatus, s, (userRole as UserRole) || USER_ROLES.USER).allowed
            )}

            onClose={() => {
              setIsModalOpen(false);
              setSelectedOrder(null);
            }}
            onSuccess={() => {
              // 페이지 새로고침은 서버 액션에서 revalidatePath로 처리됨
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
