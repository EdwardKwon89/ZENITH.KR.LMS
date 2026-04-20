import React from 'react';
import { useTranslations } from 'next-intl';
import { OrderTisaDashboard } from '@/components/orders/OrderTisaDashboard';

export default function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const t = useTranslations();

  // Mock initial TISA state for UI demonstration
  const [snapshot, setSnapshot] = React.useState<any>({
    id: 'snap_5541fa90',
    orderId: params.orderId,
    rateCardId: 'RC-001',
    versionNo: 2,
    status: 'AUTO',
    priority: 10,
    baseAmount: 1540.00,
    currency: 'USD',
    validFrom: '2026-04-01T00:00:00Z',
    validTo: '9999-12-31T23:59:59Z'
  });

  const handleOverrideSubmit = async (data: any) => {
    // In production, this would invoke a Supabase RPC to override the rate securely
    console.log('Applying Override:', data);
    setSnapshot({
      ...snapshot,
      status: 'MANUAL',
      baseAmount: data.baseAmount,
      currency: data.currency,
      appliedReason: data.reason
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Order Details
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Tracking ID: <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{params.orderId}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 min-h-[300px] flex items-center justify-center">
            <p className="text-slate-400">Order Information UI placeholder</p>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 min-h-[200px] flex items-center justify-center">
            <p className="text-slate-400">Logistics Timeline (Phase 3) placeholder</p>
          </div>
        </div>

        {/* Sidebar Space */}
        <div className="space-y-6">
          {/* TISA Governance Snapshot Dashboard */}
          <OrderTisaDashboard 
            orderId={params.orderId} 
            snapshot={snapshot} 
            onOverrideSubmit={handleOverrideSubmit}
          />

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-3">Finance Summary</h3>
            <p className="text-sm text-slate-500">Summary features will be implemented in Phase 3.2</p>
          </div>
        </div>
      </div>
    </div>
  );
}
