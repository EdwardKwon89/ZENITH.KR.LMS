import React from 'react';
import { getOrderDetails } from '@/app/actions/orders';
import { getTrackingEvents, getTrackingRawLogs } from '@/app/actions/tracking';
import { requireAuth, checkPermission } from '@/lib/auth/guards';
import { OrderTisaDashboard } from '@/components/orders/OrderTisaDashboard';
import { OrderQnaSection } from '@/components/orders/OrderQnaSection';
import { OrderMainTabs } from '@/components/orders/OrderMainTabs';
import TrackingTimeline from '@/components/tracking/TrackingTimeline';
import AdminTrackingControl from '@/components/tracking/AdminTrackingControl';
import RawLogViewer from '@/components/tracking/RawLogViewer';
import OrderFinanceSummary from '@/components/finance/OrderFinanceSummary';
import RouteOptimizationSection from '@/components/routing/RouteOptimizationSection';
import RouteConsistencyBadge from '@/components/routing/RouteConsistencyBadge';
import { OrderVocTrigger } from '@/components/voc/OrderVocTrigger';
import DocumentDownloadButton from '@/components/documents/DocumentDownloadButton';
import CommercialInvoicePDF from '@/components/documents/CommercialInvoicePDF';
import PackingListPDF from '@/components/documents/PackingListPDF';
import { getDeclarations } from '@/app/actions/customs';
import OrderCustomsSection from '@/components/customs/OrderCustomsSection';
import OrderCustomsAdminControl from '@/components/customs/OrderCustomsAdminControl';
import { getTranslations } from 'next-intl/server';
import { OrderClaimTrigger } from '@/components/claims/OrderClaimTrigger';

import { Package, MapPin, Truck, ShieldCheck, FileText } from 'lucide-react';

