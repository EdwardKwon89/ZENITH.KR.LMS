'use client';

import { ORDER_STATUS_META, OrderStatus } from '@/types/orders';
import Link from 'next/link';
import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { StatusChangeModal } from './StatusChangeModal';
import { canChangeStatus } from '@/lib/logistics/status-machine';
import { UserRole, USER_ROLES } from '@/lib/auth/rbac';
import { AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ZenStatusBadge } from '@/components/domain';


interface OrderDataTableProps {
  orders: any[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  locale: string;
  userRole?: string;
}

// TASK-1144 (Issue #1216, IMP-170/171): 목록 표시용 포맷터
// - 접수일자: created_at을 ko-KR 날짜로 표시 (데이터는 findList가 이미 조회)
// - Shipper: "소속/화주" 병기 — override(shipper_name)가 소속조직명과 다를 때만
//   병기하고, 동일·미입력 시 중복 노출 방지 (Edward 확정, 2026-10-03)
export function formatReceivedDate(createdAt: unknown): string {
  if (!createdAt) return '-';
  const d = new Date(String(createdAt));
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR');
}

export function formatShipperCell(orgName: unknown, shipperName: unknown): string {
  const org = typeof orgName === 'string' ? orgName.trim() : '';
  const override = typeof shipperName === 'string' ? shipperName.trim() : '';
  if (org && override && override !== org) return `${org}/${override}`;
  return org || override || '-';
}

// TASK-1146 (Issue #1221, DEF-139): ROUTE 표시 코드 결정
// - 항구 코드가 하나라도 있으면 그대로 (기존 동작 유지)
// - 둘 다 없고 transport_mode가 UPS면 국가 코드로 폴백 (UPS는 항구 개념 없음)
// - 그 외(둘 다 없음 + 非-UPS)는 기존대로 undefined 반환 (빈 배지 — 변경 없음)
export function resolveRouteCodes(order: {
  origin_port?: { code?: string } | null;
  dest_port?: { code?: string } | null;
  transport_mode?: string;
  pickup_country_code?: string | null;
  recipient_country_code?: string | null;
}): [string | undefined, string | undefined] {
  const origin = order.origin_port?.code;
  const dest = order.dest_port?.code;
  if (origin || dest) return [origin, dest];
  if (order.transport_mode === 'UPS') {
    return [order.pickup_country_code || undefined, order.recipient_country_code || undefined];
  }
  return [origin, dest];
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
  const searchParams = useSearchParams();
  const safeLocale = (params?.locale as string) || locale || 'ko';
  const totalPages = Math.ceil(totalCount / pageSize);
  const t = useTranslations('orderStatus');

  return (
    <div className={`bg-white zen-tactile border border-slate-200 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 ${isModalOpen ? 'relative z-50' : ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Order No</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">접수일자</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Shipper</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Recipient</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Route (Origin-Dest)</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Billing</th>
              <th className="px-6 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-20 text-center text-slate-400 italic">
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
                    <span className="text-[12px] text-slate-600 font-medium">{formatReceivedDate(order.created_at)}</span>
                  </td>
                  <td className="px-6 py-2.5">
                    <span className="text-[12px] text-slate-600 font-medium">{order.order_type}</span>
                  </td>
                  <td className="px-6 py-2.5">
                    <span className="text-[13px] text-slate-800 font-bold">{formatShipperCell(order.shipper?.name, order.shipper_name)}</span>
                  </td>
                  <td className="px-6 py-2.5">
                    <span className="text-[13px] text-slate-800 font-bold">{order.recipient_name || '-'}</span>
                  </td>
                  <td className="px-6 py-2.5">
                    <div className="flex items-center gap-2 text-[12px] font-medium whitespace-nowrap">
                      {(() => {
                        const [originCode, destCode] = resolveRouteCodes(order);
                        return (
                          <>
                            <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{originCode}</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{destCode}</span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-2.5">
                    {(() => {
                      const nextStatuses = Object.values(OrderStatus).filter(s => 
                        canChangeStatus(order.status as OrderStatus, s, (userRole as UserRole) || USER_ROLES.USER).allowed
                      );
                      const hasPermission = nextStatuses.length > 0;
                      const descKey = ORDER_STATUS_META[order.status as OrderStatus]?.descriptionKey ?? order.status;

                      return (
                        <ZenStatusBadge
                          status={order.status as OrderStatus}
                          clickable={hasPermission}
                          onClick={() => {
                            if (hasPermission) {
                              setSelectedOrder(order);
                              setIsModalOpen(true);
                            }
                          }}
                          title={hasPermission ? `${t(descKey)} (클릭하여 상태 변경)` : t(descKey)}
                        />
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
                        // TASK-1146 (Issue #1221, DEF-139): BILLING 배지 내부 개행 방지
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${styles[status]}`}>
                          {labels[status]}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    <Link 
                      href={`/${safeLocale}/orders/${order.id}${order.transport_mode === 'UPS' ? '/ups-detail' : ''}`}
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
              href={`/${safeLocale}/orders?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(p) }).toString()}`}
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
