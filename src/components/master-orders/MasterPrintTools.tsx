'use client';

import React from 'react';
import Barcode from 'react-barcode';
import { MasterOrderListItem } from '@/types/orders';

interface ManifestPrintViewProps {
  master: MasterOrderListItem;
  houses: any[];
}

/**
 * 📄 [WBS 2.2] 마스터 적하목록 (Manifest) 출력용 뷰
 * 브라우저 인쇄 시 최적화된 레이아웃을 제공합니다.
 */
export const ManifestPrintView = ({ master, houses }: ManifestPrintViewProps) => {
  return (
    <div className="p-10 bg-white text-slate-900 print:p-0 print:text-black font-sans">
      {/* Header */}
      <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8 mt-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter">CARGO MANIFEST</h1>
          <p className="text-sm font-bold text-slate-500 uppercase">ZENITH LOGISTICS INTEGRATED PLATFORM</p>
        </div>
        <div className="text-right space-y-1">
          <div className="text-xl font-black tracking-tight">{master.master_no}</div>
          <p className="text-[10px] font-medium text-slate-400">PRINT DATE: {new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-8 mb-10 border border-slate-200 p-6 rounded-2xl print:border-black print:rounded-none">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">Origin Port</label>
            <div className="text-lg font-bold">{master.origin_port?.name} ({master.origin_port?.code})</div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">Destination Port</label>
            <div className="text-lg font-bold">{master.dest_port?.name} ({master.dest_port?.code})</div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Total House</label>
              <div className="text-lg font-bold">{master.total_house_count} PKGS</div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Total Weight</label>
              <div className="text-lg font-bold">{(master.total_gross_weight || 0).toLocaleString()} KG</div>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">Total Volume</label>
            <div className="text-lg font-bold">{(master.total_volume || 0).toLocaleString()} CBM</div>
          </div>
        </div>
      </div>

      {/* House List Table */}
      <table className="w-full border-collapse border border-slate-200 mb-10 text-[12px] print:border-black">
        <thead>
          <tr className="bg-slate-50 print:bg-gray-100">
            <th className="border border-slate-200 p-2 text-left print:border-black font-black uppercase">House No</th>
            <th className="border border-slate-200 p-2 text-left print:border-black font-black uppercase">Shipper</th>
            <th className="border border-slate-200 p-2 text-center print:border-black font-black uppercase">Type</th>
            <th className="border border-slate-200 p-2 text-right print:border-black font-black uppercase">Qty</th>
            <th className="border border-slate-200 p-2 text-right print:border-black font-black uppercase">Weight</th>
          </tr>
        </thead>
        <tbody>
          {houses.map(h => (
            <tr key={h.id}>
              <td className="border border-slate-200 p-2 print:border-black font-bold">{h.order_no}</td>
              <td className="border border-slate-200 p-2 print:border-black uppercase">{h.shipper?.name}</td>
              <td className="border border-slate-200 p-2 text-center print:border-black">{h.order_type}</td>
              <td className="border border-slate-200 p-2 text-right print:border-black font-medium">{h.total_packages || 1} PKGS</td>
              <td className="border border-slate-200 p-2 text-right print:border-black font-black">{h.total_weight || 0} KG</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Verification Column */}
      <div className="mt-20 flex justify-end gap-20">
        <div className="text-center w-32 pb-2 border-b border-slate-900">
          <p className="text-[10px] font-bold text-slate-400">WAREHOUSE PIC</p>
          <div className="h-10"></div>
          <p className="text-xs font-bold">(SIGNATURE)</p>
        </div>
        <div className="text-center w-32 pb-2 border-b border-slate-900">
          <p className="text-[10px] font-bold text-slate-400">CUSTOMS CLEARANCE</p>
          <div className="h-10"></div>
          <p className="text-xs font-bold">(STAMP)</p>
        </div>
      </div>
    </div>
  );
};

/**
 * 🏷️ [WBS 2.2] 마스터 바코드 라벨 출력용 뷰
 * GS1-128 국제 표준 규격을 준수하는 레이아웃입니다.
 */
export const BarcodeLabelView = ({ master }: { master: MasterOrderListItem }) => {
  // 국제 표준 GS1-128 스타일의 데이터 포맷팅
  // AI (400): 마스터 위탁 번호 (Master Consignment Number)
  const gs1Data = `(400)${master.master_no}`;
  const barcodeValue = `400${master.master_no}`; // 바코드 인코딩 시에는 괄호 제외

  return (
    <div className="w-[100mm] h-[100mm] p-4 bg-white flex flex-col items-stretch border border-slate-100 print:border-0 font-sans mx-auto overflow-hidden">
      {/* Header Container */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2 mb-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase">GS1 Logistics Label</span>
          <span className="text-xl font-black text-slate-950 tracking-tighter">ZENITH MASTER ID</span>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-bold text-slate-400">LABEL v2.0</div>
          <div className="text-[8px] font-bold text-slate-400 uppercase">{new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {/* Barcode Section (Primary Identification) */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl py-4 border border-slate-100 mb-4">
        <div className="bg-white p-2 rounded-sm shadow-sm border border-slate-100">
          <Barcode 
            value={barcodeValue} 
            displayValue={false} // 하단에 직접 커스텀 텍스트 표기
            width={2} 
            height={100} 
            margin={0}
            background="transparent"
          />
        </div>
        <div className="mt-2 text-xl font-black tracking-[0.2em] font-mono text-slate-900">
          {gs1Data}
        </div>
        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
          Global Transport Identifier (AI: 400)
        </div>
      </div>

      {/* Information Grid */}
      <div className="grid grid-cols-2 gap-2">
         {/* Route Info */}
         <div className="bg-slate-950 p-3 rounded-xl flex flex-col justify-center">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Route & HUB</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-white">{master.origin_port?.code}</span>
              <span className="text-slate-500 font-bold">➔</span>
              <span className="text-lg font-black text-white">{master.dest_port?.code}</span>
            </div>
         </div>

         {/* Load Info */}
         <div className="border-2 border-slate-950 p-3 rounded-xl flex flex-col justify-center">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payload</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-950">{master.total_house_count}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter underline decoration-blue-500 decoration-2">Orders Attached</span>
            </div>
         </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-4 flex justify-between items-center text-[8px] font-bold text-slate-300 tracking-tighter border-t border-slate-100 pt-2 uppercase">
        <span>ZENITH LOGISTICS INTEGRATED SYSTEM</span>
        <span>Standard ISO-GS1 Compliant</span>
      </div>
    </div>
  );
};
