import React from 'react';
import { getOrderDetails } from '@/app/actions/orders';
import { getTrackingEvents, getTrackingRawLogs } from '@/app/actions/tracking';
import { requireAuth, checkPermission } from '@/lib/auth/guards';
import { OrderTisaDashboard } from '@/components/orders/OrderTisaDashboard';
import TrackingTimeline from '@/components/tracking/TrackingTimeline';
import AdminTrackingControl from '@/components/tracking/AdminTrackingControl';
import RawLogViewer from '@/components/tracking/RawLogViewer';
import OrderFinanceSummary from '@/components/finance/OrderFinanceSummary';

import { Package, MapPin, Truck, ShieldCheck } from 'lucide-react';

export default async function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const { orderId } = params;
  
  // 1. 서버 사이드 데이터 페칭
  const { profile, supabase } = await requireAuth();
  const order = await getOrderDetails(orderId);
  const events = await getTrackingEvents(orderId);

  // 2. 권한 확인 (Admin 여부)
  // note: requireAuth에서 가져온 profile.role을 기반으로 rbac 체크
  const { data: config } = await supabase
    .from("zen_tracking_configs")
    .select("*")
    .eq("order_id", orderId)
    .single();

  // 3. 재무 데이터 가져오기
  const { data: costs } = await supabase
    .from('zen_order_costs')
    .select('*')
    .eq('order_id', orderId);

  const { data: invoice } = await supabase
    .from('zen_invoices')
    .select('*')
    .eq('shipper_id', order.shipper_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const isAdmin = await checkPermission(profile?.role, "/admin");
  const rawLogs = isAdmin ? await getTrackingRawLogs(orderId) : [];

  // Mock initial TISA state (액션 통합 전 브릿지용)
  const snapshot = {
    id: `snap_${order.order_no}`,
    orderId: orderId,
    rateCardId: 'RC-STD-01',
    versionNo: 1,
    status: 'AUTO',
    priority: 10,
    baseAmount: 1250.00,
    currency: 'USD',
    validFrom: order.created_at,
    validTo: '9999-12-31T23:59:59Z'
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

          {/* 2. Order Information Details */}
          <section className="bg-white dark:bg-neutral-900/50 rounded-[2.5rem] border border-slate-100 dark:border-neutral-800 p-8">
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
          </section>
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
            onOverrideSubmit={async () => {}} // Integration in next phase
          />

          {/* 3. Finance Summary */}
          <OrderFinanceSummary 
            orderId={orderId}
            initialCosts={costs || []}
            initialInvoice={invoice || null}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  );
}
