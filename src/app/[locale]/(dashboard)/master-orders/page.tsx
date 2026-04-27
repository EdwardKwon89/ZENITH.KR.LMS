import { getPorts } from '@/app/actions/master';
import { getMasterOrders, getPendingHouseOrders } from '@/app/actions/orders';
import { requireAuth } from '@/lib/auth/guards';
import MasterOrderTable from '@/components/master-orders/MasterOrderTable';
import HouseOrderSelectionTable from '@/components/master-orders/HouseOrderSelectionTable';
import { Layers, PlusSquare, Info } from 'lucide-react';

export default async function MasterOrdersPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // 1. 보안 가드 및 권한 시스템 확인
  await requireAuth();

  // 2. 동시 데이터 로드 (Latency 최적화)
  const [masters, pendingOrders, ports] = await Promise.all([
    getMasterOrders(),
    getPendingHouseOrders(),
    getPorts()
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 pb-20">
      {/* Dynamic Header with Intelligent Context */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-2">
           <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md tracking-wider uppercase">Logistics Core</span>
              <span className="text-[10px] text-slate-400 font-bold tracking-tighter">ZENITH LMS v2.1</span>
           </div>
           <h1 className="text-3xl font-black text-slate-950 tracking-tight flex items-center gap-4">
            <Layers className="text-blue-600" size={32} />
            MASTER OPERATIONS
          </h1>
          <p className="text-slate-500 font-medium text-xs max-w-md leading-relaxed">
            바인딩 대기 중인 하우스 오더를 선택하여 마스터 오더를 생성하거나,<br/> 
            이미 생성된 마스터의 적하목록과 바코드를 관리하십시오.
          </p>
        </div>
        
        <div className="flex gap-3">
           <div className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Master</span>
              <span className="text-xl font-black text-slate-900">{masters.length}</span>
           </div>
           <div className="bg-blue-50 border border-blue-100 px-6 py-3 rounded-2xl flex flex-col items-center">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Pending House</span>
              <span className="text-xl font-black text-blue-600">{pendingOrders.length}</span>
           </div>
        </div>
      </div>

      {/* Main Intelligent Dashboard Tabs */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Section: Master List (65%) */}
        <div className="xl:col-span-12 space-y-4">
           <div className="flex items-center gap-2 px-2">
             <Layers size={16} className="text-slate-400" />
             <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Active Master Registry</span>
           </div>
           <MasterOrderTable masters={masters} locale={locale} />
        </div>

        {/* Full Width Section: Create Master Tool (100%) */}
        <div className="xl:col-span-12 space-y-4 pt-10">
           <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-2">
                <PlusSquare size={16} className="text-blue-600" />
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Batch Master Generation Tool</span>
             </div>
             <div className="flex items-center gap-2 text-slate-400">
               <Info size={14} />
               <span className="text-[10px] font-bold italic">동일한 출발지/도착지 Port를 가진 오더만 묶을 수 있습니다.</span>
             </div>
           </div>
           <HouseOrderSelectionTable orders={pendingOrders} ports={ports} />
        </div>
      </div>
    </div>
  );
}
