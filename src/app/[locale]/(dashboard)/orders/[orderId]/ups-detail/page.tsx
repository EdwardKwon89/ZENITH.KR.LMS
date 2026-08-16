import React from 'react';
import { requireAuth } from '@/lib/auth/guards';
import { getOrderDetails, getOrderEditHistory } from '@/app/actions/operations/orders';
import { getOrderRateSnapshot } from '@/app/actions/operations/tisa';
import { getUpsLabelStatus } from '@/app/actions/operations/ups-labels';
import { getUpsTrackingEvents } from '@/app/actions/operations/tracking';
import { checkPermission } from '@/lib/auth/rbac';
import { notFound, redirect } from 'next/navigation';
import { Truck, FileText, User } from 'lucide-react';

import { ZenCard, ZenBadge } from '@/components/ui/ZenUI';
import UpsOrderStatusStepper from '@/components/ups/UpsOrderStatusStepper';
import UpsDetailBackToListButton from '@/components/ups/UpsDetailBackToListButton';
import UpsPackageItemsModal from '@/components/ups/UpsPackageItemsModal';
import UpsOrderBreakdownCard from '@/components/ups/UpsOrderBreakdownCard';
import UpsOrderEditHistoryPanel from '@/components/ups/UpsOrderEditHistoryPanel';
import UpsTrackingEventsList from '@/components/tracking/UpsTrackingEventsList';
import { resolveDestCountryCode } from '@/lib/ups/order-helpers';
import { resolveConsigneeStreet, resolveShipperStreet, resolveRegionName, resolveCountryName } from '@/lib/ups/label-mapping'; // TASK-B-305, TASK-B-307
import UpsTradeDocumentActions from '@/components/orders/UpsTradeDocumentActions';

interface UpsOrderDetailPageProps {
  params: Promise<{
    locale: string;
    orderId: string;
  }>;
}

