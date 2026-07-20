import React from 'react';
import { requireAuth } from '@/lib/auth/guards';
import { getOrderDetails, getOrderRateSnapshot } from '@/app/actions/operations/orders';
import { getUpsLabelStatus } from '@/app/actions/ups/label';
import { getTrackingEvents } from '@/app/actions/operations/tracking';
import { checkPermission } from '@/lib/auth/rbac';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Truck, ShieldCheck, FileText, Globe, Calendar, User, MapPin } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import UpsOrderBreakdownCard from '@/components/ups/UpsOrderBreakdownCard';
import UpsActualAdjustmentForm from '@/components/ups/UpsActualAdjustmentForm';
import OrderFinanceSummary from '@/components/finance/OrderFinanceSummary';
import TrackingTimeline from '@/components/tracking/TrackingTimeline';
import DocumentDownloadButton from '@/components/documents/DocumentDownloadButton';
import CommercialInvoicePDF from '@/components/documents/CommercialInvoicePDF';
import PackingListPDF from '@/components/documents/PackingListPDF';
import UpsInvoicePDF from '@/components/documents/UpsInvoicePDF';
import UpsTradeDocumentActions from '@/components/ups/UpsTradeDocumentActions';

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

  let canManageFinance = isAdmin || profile?.role === 'MANAGER';
  if (!canManageFinance && isAgency && profile?.org_id) {
    const { data: agencyLink } = await supabase
      .from('zen_agency_shippers')
      .select('shipper_org_id')
      .eq('agency_org_id', profile.org_id)
      .eq('shipper_org_id', order.shipper_id)
      .eq('is_active', true)
      .maybeSingle();
    canManageFinance = !!agencyLink;
  }

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

  const { data: incidentFees } = linkedInvoiceId
    ? await supabase.from('zen_incident_fees').select('id, description, currency, fee_amount').eq('invoice_id', linkedInvoiceId)
    : { data: [] };

  // Fetch Tracking Events
  const trackingData = await getTrackingEvents(orderId);
  const trackingEvents = trackingData?.events || [];

  // Label & Trade Doc Status
  const upsLabelStatus = await getUpsLabelStatus(orderId);

  // Document labels
  const tDoc = await getTranslations('Documents');
  const tOrders = await getTranslations('Orders');

  const docLabels = {
    commercial_invoice: tDoc('commercial_invoice'),
    packing_list: tDoc('packing_list'),
    exporter: tDoc('exporter'),
    consignee: tDoc('consignee'),
    date: tDoc('date'),
    order_no: tDoc('order_no'),
    hs_code: tDoc('hs_code'),
    item_desc: tDoc('item_desc'),
    quantity: tDoc('quantity'),
    unit_price: tDoc('unit_price'),
    sub_total: tDoc('sub_total'),
    total: tDoc('total'),
    currency: tDoc('currency'),
    declaration: tDoc('declaration'),
    declaration_text: tDoc('declaration_text'),
    generated_on: tDoc('generated_on'),
    transport_mode: tDoc('transport_mode'),
    express_air: tDoc('express_air'),
    qty: tDoc('qty'),
    pkgs: tDoc('pkgs'),
    net_weight: tDoc('net_weight'),
    gross_weight: tDoc('gross_weight'),
    total_pkgs: tDoc('total_pkgs'),
    trade_terms: tDoc('trade_terms'),
    invoice_no: tDoc('invoice_no'),
    pl_no: tDoc('pl_no'),
    remarks: tDoc('remarks'),
    remarks_text: tDoc('remarks_text'),
  };

  const ciData = {
    invoice_no: invoice?.invoice_no || `CI-${order.order_no}`,
    date: new Date().toISOString().split('T')[0],
    shipper: {
      name: order.shipper?.name || 'ZENITH LOGISTICS',
      address: (order.shipper as any)?.address || 'Seoul, South Korea',
    },
    consignee: {
      name: order.recipient_name || '',
      address: order.recipient_address || '',
    },
    order_no: order.order_no,
    items: order.packages.flatMap((pkg: any) =>
      pkg.items.map((item: any) => ({
        description: item.item_name,
        hs_code: item.hs_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
      }))
    ),
  };

  const plData = {
    pl_no: `PL-${order.order_no}`,
    date: new Date().toISOString().split('T')[0],
    shipper: ciData.shipper,
    consignee: ciData.consignee,
    order_no: order.order_no,
    packages: order.packages.map((pkg: any, idx: number) => ({
      package_no: idx + 1,
      net_weight: pkg.net_weight || pkg.gross_weight,
      gross_weight: pkg.gross_weight,
      dimensions: pkg.length && pkg.width && pkg.height ? `${pkg.length}x${pkg.width}x${pkg.height} cm` : 'N/A',
      items: pkg.items.map((item: any) => ({
        description: item.item_name,
        quantity: item.quantity,
      })),
    })),
  };

  const upsInvoiceData = {
    invoice_no: `UPS-${order.order_no}`,
    date: new Date().toISOString().split('T')[0],
    shipper: {
      name: order.shipper?.name || 'ZENITH LOGISTICS',
      address: (order.shipper as any)?.address || 'Seoul, South Korea',
      contact: order.shipper_contact_phone || order.shipper_contact_email || '',
    },
    consignee: {
      name: order.recipient_name || '',
      address: order.recipient_address || '',
      country: (order.dest_port as any)?.country_code || (order.dest_port as any)?.name || '',
      contact: order.recipient_contact || order.recipient_phone || '',
    },
    packages: order.packages.map((pkg: any, idx: number) => {
      const actualWeight = pkg.gross_weight || 0;
      const vol = pkg.volume ?? (pkg.length && pkg.width && pkg.height ? (pkg.length * pkg.width * pkg.height) / 1000000 : 0);
      const volumetricWeight = (vol * 1000000) / 5000;
      return {
        ref_seq: idx + 1,
        domestic_ref_no: pkg.domestic_ref_no,
        intl_ref_no: pkg.intl_ref_no,
        actual_weight_kg: actualWeight,
        volumetric_weight_kg: volumetricWeight,
        items: pkg.items.map((item: any) => ({
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price || 0,
          currency: item.currency || 'USD',
        })),
      };
    }),
    ups_service: {
      product_code: (order.cargo_details as any)?.product_code || '',
    },
  };

  const upsInvoiceLabels = {
    ups_invoice_title: tOrders('ups_invoice.title'),
    account_no: tOrders('ups_invoice.account_no'),
    tracking_no: tOrders('ups_invoice.tracking_no'),
    service_type: tOrders('ups_invoice.service_type'),
    bill_to: tOrders('ups_invoice.bill_to'),
    ref_no: tOrders('ups_invoice.ref_no'),
    description: tOrders('ups_invoice.description'),
    weight: tOrders('ups_invoice.weight'),
    declared_value: tOrders('ups_invoice.declared_value'),
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          일반 오더 상세 보기로 이동
        </Link>
        <span className="text-xs font-mono font-semibold px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/20">
          UPS Special Delivery Detail
        </span>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: UPS Breakdown, Adjustment Form, Documents */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* UPS Specific Breakdown & Zone Card */}
          <UpsOrderBreakdownCard
            orderNo={order.order_no}
            destCountryCode={order.dest_country_code || 'US'}
            transportMode={order.transport_mode}
            snapshotMeta={snapshot?.metadata}
            cargoDetails={order.cargo_details as any}
            packages={order.packages || []}
          />

          {/* Actual Charges Adjustment Form (Issue #589) */}
          <UpsActualAdjustmentForm
            orderId={orderId}
            orderStatus={order.status || ''}
            isPlatformAdmin={canManageFinance}
          />

          {/* Tracking Timeline (UPS events) */}
          <section className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-500" />
              UPS 배송 실시간 트래킹 타임라인
            </h3>
            <TrackingTimeline events={trackingEvents} />
          </section>

          {/* Trade Documents Section */}
          <section className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                UPS 무역 및 발송 서류 (Documents)
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              <DocumentDownloadButton
                document={<CommercialInvoicePDF data={ciData} labels={docLabels} />}
                fileName={`CI_${order.order_no}.pdf`}
                label={`${tDoc('ci')} (CI)`}
              />
              <DocumentDownloadButton
                document={<PackingListPDF data={plData} labels={docLabels} />}
                fileName={`PL_${order.order_no}.pdf`}
                label={`${tDoc('pl')} (PL)`}
              />
              <DocumentDownloadButton
                document={<UpsInvoicePDF data={upsInvoiceData} labels={upsInvoiceLabels as any} />}
                fileName={`UPS_INVOICE_${orderId}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.pdf`}
                label={`${tOrders('ups_invoice.download_button')} (UPS)`}
                className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              />
              <UpsTradeDocumentActions orderId={orderId} hasActiveLabel={upsLabelStatus.hasActiveLabel} />
            </div>
          </section>
        </div>

        {/* Right Column: Order Summary & Finance Summary */}
        <div className="flex flex-col gap-6">
          {/* Shipper & Consignee Info Card */}
          <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-slate-900 dark:text-gray-100 text-base flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
              <User className="w-4 h-4 text-primary" />
              배송 기본 정보 (Shipper / Consignee)
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">화주 (Shipper)</span>
                <span className="font-bold text-slate-800 dark:text-gray-200">{order.shipper?.name || 'Standard Shipper'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">수령인 (Consignee)</span>
                <span className="font-bold text-slate-800 dark:text-gray-200">{order.recipient_name}</span>
                <span className="text-slate-500 block">{order.recipient_address}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
                <span className="text-slate-400">주문 상태</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          {/* Finance Summary Component */}
          <OrderFinanceSummary
            orderId={orderId}
            initialCosts={costs || []}
            initialInvoice={invoice || null}
            incidentFees={incidentFees || []}
            isAdmin={isAdmin}
            canManageFinance={canManageFinance}
          />
        </div>
      </div>
    </div>
  );
}