export default async function OrderDetailPage({ 
  params 
}: { 
  params: Promise<{ orderId: string; locale: string }> 
}) {
  const { orderId, locale } = await params;
  
  // 1. 서버 사이드 데이터 페칭
  const { profile, supabase } = await requireAuth();
  const order = await getOrderDetails(orderId);
  const { events } = await getTrackingEvents(orderId);
  const { declarations } = await getDeclarations({ orderId });
  const declaration = declarations[0] || null;

  // 2. 권한 확인 (Admin 여부)
  // note: requireAuth에서 가져온 profile.role을 기반으로 rbac 체크
  const { data: config } = await supabase
    .from("zen_tracking_configs")
    .select("tracking_no, provider_type")
    .eq("order_id", orderId)
    .single();

  // 3. 재무 데이터 가져오기
  const { data: costs } = await supabase
    .from('zen_order_costs')
    .select('id, cost_type, total_amount, currency, invoice_id')
    .eq('order_id', orderId);

  // Look up invoice via cost's invoice_id (ground truth) to avoid RLS/shipper-id mismatch
  const linkedInvoiceId = costs?.find((c: any) => c.invoice_id)?.invoice_id ?? null;
  const { data: invoice } = linkedInvoiceId
    ? await supabase.from('zen_invoices').select('id, invoice_no, total_amount, status').eq('id', linkedInvoiceId).single()
    : { data: null };

  // Fetch incident fees associated with the invoice (if any)
  const { data: incidentFees } = linkedInvoiceId
    ? await supabase.from('zen_incident_fees').select('id, description, currency, fee_amount').eq('invoice_id', linkedInvoiceId)
    : { data: [] };

  let orgType = 'GUEST';
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from("zen_organizations")
      .select('type')
      .eq('id', profile.org_id)
      .single();
    if (org) orgType = org.type;
  }
  const isAdmin = 
    profile?.role === 'ZENITH_SUPER_ADMIN' || 
    (profile?.role === 'ADMIN' && orgType === 'PLATFORM') || 
    checkPermission(profile?.role, "/admin");

  const rawLogsData = isAdmin ? await getTrackingRawLogs(orderId) : { logs: [] };
  const rawLogs = rawLogsData?.logs || [];

  // 4. 적용된 경로 정보 가져오기 (Sprint B)
  const { data: routeData } = await supabase
    .from("zen_order_routes")
    .select("selected_option_id")
    .eq("order_id", orderId)
    .maybeSingle();
  
  const appliedRouteId = routeData?.selected_option_id || null;

  // Mock initial TISA state (액션 통합 전 브릿지용)
  const snapshot = {
    id: `snap_${order.order_no}`,
    orderId: orderId,
    rateCardId: 'RC-STD-01',
    versionNo: 1,
    status: 'AUTO' as const,
    priority: 10,
    baseAmount: 1250.00,
    currency: 'USD',
    validFrom: order.created_at,
    validTo: '9999-12-31T23:59:59Z'
  };

  // 5. 무역 서류 데이터 준비 (Sprint 8)
  const ciData = {
    invoice_no: invoice?.invoice_no || `CI-${order.order_no}`,
    date: new Date().toISOString().split('T')[0],
    shipper: {
      name: order.shipper?.name || 'ZENITH LOGISTICS',
      address: (order.shipper as any)?.address || 'Seoul, South Korea'
    },
    consignee: {
      name: order.recipient_name,
      address: order.recipient_address
    },
    order_no: order.order_no,
    items: order.packages.flatMap((pkg: any) => 
      pkg.items.map((item: any) => ({
        description: item.item_name,
        hs_code: item.hs_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price
      }))
    ),
    total_amount: invoice?.total_amount || order.packages.reduce((sum: number, pkg: any) => 
      sum + pkg.items.reduce((pSum: number, item: any) => pSum + (item.quantity * item.unit_price), 0), 0
    ),
    currency: order.packages[0]?.items[0]?.currency || 'USD'
  };

  const plData = {
    pl_no: `PL-${order.order_no}`,
    date: new Date().toISOString().split('T')[0],
    shipper: {
      name: order.shipper?.name || 'ZENITH LOGISTICS',
      address: (order.shipper as any)?.address || 'Seoul, South Korea'
    },
    consignee: {
      name: order.recipient_name,
      address: order.recipient_address
    },
    order_no: order.order_no,
    items: order.packages.map((pkg: any) => ({
      description: pkg.items.map((i: any) => i.item_name).join(', ') || 'General Cargo',
      quantity: pkg.items.reduce((sum: number, i: any) => sum + i.quantity, 0),
      pkgs: pkg.packing_count,
      net_weight: pkg.gross_weight * 0.9, // Estimated net weight
      gross_weight: pkg.gross_weight
    })),
    total_pkgs: order.packages.reduce((sum: number, pkg: any) => sum + pkg.packing_count, 0),
    total_net_weight: order.packages.reduce((sum: number, pkg: any) => sum + (pkg.gross_weight * 0.9), 0),
    total_gross_weight: order.packages.reduce((sum: number, pkg: any) => sum + pkg.gross_weight, 0)
  };

  // 6. 다국어 라벨 준비 (E2E-10)
  const tDoc = await getTranslations('DocumentLabels');
  const tDocs = await getTranslations('Documents');
  
  const docLabels = {
    issue_date: tDoc('issue_date'),
    shipper: tDoc('shipper'),
    consignee: tDoc('consignee'),
    order_ref: tDoc('order_ref'),
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

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Page Header: Premium Glassmorphism */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider">
              {order.order_type}
            </span>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-slate-400 text-xs">{order.transport_mode}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Order <span className="text-blue-600">#{order.order_no}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            System Verified & Authenticated Detail
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-neutral-900 p-2 rounded-2xl border border-slate-100 dark:border-neutral-800">
            <div className="px-4 py-2 border-r border-slate-200 dark:border-neutral-800">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Origin</p>
                <p className="text-sm font-bold">{order.origin_port?.code}</p>
            </div>
            <div className="px-4 py-2">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Destination</p>
                <p className="text-sm font-bold">{order.dest_port?.code}</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content: 8 Columns */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 1. Tracking Timeline Section (Phase 3.3 핵심) */}
          <section className="bg-white dark:bg-neutral-900/50 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-neutral-800 p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Truck className="w-32 h-32" />
            </div>
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  Live Logistics Journey
                </h2>
                <p className="text-sm text-slate-500">지능형 시뮬레이션 및 실제 트래킹 통합 타임라인</p>
              </div>
              {config?.tracking_no && (
                <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-mono">
                   REF: {config.tracking_no}
                </div>
              )}
            </div>

          <TrackingTimeline events={events} />
          </section>

          {/* 1.1 Route Optimization Section (Phase 3.3 Sprint B 신규) */}
          <section className="bg-white dark:bg-neutral-900/50 rounded-[2.5rem] border border-slate-100 dark:border-neutral-800 p-8 shadow-sm">
            <RouteOptimizationSection 
              orderId={orderId} 
              initialAppliedRouteId={appliedRouteId}
              isAdmin={isAdmin}
              headerBadge={
                <RouteConsistencyBadge orderId={orderId} isAdmin={isAdmin} />
              }
            />
          </section>

          {/* 2. Order Tabs Section (Sprint 9) */}
          <OrderMainTabs 
            cargoDetails={
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-500" />
                    Cargo & Handover Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl">
                            <p className="text-[11px] text-slate-400 uppercase font-bold mb-1">Shipper</p>
                            <p className="font-semibold">{order.shipper?.name}</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl">
                            <p className="text-[11px] text-slate-400 uppercase font-bold mb-1">Recipient</p>
                            <p className="font-semibold">{order.recipient_name}</p>
                            <p className="text-xs text-slate-500 mt-1">{order.recipient_address}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl">
                            <p className="text-[11px] text-slate-400 uppercase font-bold mb-1">Transport</p>
                            <div className="flex items-center gap-2 font-semibold">
                                <MapPin className="w-4 h-4 text-red-500" />
                                {order.origin_port?.name} → {order.dest_port?.name}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl">
                                <p className="text-[11px] text-blue-400 uppercase font-bold mb-1">Total Weight</p>
                                <p className="text-lg font-black text-blue-700 dark:text-blue-400">
                                    {order.total_gross_weight} <span className="text-xs font-normal">kg</span>
                                </p>
                            </div>
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl">
                                <p className="text-[11px] text-purple-400 uppercase font-bold mb-1">Total Volume</p>
                                <p className="text-lg font-black text-purple-700 dark:text-purple-400">
                                    {order.total_volume} <span className="text-xs font-normal">cbm</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                  {/* Package Details Table */}
                {order.packages && order.packages.length > 0 && (
                  <div className="mt-8 space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-500" />
                      Package Details
                    </h3>
                    {order.packages.map((pkg: any, idx: number) => {
                      const cnt = pkg.packing_count || 1;
                      const unitWt = pkg.gross_weight || 0;
                      const totalWt = unitWt * cnt;
                      const vol = pkg.volume ?? (pkg.length && pkg.width && pkg.height
                        ? (pkg.length * pkg.width * pkg.height) / 1000000
                        : 0);
                      const totalVol = vol * cnt;
                      return (
                        <div key={pkg.id || idx} className="rounded-xl border border-slate-200 dark:border-neutral-700 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold">Unit</th>
                                <th className="px-4 py-3 text-right font-semibold">Count</th>
                                <th className="px-4 py-3 text-right font-semibold">L × W × H (cm)</th>
                                <th className="px-4 py-3 text-right font-semibold">Unit Weight (kg)</th>
                                <th className="px-4 py-3 text-right font-semibold">Total Weight (kg)</th>
                                <th className="px-4 py-3 text-right font-semibold">Volume (cbm)</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-slate-50 dark:hover:bg-neutral-800/50">
                                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{pkg.packing_unit}</td>
                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{pkg.packing_count}</td>
                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                  {pkg.length} × {pkg.width} × {pkg.height}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{unitWt}</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100">{totalWt}</td>
                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                  {totalVol ? totalVol.toFixed(3) : '-'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          {pkg.items && pkg.items.length > 0 && (
                            <div className="border-t border-slate-100 dark:border-neutral-700">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-neutral-800/50 text-slate-500 dark:text-slate-400">
                                  <tr>
                                    <th className="px-4 py-2 text-left font-medium text-[11px] uppercase tracking-wider pl-8">Item</th>
                                    <th className="px-4 py-2 text-right font-medium text-[11px] uppercase tracking-wider">Qty</th>
                                    <th className="px-4 py-2 text-right font-medium text-[11px] uppercase tracking-wider">HS Code</th>
                                    <th className="px-4 py-2 text-right font-medium text-[11px] uppercase tracking-wider">Unit Price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pkg.items.map((item: any, iidx: number) => (
                                    <tr key={item.id || iidx} className="bg-slate-50/50 dark:bg-neutral-800/30">
                                      <td className="px-4 py-2 text-slate-600 dark:text-slate-300 pl-8">{item.item_name}</td>
                                      <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">{item.quantity}</td>
                                      <td className="px-4 py-2 text-right font-mono text-xs text-slate-500">{item.hs_code || '-'}</td>
                                      <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">
                                        {item.unit_price ? `${item.currency || 'USD'} ${item.unit_price}` : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            }
            supportSection={
              <OrderQnaSection 
                orderId={orderId} 
                orderNo={order.order_no} 
                isAdmin={isAdmin} 
                locale={locale} 
              />
            }
          />
        </div>

        {/* Sidebar: 4 Columns */}
        <div className="lg:col-span-4 space-y-8">
          {/* 1. Admin Logic (Phase 3.3 핵심) */}
          {isAdmin && (
            <div className="space-y-8">
              <AdminTrackingControl 
                orderId={orderId} 
                currentProvider={config?.provider_type || 'VIRTUAL'} 
              />
              <RawLogViewer logs={rawLogs as any} />
            </div>
          )}

          {/* 2. TISA Governance Dashboard */}
          <OrderTisaDashboard
            orderId={orderId}
            snapshot={snapshot}
          />

          {/* 3. Customs Section (Sprint 12) */}
          <OrderCustomsSection declaration={declaration} />

          {/* 3.1 Admin Customs Control */}
          {isAdmin && (
            <OrderCustomsAdminControl 
              orderId={orderId} 
              declaration={declaration} 
            />
          )}

          {/* 4. VOC & Claim Trigger */}
          <div className="grid grid-cols-2 gap-3">
            <OrderVocTrigger orderId={orderId} orderNo={order.order_no} />
            <OrderClaimTrigger orderId={orderId} orderNo={order.order_no} />
          </div>

          {/* 4. Finance Summary */}
          <OrderFinanceSummary 
            orderId={orderId}
            initialCosts={costs || []}
            initialInvoice={invoice || null}
            incidentFees={incidentFees || []}
            isAdmin={isAdmin}
          />

          {/* 5. Trade Documents Section (Sprint 8) */}
          <section className="bg-white dark:bg-neutral-900/50 rounded-[2.5rem] border border-slate-100 dark:border-neutral-800 p-8 shadow-sm">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                   <FileText className="w-5 h-5 text-blue-500" />
                   {tDocs('title')}
                </h2>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 dark:bg-neutral-800 px-3 py-1 rounded-full">
                   Auto-Generated
                </span>
             </div>
             
             <div className="grid grid-cols-1 gap-3">
                <p className="text-xs text-slate-500 italic mb-4">
                  {tDocs('description')}
                </p>
                <div className="flex flex-col gap-3">
                   <DocumentDownloadButton 
                     document={<CommercialInvoicePDF data={ciData} labels={docLabels} />}
                     fileName={`CI_${order.order_no}.pdf`}
                     label={`${tDocs('ci')} (CI)`}
                   />
                   <DocumentDownloadButton 
                     document={<PackingListPDF data={plData} labels={docLabels} />}
                     fileName={`PL_${order.order_no}.pdf`}
                     label={`${tDocs('pl')} (PL)`}
                   />
                </div>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}