export default async function UpsOrderDetailPage({ params }: UpsOrderDetailPageProps) {
  const { locale, orderId } = await params;
  const { supabase, profile } = await requireAuth();

  const order = await getOrderDetails(orderId);
  if (!order) {
    notFound();
  }

  // Ensure transport_mode is UPS
  if (order.transport_mode !== 'UPS') {
    redirect(`/orders/${orderId}`);
  }

  // Permissions calculation
  let orgType = 'GUEST';
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from('zen_organizations')
      .select('type')
      .eq('id', profile.org_id)
      .single();
    if (org) orgType = org.type;
  }

  const isAdmin =
    profile?.role === 'ZENITH_SUPER_ADMIN' ||
    (profile?.role === 'ADMIN' && orgType === 'PLATFORM') ||
    checkPermission(profile?.role, '/admin');

  const isShipper = order.shipper_id && (profile?.id === order.shipper_id || profile?.org_id === order.shipper_id);
  const isAgency = profile?.role === 'AGENCY';

  // Fetch Rate Snapshot
  const snapshot = await getOrderRateSnapshot(orderId);

  // Fetch Finance Costs & Invoice
  const { data: costs } = await supabase
    .from('zen_order_costs')
    .select('id, cost_type, total_amount, currency, invoice_id')
    .eq('order_id', orderId);

  const linkedInvoiceId = costs?.find((c: any) => c.invoice_id)?.invoice_id ?? null;
  const { data: invoice } = linkedInvoiceId
    ? await supabase.from('zen_invoices').select('id, invoice_no, total_amount, status').eq('id', linkedInvoiceId).single()
    : { data: null };

  // TASK-B-301 (Issue #1121): Fetch Order Status History for stage-wise transition timestamps
  const { data: statusHistory } = await supabase
    .from('order_status_history')
    .select('prev_status, next_status, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  // TASK-B-303 (Issue #1125): Fetch Order Edit History (zen_order_edit_log)
  const editHistory = await getOrderEditHistory(orderId);

  // Fetch UPS Tracking Events (zen_ups_tracking_events)
  const upsTrackingData = await getUpsTrackingEvents(orderId);
  const upsTrackingEvents = upsTrackingData?.events || [];

  // Label & Trade Doc Status
  const upsLabelStatus = await getUpsLabelStatus(orderId);

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        {/* TASK-B-301 (Issue #1121): router.back() 목록보기 버튼 (기존 일반 오더 상세 Link 교체) */}
        <UpsDetailBackToListButton />
        <ZenBadge className="text-xs font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          UPS Special Delivery Detail
        </ZenBadge>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Main Stepper, Breakdown, Adjustment Form, SHXK Events, Documents */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* 1. Primary Stepper: order.status Progress Bar & Real-time Poll Button */}
          <UpsOrderStatusStepper
            orderId={orderId}
            currentStatus={order.status || ''}
            trackingNumber={upsLabelStatus.trackingNumber}
            canManuallySetDelivered={isAdmin || isAgency}
            statusHistory={statusHistory || []}
          />

          {/* 2. UPS Breakdown & Cargo Details (with Items Modal trigger) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                운임 및 화물 구성 (Breakdown & Packages)
              </span>
              <UpsPackageItemsModal packages={order.packages || []} />
            </div>
            <UpsOrderBreakdownCard
              orderNo={order.order_no}
              destCountryCode={resolveDestCountryCode(order)}
              transportMode={order.transport_mode}
              snapshotMeta={(snapshot as any)?.metadata}
              cargoDetails={order.cargo_details as any}
              packages={order.packages || []}
            />
          </div>

          {/* 3. 배송 기본 정보 (Shipper / Consignee) — TASK-B-308: 운임 하단으로 이동 */}
          <ZenCard className="p-6 flex flex-col gap-4">
            <h3 className="font-bold text-slate-900 dark:text-gray-100 text-base flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
              <User className="w-4 h-4 text-primary" />
              배송 기본 정보 (Shipper / Consignee)
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">화주 (Shipper)</span>
                <span className="font-bold text-slate-800 dark:text-gray-200">{order.shipper_name || order.shipper?.name || 'Standard Shipper'}</span>
                {order.shipper_contact_phone && (
                  <span className="text-slate-500 block">연락처: {order.shipper_contact_phone}</span>
                )}
                {order.shipper_contact_email && (
                  <span className="text-slate-500 block">이메일: {order.shipper_contact_email}</span>
                )}
                {(order.shipper_address || (order.shipper as any)?.address) && (
                  <span className="text-slate-500 block">
                    주소: {resolveShipperStreet(order, (order as any).shipper)}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">수령인 (Consignee)</span>
                <span className="font-bold text-slate-800 dark:text-gray-200">{order.recipient_name}</span>
                {(order.recipient_contact || order.recipient_phone) && (
                  <span className="text-slate-500 block">연락처: {order.recipient_contact || order.recipient_phone}</span>
                )}
                {order.recipient_email && (
                  <span className="text-slate-500 block">이메일: {order.recipient_email}</span>
                )}
                {order.recipient_address && <span className="text-slate-500 block">주소: {resolveConsigneeStreet(order)}</span>}
                {(order.recipient_city || order.recipient_state_province || order.recipient_zipcode || order.recipient_country_code) && (
                  <span className="text-slate-500 block">
                    {[order.recipient_city, resolveRegionName(order.recipient_state_province as string, order.recipient_country_code as string), order.recipient_zipcode].filter(Boolean).join(', ')}
                    {order.recipient_country_code ? ` ${resolveCountryName(order.recipient_country_code as string)}` : ''}
                  </span>
                )}
              </div>
            </div>
          </ZenCard>

          {/* 4. UPS SHXK Tracking Events — TASK-B-308: IN_TRANSIT일 때만 표출 */}
          {order.status === 'IN_TRANSIT' && (
            <section className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-500" />
                UPS 트래킹 이벤트 상세 (SHXK API)
              </h3>
              <UpsTrackingEventsList events={upsTrackingEvents} />
            </section>
          )}

          {/* 5. Order Edit History Panel (TASK-B-303 / Issue #1125) */}
          <UpsOrderEditHistoryPanel history={editHistory} />

          {/* 5. Trade Documents Section — TASK-B-308: CI/PL/UPS Invoice PDF 버튼 삭제, UpsTradeDocumentActions만 유지 */}
          <ZenCard className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                UPS 무역 및 발송 서류 (Documents)
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              <UpsTradeDocumentActions orderId={orderId} hasActiveLabel={upsLabelStatus.hasActiveLabel} />
            </div>
          </ZenCard>
        </div>
      </div>
    </div>
  );
}
